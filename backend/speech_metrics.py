"""Delivery metrics derived from word-level transcription timings.

Delivery is 0.5 of the 2.0 NEC rubric but was previously graded from prose
alone: the transcription requested plain JSON and discarded timing data, so the
grader saw only total words, duration and one average words-per-minute figure.

Whisper can return per-word timestamps. These helpers turn them into concrete,
checkable evidence -- filler rate, pace over time, long pauses -- which is both
shown to the student and handed to the grader.

Everything here degrades safely: if timings are missing the functions return
empty/zero values rather than raising, because the Groq fallback path and older
stored sessions have no word data.
"""

import re

# Multi-word fillers are matched before single words so "you know" is not also
# counted as "know".
FILLER_PHRASES = (
    'you know',
    'sort of',
    'kind of',
    'i mean',
)
FILLER_WORDS = (
    'um', 'uh', 'erm', 'er', 'ah', 'eh', 'hmm', 'mmm',
    'like', 'basically', 'actually', 'literally', 'yeah',
)

# A gap this long reads as a hesitation rather than natural phrasing.
LONG_PAUSE_SECONDS = 1.5
# Window used for the pace-over-time series.
PACE_WINDOW_SECONDS = 15.0


def _normalise(word):
    return re.sub(r"[^a-z']", '', (word or '').lower())


def normalise_words(raw_words):
    """Coerce provider word entries into {word, start, end} dicts.

    Groq/Whisper returns objects or dicts with `word`, `start`, `end`. Anything
    lacking usable timings is dropped rather than poisoning the metrics.
    """
    cleaned = []
    for entry in raw_words or []:
        if isinstance(entry, dict):
            word = entry.get('word')
            start = entry.get('start')
            end = entry.get('end')
        else:
            word = getattr(entry, 'word', None)
            start = getattr(entry, 'start', None)
            end = getattr(entry, 'end', None)

        if word is None or start is None or end is None:
            continue
        try:
            start = float(start)
            end = float(end)
        except (TypeError, ValueError):
            continue
        if end < start:
            continue

        cleaned.append({'word': str(word).strip(), 'start': start, 'end': end})

    cleaned.sort(key=lambda item: item['start'])
    return cleaned


def count_fillers(words):
    """Count filler words and phrases, returning totals and a per-term tally."""
    tokens = [_normalise(item['word']) for item in words]
    counts = {}
    index = 0
    total = 0

    while index < len(tokens):
        matched_phrase = None
        for phrase in FILLER_PHRASES:
            parts = phrase.split()
            if tokens[index:index + len(parts)] == parts:
                matched_phrase = phrase
                break

        if matched_phrase:
            counts[matched_phrase] = counts.get(matched_phrase, 0) + 1
            total += 1
            index += len(matched_phrase.split())
            continue

        token = tokens[index]
        if token in FILLER_WORDS:
            counts[token] = counts.get(token, 0) + 1
            total += 1
        index += 1

    return {
        'total': total,
        'byTerm': dict(sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))),
    }


def find_long_pauses(words, threshold=LONG_PAUSE_SECONDS):
    """Gaps between consecutive words longer than `threshold` seconds."""
    pauses = []
    for previous, current in zip(words, words[1:]):
        gap = current['start'] - previous['end']
        if gap >= threshold:
            pauses.append({
                'start': round(previous['end'], 2),
                'duration': round(gap, 2),
                'afterWord': previous['word'],
                'beforeWord': current['word'],
            })
    return pauses


def build_pace_series(words, window=PACE_WINDOW_SECONDS):
    """Words-per-minute per fixed window, so rushing or stalling is visible."""
    if not words:
        return []

    end_time = max(item['end'] for item in words)
    series = []
    window_start = 0.0
    while window_start < end_time:
        window_end = window_start + window
        spoken = sum(1 for item in words if window_start <= item['start'] < window_end)
        elapsed = min(window_end, end_time) - window_start
        if elapsed > 0:
            series.append({
                'start': round(window_start, 1),
                'end': round(min(window_end, end_time), 1),
                'wpm': round(spoken / elapsed * 60),
            })
        window_start = window_end
    return series


def build_speech_metrics(words, duration):
    """Full delivery metric set. Safe to call with no word timings."""
    words = normalise_words(words)
    duration = float(duration or 0)
    spoken_count = len(words)

    if not words or duration <= 0:
        return {
            'available': False,
            'wordCount': spoken_count,
            'durationSeconds': round(duration, 2),
            'wordsPerMinute': 0,
            'articulationRate': 0,
            'fillers': {'total': 0, 'byTerm': {}, 'perMinute': 0},
            'longPauses': [],
            'longPauseCount': 0,
            'totalPauseSeconds': 0,
            'paceSeries': [],
        }

    pauses = find_long_pauses(words)
    total_pause = sum(item['duration'] for item in pauses)
    # Articulation rate excludes hesitation time, so it reflects speaking speed
    # rather than overall session length.
    speaking_time = max(duration - total_pause, 0.01)
    fillers = count_fillers(words)

    return {
        'available': True,
        'wordCount': spoken_count,
        'durationSeconds': round(duration, 2),
        'wordsPerMinute': round(spoken_count / duration * 60),
        'articulationRate': round(spoken_count / speaking_time * 60),
        'fillers': {
            **fillers,
            'perMinute': round(fillers['total'] / duration * 60, 1),
        },
        'longPauses': pauses[:20],
        'longPauseCount': len(pauses),
        'totalPauseSeconds': round(total_pause, 2),
        'paceSeries': build_pace_series(words),
    }


def describe_metrics_for_prompt(metrics):
    """Compact plain-text summary handed to the grader as Delivery evidence."""
    if not metrics or not metrics.get('available'):
        return 'No word-level timing data is available for this response.'

    lines = [
        f"- Words spoken: {metrics['wordCount']}",
        f"- Overall pace: {metrics['wordsPerMinute']} words/minute",
        f"- Articulation rate excluding long pauses: {metrics['articulationRate']} words/minute",
        f"- Filler words: {metrics['fillers']['total']} "
        f"({metrics['fillers']['perMinute']} per minute)",
    ]

    by_term = metrics['fillers'].get('byTerm') or {}
    if by_term:
        top = ', '.join(f'"{term}" x{count}' for term, count in list(by_term.items())[:5])
        lines.append(f"- Most frequent fillers: {top}")

    if metrics['longPauseCount']:
        lines.append(
            f"- Long pauses (>= {LONG_PAUSE_SECONDS}s): {metrics['longPauseCount']}, "
            f"totalling {metrics['totalPauseSeconds']}s"
        )
    else:
        lines.append('- Long pauses: none')

    series = metrics.get('paceSeries') or []
    if len(series) > 1:
        values = [str(point['wpm']) for point in series]
        lines.append(f"- Pace per 15s window (wpm): {', '.join(values)}")

    return '\n'.join(lines)
