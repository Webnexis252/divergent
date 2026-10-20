"""
Item analysis for one test: how hard each question was, whether it separates
strong students from weak ones, and which answers students picked.

Only each student's first submitted attempt counts. Retakes show the same
questions again, so later attempts measure memory rather than the question.

Terms (classical test theory):
- difficulty: the average share of the question's marks students got, 0 to 1.
  Skipped answers count as 0 and negative marks as 0, so it reads as
  "how much of this question did the class get right".
- discrimination: rank the students who saw the question by their score on the
  rest of the test (leaving this question out, so it can't vouch for itself),
  then take the average score on this question of the top 27% minus that of
  the bottom 27%. Near +1, strong students get it and weak ones don't. Below
  0, weak students do better than strong ones, which usually means a wrong
  answer key or a confusing question.
"""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass, field
from typing import Any

import pandas as pd

from question_analytics.grading import Question, grade, js_trim, to_trimmed_string_array

# Questions answered by fewer students than this get numbers but no flags
DEFAULT_MIN_STUDENTS = 20
GROUP_SHARE = 0.27
TOO_HARD_BELOW = 0.25
TOO_EASY_ABOVE = 0.95
LOW_DISCRIMINATION_BELOW = 0.15
OFTEN_SKIPPED_ABOVE = 0.30
OPTIONS_CHANGED_ABOVE = 0.10
NUMERIC_TOP_ANSWERS = 5

# Flag names are stored in the database and read by src/lib/question-stats.ts
NEGATIVE_DISCRIMINATION = "NEGATIVE_DISCRIMINATION"
TOP_STUDENTS_DISAGREE = "TOP_STUDENTS_DISAGREE"
OPTIONS_CHANGED = "OPTIONS_CHANGED"
TOO_HARD = "TOO_HARD"
OFTEN_SKIPPED = "OFTEN_SKIPPED"
LOW_DISCRIMINATION = "LOW_DISCRIMINATION"
TOO_EASY = "TOO_EASY"


@dataclass(frozen=True)
class Attempt:
    id: str
    user_id: str
    answers: dict[str, Any]
    question_order: list[Any] | None = None
    sketch_grades: dict[str, Any] | None = None


@dataclass
class QuestionStat:
    question_id: str
    student_count: int
    answered_count: int
    correct_count: int
    pending_count: int
    difficulty: float | None
    discrimination: float | None
    answer_counts: list[dict[str, Any]] = field(default_factory=list)
    flags: list[str] = field(default_factory=list)


def shown_question_ids(attempt: Attempt, all_ids: list[str]) -> set[str]:
    """Same rule as attemptQuestionIds in src/lib/test-attempts.ts: no saved order means every question."""
    saved = [qid for qid in (attempt.question_order or []) if isinstance(qid, str)]
    return set(saved) if saved else set(all_ids)


def is_answered(question: Question, answer: Any) -> bool:
    if question.type in ("SCQ", "NUMERIC"):
        return isinstance(answer, str) and js_trim(answer) != ""
    if question.type == "SKETCH":
        return bool(to_trimmed_string_array(answer)) or (isinstance(answer, dict) and bool(answer))
    return bool(to_trimmed_string_array(answer))


def _clamp_share(points: float, out_of: float) -> float:
    return min(max(points / out_of, 0.0), 1.0)


def _sketch_points(attempt: Attempt, question_id: str) -> float | None:
    entry = (attempt.sketch_grades or {}).get(question_id)
    if isinstance(entry, dict):
        points = entry.get("points")
        if isinstance(points, (int, float)) and not isinstance(points, bool):
            return float(points)
    return None


def score_responses(questions: list[Question], attempts: list[Attempt]) -> pd.DataFrame:
    """One row per (student, question shown to them)."""
    all_ids = [q.id for q in questions]
    rows = []
    for attempt in attempts:
        answers = attempt.answers if isinstance(attempt.answers, dict) else {}
        shown = shown_question_ids(attempt, all_ids)
        for q in questions:
            if q.id not in shown or q.points <= 0:
                continue
            answer = answers.get(q.id)
            answered = is_answered(q, answer)
            if q.type == "SKETCH":
                points = _sketch_points(attempt, q.id)
                if points is not None:
                    score, correct = _clamp_share(points, q.points), points >= q.points
                elif answered:
                    score, correct = None, False  # waiting for the teacher
                else:
                    score, correct = 0.0, False
            else:
                graded = grade(q, answer)
                score, correct = _clamp_share(graded.points_awarded, q.points), graded.is_correct is True
            rows.append(
                {
                    "user_id": attempt.user_id,
                    "question_id": q.id,
                    "points": float(q.points),
                    "answer": answer,
                    "answered": answered,
                    "correct": correct,
                    "score": score,
                }
            )
    frame = pd.DataFrame(
        rows, columns=["user_id", "question_id", "points", "answer", "answered", "correct", "score"]
    )
    frame["score"] = pd.to_numeric(frame["score"], errors="coerce").astype("float64")
    return frame


def with_rest_scores(responses: pd.DataFrame) -> pd.DataFrame:
    """Adds `rest`: the student's share of the marks on the other questions with a known score."""
    known = responses["score"].notna()
    earned_here = (responses["score"] * responses["points"]).where(known, 0.0)
    possible_here = responses["points"].where(known, 0.0)
    earned = earned_here.groupby(responses["user_id"]).transform("sum") - earned_here
    possible = possible_here.groupby(responses["user_id"]).transform("sum") - possible_here
    # Rounded so equal shares reached by different sums (2/4, 3/6) count as a tie
    rest = (earned / possible.where(possible > 0)).round(9)
    return responses.assign(rest=rest)


def _top_group_mean(levels: pd.DataFrame, k: int) -> float:
    """
    Mean score of the first k students, walking `levels` (one row per rest
    score, best first, with the sum and count of scores). Students tied across
    the cut-off count in proportion, which is the average over every way of
    breaking the tie, so the result doesn't depend on student ids.
    """
    taken = total = 0.0
    for score_sum, count in levels[["sum", "count"]].itertuples(index=False):
        take = min(k - taken, count)
        total += score_sum * take / count
        taken += take
        if taken >= k:
            break
    return total / k


def group_size(students: int) -> int:
    return max(1, int(students * GROUP_SHARE + 0.5))


def discrimination_index(ranked: pd.DataFrame) -> float:
    """Top 27% minus bottom 27% by rest score; `ranked` has score and rest columns."""
    k = group_size(len(ranked))
    levels = ranked.groupby("rest")["score"].agg(["sum", "count"]).sort_index(ascending=False)
    return _top_group_mean(levels, k) - _top_group_mean(levels.iloc[::-1], k)


def choice_answer_counts(question: Question, answers: list[Any]) -> list[dict[str, Any]]:
    """Students per option, plus one `answer: None` row for answers matching no current option."""
    options = {}
    for option in question.options:
        options.setdefault(js_trim(option), option)
    key = set(to_trimmed_string_array(question.correct_answer))
    counts: Counter[str] = Counter()
    unmatched = 0
    for answer in answers:
        selected = dict.fromkeys(to_trimmed_string_array(answer))  # one vote per option per student
        if any(choice not in options for choice in selected):
            unmatched += 1
        counts.update(choice for choice in selected if choice in options)
    result = [
        {"answer": label, "count": counts[trimmed], "isCorrect": trimmed in key}
        for trimmed, label in options.items()
    ]
    if unmatched:
        result.append({"answer": None, "count": unmatched, "isCorrect": False})
    return result


def numeric_answer_counts(question: Question, answers: list[Any]) -> list[dict[str, Any]]:
    """The most common answers, grouped the way grading compares them (trimmed, any case)."""
    counts = Counter(js_trim(a).lower() for a in answers if isinstance(a, str) and js_trim(a))
    top = sorted(counts.items(), key=lambda item: (-item[1], item[0]))[:NUMERIC_TOP_ANSWERS]
    return [{"answer": value, "count": n, "isCorrect": grade(question, value).is_correct is True} for value, n in top]


def _comparable(question: Question, answer: Any) -> Any:
    """An answer in the form grading compares, so equal answers count together."""
    if question.type == "MCQ":
        return tuple(sorted(dict.fromkeys(to_trimmed_string_array(answer))))
    text = js_trim(answer) if isinstance(answer, str) else ""
    return text.lower() if question.type == "NUMERIC" else text


def top_students_disagree(question: Question, ranked: pd.DataFrame) -> bool:
    """
    True when the strongest students' most common answer is wrong and more of
    them gave it than got the question right: the usual sign of a wrong key.
    A popular wrong option on its own is normal for a hard question (weak
    students pick it), so this looks at the top group only. Students tied at
    the cut-off all count.
    """
    if question.type not in ("SCQ", "MCQ", "NUMERIC") or ranked.empty:
        return False
    cutoff = ranked["rest"].nlargest(group_size(len(ranked))).min()
    top = ranked[ranked["rest"] >= cutoff]
    answers = Counter(_comparable(question, a) for a in top.loc[top["answered"], "answer"])
    if not answers:
        return False
    answer, count = answers.most_common(1)[0]
    as_given = list(answer) if isinstance(answer, tuple) else answer
    return count > int(top["correct"].sum()) and grade(question, as_given).is_correct is not True


def question_flags(question: Question, stat: QuestionStat, ranked: pd.DataFrame, min_students: int) -> list[str]:
    if len(ranked) < min_students or stat.difficulty is None:
        return []
    flags = []
    d, p = stat.discrimination, stat.difficulty
    if d is not None and d < 0:
        flags.append(NEGATIVE_DISCRIMINATION)
    if top_students_disagree(question, ranked):
        flags.append(TOP_STUDENTS_DISAGREE)
    if question.type in ("SCQ", "MCQ"):
        unmatched = sum(row["count"] for row in stat.answer_counts if row["answer"] is None)
        if stat.answered_count and unmatched / stat.answered_count > OPTIONS_CHANGED_ABOVE:
            flags.append(OPTIONS_CHANGED)
    if p < TOO_HARD_BELOW:
        flags.append(TOO_HARD)
    elif p > TOO_EASY_ABOVE:
        flags.append(TOO_EASY)
    if stat.student_count and (stat.student_count - stat.answered_count) / stat.student_count > OFTEN_SKIPPED_ABOVE:
        flags.append(OFTEN_SKIPPED)
    if d is not None and 0 <= d < LOW_DISCRIMINATION_BELOW and TOO_HARD_BELOW <= p <= TOO_EASY_ABOVE:
        flags.append(LOW_DISCRIMINATION)
    return flags


def analyse_test(
    questions: list[Question], attempts: list[Attempt], min_students: int = DEFAULT_MIN_STUDENTS
) -> list[QuestionStat]:
    """Stats for every question at least one student was shown."""
    responses = score_responses(questions, attempts)
    if responses.empty:
        return []
    responses = with_rest_scores(responses)

    stats = []
    for question in questions:
        rows = responses[responses["question_id"] == question.id]
        if rows.empty:
            continue
        scored = rows.dropna(subset=["score"])
        # A test of one question (or only ungraded sketches besides) has no rest score
        ranked = scored.dropna(subset=["rest"])
        answers = rows.loc[rows["answered"], "answer"].tolist()
        stat = QuestionStat(
            question_id=question.id,
            student_count=len(rows),
            answered_count=int(rows["answered"].sum()),
            correct_count=int(rows["correct"].sum()),
            pending_count=int(rows["score"].isna().sum()),
            difficulty=float(scored["score"].mean()) if len(scored) else None,
            discrimination=discrimination_index(ranked) if len(ranked) >= min_students else None,
        )
        if question.type in ("SCQ", "MCQ"):
            stat.answer_counts = choice_answer_counts(question, answers)
        elif question.type == "NUMERIC":
            stat.answer_counts = numeric_answer_counts(question, answers)
        stat.flags = question_flags(question, stat, ranked, min_students)
        stats.append(stat)
    return stats
