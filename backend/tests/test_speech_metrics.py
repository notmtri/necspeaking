import sys
import unittest
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from speech_metrics import (  # noqa: E402
    build_pace_series,
    build_speech_metrics,
    count_fillers,
    describe_metrics_for_prompt,
    find_long_pauses,
    normalise_words,
)


def words_from(pairs):
    """[(word, start, end), ...] -> provider-shaped dicts."""
    return [{'word': w, 'start': s, 'end': e} for w, s, e in pairs]


class NormaliseWordsTests(unittest.TestCase):
    def test_accepts_objects_as_well_as_dicts(self):
        class Entry:
            def __init__(self, word, start, end):
                self.word = word
                self.start = start
                self.end = end

        result = normalise_words([Entry('hello', 0.0, 0.4)])
        self.assertEqual(result, [{'word': 'hello', 'start': 0.0, 'end': 0.4}])

    def test_drops_entries_without_usable_timings(self):
        raw = [
            {'word': 'ok', 'start': 0.0, 'end': 0.3},
            {'word': 'missing-end', 'start': 1.0},
            {'word': 'bad-type', 'start': 'x', 'end': 'y'},
            {'word': 'reversed', 'start': 3.0, 'end': 2.0},
        ]
        self.assertEqual([item['word'] for item in normalise_words(raw)], ['ok'])

    def test_sorts_by_start_time(self):
        raw = words_from([('second', 1.0, 1.2), ('first', 0.0, 0.2)])
        self.assertEqual([item['word'] for item in normalise_words(raw)], ['first', 'second'])

    def test_empty_input_is_safe(self):
        self.assertEqual(normalise_words(None), [])
        self.assertEqual(normalise_words([]), [])


class FillerTests(unittest.TestCase):
    def test_counts_single_word_fillers_ignoring_punctuation_and_case(self):
        words = words_from([
            ('Um,', 0.0, 0.2), ('I', 0.3, 0.4), ('uh', 0.5, 0.6), ('think', 0.7, 0.9),
        ])
        result = count_fillers(normalise_words(words))
        self.assertEqual(result['total'], 2)
        self.assertEqual(result['byTerm'], {'uh': 1, 'um': 1})

    def test_multi_word_phrase_is_counted_once_not_twice(self):
        # "you know" must not also register as a bare "know".
        words = words_from([('you', 0.0, 0.1), ('know', 0.2, 0.3), ('really', 0.4, 0.6)])
        result = count_fillers(normalise_words(words))
        self.assertEqual(result['total'], 1)
        self.assertEqual(result['byTerm'], {'you know': 1})

    def test_clean_speech_reports_zero(self):
        words = words_from([('education', 0.0, 0.5), ('matters', 0.6, 1.0)])
        self.assertEqual(count_fillers(normalise_words(words))['total'], 0)


class PauseTests(unittest.TestCase):
    def test_detects_only_gaps_at_or_over_the_threshold(self):
        words = words_from([
            ('one', 0.0, 0.5),
            ('two', 2.5, 3.0),    # 2.0s gap -> long
            ('three', 3.2, 3.6),  # 0.2s gap -> normal
        ])
        pauses = find_long_pauses(normalise_words(words))
        self.assertEqual(len(pauses), 1)
        self.assertAlmostEqual(pauses[0]['duration'], 2.0, places=2)
        self.assertEqual(pauses[0]['afterWord'], 'one')
        self.assertEqual(pauses[0]['beforeWord'], 'two')

    def test_no_pauses_in_continuous_speech(self):
        words = words_from([('a', 0.0, 0.3), ('b', 0.35, 0.6), ('c', 0.65, 0.9)])
        self.assertEqual(find_long_pauses(normalise_words(words)), [])


class PaceSeriesTests(unittest.TestCase):
    def test_windows_reveal_a_slow_down(self):
        fast = [(f'w{i}', i * 0.5, i * 0.5 + 0.2) for i in range(30)]       # 0-15s, dense
        slow = [(f's{i}', 15 + i * 3.0, 15 + i * 3.0 + 0.2) for i in range(5)]  # 15-30s, sparse
        series = build_pace_series(normalise_words(words_from(fast + slow)))
        self.assertGreaterEqual(len(series), 2)
        self.assertGreater(series[0]['wpm'], series[1]['wpm'])

    def test_empty_words_gives_empty_series(self):
        self.assertEqual(build_pace_series([]), [])


class BuildSpeechMetricsTests(unittest.TestCase):
    def test_reports_unavailable_without_word_timings(self):
        metrics = build_speech_metrics([], 30.0)
        self.assertFalse(metrics['available'])
        self.assertEqual(metrics['wordsPerMinute'], 0)
        self.assertEqual(metrics['longPauses'], [])

    def test_zero_duration_does_not_divide_by_zero(self):
        metrics = build_speech_metrics(words_from([('hi', 0.0, 0.2)]), 0)
        self.assertFalse(metrics['available'])

    def test_articulation_rate_exceeds_pace_when_there_are_long_pauses(self):
        words = words_from(
            [(f'w{i}', i * 0.3, i * 0.3 + 0.2) for i in range(20)]
            + [('after', 12.0, 12.3)]  # ~6s gap after the dense run
        )
        metrics = build_speech_metrics(words, 12.5)
        self.assertTrue(metrics['available'])
        self.assertEqual(metrics['longPauseCount'], 1)
        self.assertGreater(
            metrics['articulationRate'], metrics['wordsPerMinute'],
            'excluding pause time should raise the rate',
        )

    def test_filler_rate_is_per_minute(self):
        words = words_from([('um', 0.0, 0.2), ('um', 10.0, 10.2), ('word', 20.0, 20.3)])
        metrics = build_speech_metrics(words, 60.0)
        self.assertEqual(metrics['fillers']['total'], 2)
        self.assertAlmostEqual(metrics['fillers']['perMinute'], 2.0, places=1)


class PromptSummaryTests(unittest.TestCase):
    def test_states_plainly_when_no_timings_exist(self):
        text = describe_metrics_for_prompt(build_speech_metrics([], 0))
        self.assertIn('No word-level timing data', text)

    def test_includes_the_numbers_the_grader_should_cite(self):
        words = words_from(
            [('um', 0.0, 0.2)] + [(f'w{i}', 0.5 + i * 0.3, 0.7 + i * 0.3) for i in range(20)]
        )
        text = describe_metrics_for_prompt(build_speech_metrics(words, 12.0))
        self.assertIn('words/minute', text)
        self.assertIn('Filler words', text)
        self.assertIn('Articulation rate', text)

    def test_handles_none(self):
        self.assertIn('No word-level timing data', describe_metrics_for_prompt(None))


if __name__ == '__main__':
    unittest.main()
