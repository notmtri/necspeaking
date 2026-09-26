from datetime import datetime, timedelta

from database import UserPracticeSession, build_prompt_key, db, utcnow


def round_score(value):
    return round(float(value or 0), 2)


def build_progress_points(sessions):
    if not sessions:
        return []

    # Keyed by (year, month): keying by the month name alone merged, say,
    # September 2025 and September 2026 into one averaged point.
    monthly_scores = {}
    for practice in sessions:
        month_key = (practice.created_at.year, practice.created_at.month)
        monthly_scores.setdefault(month_key, []).append(float((practice.scores or {}).get('total') or 0))

    points = []
    for month_key in sorted(monthly_scores)[-6:]:
        scores = monthly_scores[month_key]
        label = datetime(month_key[0], month_key[1], 1).strftime('%b')
        points.append({"label": label, "value": round_score(sum(scores) / len(scores))})
    return points


def build_commit_weeks(sessions):
    if not sessions:
        return []

    counts_by_day = {}
    for practice in sessions:
        day_key = practice.created_at.date()
        counts_by_day[day_key] = counts_by_day.get(day_key, 0) + 1

    start_day = utcnow().date() - timedelta(days=41)
    weeks = []
    for week_index in range(6):
        week = []
        for day_index in range(7):
            current_day = start_day + timedelta(days=week_index * 7 + day_index)
            count = counts_by_day.get(current_day, 0)
            week.append(min(count, 4))
        weeks.append(week)
    return weeks


def calculate_streak(sessions):
    if not sessions:
        return 0

    practice_days = sorted({practice.created_at.date() for practice in sessions}, reverse=True)
    if not practice_days:
        return 0

    streak = 0
    current_day = utcnow().date()
    if practice_days[0] not in {current_day, current_day - timedelta(days=1)}:
        return 0

    expected_day = practice_days[0]
    for day in practice_days:
        if day == expected_day:
            streak += 1
            expected_day = expected_day - timedelta(days=1)
        elif day < expected_day:
            break
    return streak


def refresh_user_stats(user):
    practices = UserPracticeSession.query.filter_by(user_id=user.id).order_by(UserPracticeSession.created_at.asc()).all()
    totals = [float((practice.scores or {}).get('total') or 0) for practice in practices]
    average_score = (sum(totals) / len(totals)) if totals else 0
    best_score = max(totals) if totals else 0

    user.stats = {
        "practices": len(practices),
        "avgScore": round_score(average_score),
        "streak": calculate_streak(practices),
        "bestScore": round_score(best_score)
    }
    user.progress = build_progress_points(practices)
    user.commit_weeks = build_commit_weeks(practices)


def create_practice_session(user, topic, transcript_text, duration, scores, metrics=None,
                            feedback=None, sample_response=None, grader=None):
    practice = UserPracticeSession(
        user_id=user.id,
        topic=topic,
        prompt_key=build_prompt_key(topic),
        transcript=transcript_text,
        duration=float(duration or 0),
        metrics=metrics or None,
        feedback=feedback or None,
        sample_response=sample_response or None,
        grader=grader or None,
        scores={
            "content": round_score(scores.get("content")),
            "accuracy": round_score(scores.get("accuracy")),
            "delivery": round_score(scores.get("delivery")),
            "total": round_score(scores.get("total"))
        }
    )
    db.session.add(practice)
    db.session.flush()
    refresh_user_stats(user)
    return practice
