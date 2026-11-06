"""The 15 profile achievement badges.

Earned tiers are worked out from a student's saved attempts and community
activity whenever a profile is viewed, rather than stored, so a badge can
never fall out of step with the data behind it. The definitions were chosen
by the site owner (Nov 2026); names and thresholds are theirs.

Each badge has Bronze, Silver and Gold thresholds over one measured value.
`compute_achievements` returns, per badge, the tier reached (0 = locked), the
current value and the next target, which the profile turns into a progress
hint such as "7 / 10 practices".
"""
from datetime import timedelta

from database import is_nec_practice

TIERS = ('bronze', 'silver', 'gold')

# Speaking time counts from the recording's start to the last word, so a
# long silent tail does not count as speaking.
FULL_ANSWER_SECONDS = 290        # 4:50
CLEAN_ANSWER_MIN_SECONDS = 180   # "What's A 'Um'?" needs an answer of 3 minutes or more
CLEAN_ANSWER_MAX_FILLERS = 2
AVERAGE_MIN_PRACTICES = 5
CRITERION_MAX = {'content': 0.9, 'accuracy': 0.6, 'delivery': 0.5}

BADGES = [
    {'key': 'practices', 'name': 'Practice Makes Perfect', 'description': 'Saved practices.',
     'thresholds': (1, 10, 30), 'unit': 'practices'},
    {'key': 'streak', 'name': 'The Owl Approves', 'description': 'Days in a row with at least one saved practice (your best run).',
     'thresholds': (3, 7, 14), 'unit': 'days'},
    {'key': 'best_score', 'name': 'Way To Go!', 'description': 'Best total score in a single attempt.',
     'thresholds': (1.5, 1.65, 1.85), 'unit': 'score'},
    {'key': 'average', 'name': 'Tuff 24/7', 'description': f'Average total score, counted from {AVERAGE_MIN_PRACTICES} practices.',
     'thresholds': (1.4, 1.55, 1.7), 'unit': 'score'},
    {'key': 'balanced', 'name': 'Master of All Trades', 'description': 'Your weakest criterion average, as a share of its maximum.',
     'thresholds': (0.7, 0.8, 0.9), 'unit': 'percent'},
    {'key': 'comeback', 'name': 'Sweet Revenge', 'description': 'Largest rise in total score on the same question, from your first try.',
     'thresholds': (0.1, 0.2, 0.3), 'unit': 'gain'},
    {'key': 'explorer', 'name': 'The Explorer', 'description': 'Different questions practised.',
     'thresholds': (10, 15, 25), 'unit': 'questions'},
    {'key': 'content', 'name': "Shakespeare's Descendant", 'description': 'Best Content score in a single attempt (out of 0.9).',
     'thresholds': (0.75, 0.8, 0.85), 'unit': 'score'},
    {'key': 'accuracy', 'name': 'Grammar Police', 'description': 'Best Accuracy score in a single attempt (out of 0.6).',
     'thresholds': (0.48, 0.52, 0.56), 'unit': 'score'},
    {'key': 'delivery', 'name': 'Smooooooth Operator', 'description': 'Best Delivery score in a single attempt (out of 0.5).',
     'thresholds': (0.4, 0.43, 0.46), 'unit': 'score'},
    {'key': 'full_answers', 'name': 'Left No Crumbs', 'description': 'Answers where you keep speaking until at least 4:50.',
     'thresholds': (1, 5, 10), 'unit': 'answers'},
    {'key': 'mock_tests', 'name': 'Geared Up and Ready To Go', 'description': 'Timed mock tests completed in Simulation.',
     'thresholds': (1, 5, 15), 'unit': 'tests'},
    {'key': 'clean_answers', 'name': 'What\'s A "Um"?', 'description': 'Answers of 3 minutes or more with 2 or fewer filler words.',
     'thresholds': (1, 5, 15), 'unit': 'answers'},
    {'key': 'posts', 'name': "Now You're Speaking", 'description': 'Posts you publish in Community.',
     'thresholds': (1, 5, 15), 'unit': 'posts'},
    {'key': 'reactions', 'name': 'Everybody Loves You', 'description': 'Reactions your posts have received from others.',
     'thresholds': (10, 20, 30), 'unit': 'reactions'},
]


def _score(practice, key):
    try:
        return float((practice.scores or {}).get(key) or 0)
    except (TypeError, ValueError):
        return 0.0


def last_word_seconds(practice):
    """When the last word was spoken, from the stored pace series; None if unknown."""
    metrics = practice.metrics or {}
    if not metrics.get('available'):
        return None
    if metrics.get('lastWordSeconds') is not None:
        return float(metrics['lastWordSeconds'])
    series = metrics.get('paceSeries') or []
    return float(series[-1].get('end') or 0) if series else None


def longest_streak(practices):
    days = sorted({practice.created_at.date() for practice in practices if practice.created_at})
    best = run = 0
    previous = None
    for day in days:
        run = run + 1 if previous and day - previous == timedelta(days=1) else 1
        best = max(best, run)
        previous = day
    return best


def biggest_comeback(practices):
    """Largest (best later attempt - first attempt) on any one question."""
    by_question = {}
    for practice in sorted(practices, key=lambda item: item.created_at):
        if practice.prompt_key:
            by_question.setdefault(practice.prompt_key, []).append(_score(practice, 'total'))
    gains = [max(scores[1:]) - scores[0] for scores in by_question.values() if len(scores) > 1]
    return max([0.0, *gains])


def measure(practices, posts_count=0, reactions_received=0):
    """The value each badge is judged on.

    Practice count and streak take every practice. Everything judged on scores
    or on a full NEC answer takes NEC practice only (Analyze, Simulation):
    Unscripted talks are shorter and graded with other instructions.
    """
    all_practices = practices
    practices = [practice for practice in practices if is_nec_practice(practice)]
    count = len(practices)
    averages = {
        key: (sum(_score(p, key) for p in practices) / count if count else 0.0)
        for key in ('total', *CRITERION_MAX)
    }
    clean = 0
    full = 0
    for practice in practices:
        spoken = last_word_seconds(practice)
        if spoken is None:
            continue
        if spoken >= FULL_ANSWER_SECONDS:
            full += 1
        fillers = ((practice.metrics or {}).get('fillers') or {}).get('total')
        if spoken >= CLEAN_ANSWER_MIN_SECONDS and fillers is not None and fillers <= CLEAN_ANSWER_MAX_FILLERS:
            clean += 1

    return {
        'practices': len(all_practices),
        'streak': longest_streak(all_practices),
        'best_score': max([0.0, *(_score(p, 'total') for p in practices)]),
        'average': averages['total'] if count >= AVERAGE_MIN_PRACTICES else 0.0,
        'balanced': min(averages[key] / CRITERION_MAX[key] for key in CRITERION_MAX) if count else 0.0,
        'comeback': biggest_comeback(practices),
        'explorer': len({p.prompt_key for p in practices if p.prompt_key}),
        'content': max([0.0, *(_score(p, 'content') for p in practices)]),
        'accuracy': max([0.0, *(_score(p, 'accuracy') for p in practices)]),
        'delivery': max([0.0, *(_score(p, 'delivery') for p in practices)]),
        'full_answers': full,
        'mock_tests': sum(1 for p in practices if getattr(p, 'source', None) == 'simulation'),
        'clean_answers': clean,
        'posts': posts_count,
        'reactions': reactions_received,
    }


def compute_achievements(practices, posts_count=0, reactions_received=0):
    values = measure(practices, posts_count, reactions_received)
    result = []
    for badge in BADGES:
        value = values[badge['key']]
        # A hair of tolerance so 0.8 stored as 0.7999999 still counts.
        tier = sum(1 for threshold in badge['thresholds'] if value + 1e-9 >= threshold)
        result.append({
            'key': badge['key'],
            'name': badge['name'],
            'description': badge['description'],
            'unit': badge['unit'],
            'thresholds': list(badge['thresholds']),
            'tier': tier,
            'tierName': TIERS[tier - 1] if tier else None,
            'value': round(value, 4),
            'nextTarget': badge['thresholds'][tier] if tier < len(TIERS) else None,
        })
    return result


def earned_badges(practices, posts_count=0, reactions_received=0):
    """Public view: only what was earned, highest tier each."""
    return [
        {'key': item['key'], 'name': item['name'], 'tier': item['tier'], 'tierName': item['tierName']}
        for item in compute_achievements(practices, posts_count, reactions_received)
        if item['tier']
    ]
