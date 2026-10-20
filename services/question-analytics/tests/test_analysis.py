import pytest

from question_analytics.analysis import (
    LOW_DISCRIMINATION,
    NEGATIVE_DISCRIMINATION,
    OFTEN_SKIPPED,
    OPTIONS_CHANGED,
    TOO_EASY,
    TOO_HARD,
    TOP_STUDENTS_DISAGREE,
    Attempt,
    analyse_test,
)
from question_analytics.grading import Question

STUDENTS = 30
OPTIONS = ("A", "B", "C", "D")


def scq(qid: str, key: str = "A", **kwargs) -> Question:
    return Question(id=qid, type="SCQ", points=1, options=OPTIONS, correct_answer=[key], **kwargs)


# Five anchor questions give the class a spread of total scores: student i
# answers the first (i * 6 // STUDENTS) of them correctly, so student 29 is the strongest.
ANCHORS = [scq(f"anchor{n}") for n in range(5)]


def anchor_answers(i: int) -> dict:
    right = i * 6 // STUDENTS
    return {q.id: ("A" if n < right else "B") for n, q in enumerate(ANCHORS)}


def class_attempts(target_answer, **attempt_kwargs) -> list[Attempt]:
    """`target_answer(i)` is what student i answered to question "q"."""
    return [
        Attempt(id=f"a{i}", user_id=f"u{i:02d}", answers={**anchor_answers(i), "q": target_answer(i)}, **attempt_kwargs)
        for i in range(STUDENTS)
    ]


def stat_for(stats, qid="q"):
    return next(s for s in stats if s.question_id == qid)


def test_a_good_question_separates_strong_and_weak_students():
    stats = analyse_test([*ANCHORS, scq("q")], class_attempts(lambda i: "A" if i >= 12 else "C"))
    s = stat_for(stats)
    assert s.student_count == 30 and s.answered_count == 30 and s.correct_count == 18
    assert s.difficulty == pytest.approx(0.6)
    assert s.discrimination == pytest.approx(1.0)
    assert s.flags == []


def test_a_wrong_answer_key_is_flagged():
    # Strong students pick B, but the key says A
    stats = analyse_test([*ANCHORS, scq("q", key="A")], class_attempts(lambda i: "B" if i >= 10 else "A"))
    s = stat_for(stats)
    assert s.discrimination < 0
    assert NEGATIVE_DISCRIMINATION in s.flags
    assert TOP_STUDENTS_DISAGREE in s.flags
    assert {"answer": "B", "count": 20, "isCorrect": False} in s.answer_counts
    assert {"answer": "A", "count": 10, "isCorrect": True} in s.answer_counts


def test_a_hard_question_with_a_popular_wrong_option_is_fine():
    # Most of the class picks D, but the strongest students get it right
    stats = analyse_test([*ANCHORS, scq("q")], class_attempts(lambda i: "A" if i >= 18 else "D"))
    s = stat_for(stats)
    assert {"answer": "D", "count": 18, "isCorrect": False} in s.answer_counts
    assert s.discrimination > 0.5
    assert s.flags == []


def test_top_students_agreeing_on_another_numeric_answer():
    numeric = Question(id="q", type="NUMERIC", points=1, correct_answer=["9.8"])
    stats = analyse_test([*ANCHORS, numeric], class_attempts(lambda i: "9.81" if i >= 15 else "9.8"))
    assert TOP_STUDENTS_DISAGREE in stat_for(stats).flags


def test_too_hard_too_easy_and_skipped():
    questions = [*ANCHORS, scq("hard"), scq("easy"), scq("skipped")]
    attempts = [
        Attempt(
            id=f"a{i}",
            user_id=f"u{i:02d}",
            answers={
                **anchor_answers(i),
                "hard": "A" if i >= 27 else "B",
                "easy": "A",
                **({"skipped": "A" if i >= 15 else "B"} if i % 2 == 0 else {}),
            },
        )
        for i in range(STUDENTS)
    ]
    stats = analyse_test(questions, attempts)
    assert TOO_HARD in stat_for(stats, "hard").flags
    assert TOO_EASY in stat_for(stats, "easy").flags
    skipped = stat_for(stats, "skipped")
    assert skipped.answered_count == 15
    assert OFTEN_SKIPPED in skipped.flags


def test_a_question_that_barely_separates_students_is_flagged():
    # Right or wrong regardless of ability
    stats = analyse_test([*ANCHORS, scq("q")], class_attempts(lambda i: "A" if i % 2 else "B"))
    s = stat_for(stats)
    assert 0 <= s.discrimination < 0.15
    assert LOW_DISCRIMINATION in s.flags


def test_ties_at_the_cut_off_do_not_depend_on_student_ids():
    attempts = class_attempts(lambda i: "A" if i % 2 else "B")
    renamed = [Attempt(id=a.id, user_id=f"z{99 - n}", answers=a.answers) for n, a in enumerate(attempts)]
    questions = [*ANCHORS, scq("q")]
    assert stat_for(analyse_test(questions, attempts)).discrimination == pytest.approx(
        stat_for(analyse_test(questions, renamed)).discrimination
    )


def test_the_question_itself_does_not_count_towards_the_ranking():
    # Everyone has the same anchor answers, so only q could separate them
    attempts = [
        Attempt(id=f"a{i}", user_id=f"u{i:02d}", answers={**anchor_answers(15), "q": "A" if i % 2 else "B"})
        for i in range(STUDENTS)
    ]
    assert stat_for(analyse_test([*ANCHORS, scq("q")], attempts)).discrimination == pytest.approx(0)


def test_answers_that_match_no_current_option():
    # The options were renamed after most students answered
    stats = analyse_test([*ANCHORS, scq("q")], class_attempts(lambda i: "Option A" if i < 20 else "A"))
    s = stat_for(stats)
    assert {"answer": None, "count": 20, "isCorrect": False} in s.answer_counts
    assert OPTIONS_CHANGED in s.flags


def test_small_classes_get_numbers_but_no_flags():
    attempts = class_attempts(lambda i: "B" if i >= 10 else "A")[:10]
    s = stat_for(analyse_test([*ANCHORS, scq("q")], attempts, min_students=20))
    assert s.student_count == 10
    assert s.difficulty is not None
    assert s.discrimination is None
    assert s.flags == []


def test_questions_a_student_was_not_shown_are_not_counted():
    questions = [*ANCHORS, scq("q"), scq("unseen")]
    shown = [q.id for q in ANCHORS] + ["q"]
    attempts = class_attempts(lambda i: "A", question_order=shown)
    stats = analyse_test(questions, attempts)
    assert [s.question_id for s in stats if s.question_id == "unseen"] == []
    assert stat_for(stats).student_count == 30


def test_partial_marks_count_towards_difficulty():
    mcq = Question(id="q", type="MCQ", points=4, options=OPTIONS, correct_answer=["A", "C"], allow_partial_marking=True)
    stats = analyse_test([*ANCHORS, mcq], class_attempts(lambda i: ["A"]))
    s = stat_for(stats)
    assert s.correct_count == 0
    assert s.difficulty == pytest.approx(0.5)
    assert {"answer": "A", "count": 30, "isCorrect": True} in s.answer_counts
    assert {"answer": "C", "count": 0, "isCorrect": True} in s.answer_counts


def test_negative_marks_count_as_zero_for_difficulty():
    stats = analyse_test([*ANCHORS, scq("q", negative_marks=1)], class_attempts(lambda i: "B"))
    assert stat_for(stats).difficulty == 0


def test_sketches_use_the_teachers_grade_and_count_ungraded_ones():
    sketch = Question(id="q", type="SKETCH", points=10, correct_answer=[])
    attempts = [
        Attempt(
            id=f"a{i}",
            user_id=f"u{i}",
            answers={"q": f"https://example.com/{i}.png"},
            sketch_grades={"q": {"points": 7, "feedback": "ok"}} if i < 4 else None,
        )
        for i in range(6)
    ]
    s = stat_for(analyse_test([sketch], attempts))
    assert s.pending_count == 2
    assert s.difficulty == pytest.approx(0.7)
    assert s.answer_counts == []


def test_numeric_answers_are_grouped_like_grading_compares_them():
    numeric = Question(id="q", type="NUMERIC", points=1, correct_answer=["12E3"])
    answers = ["12e3", " 12E3 ", "1.2e3", "1.2E3", "1.2e3", "", "7"]
    attempts = [Attempt(id=f"a{i}", user_id=f"u{i}", answers={"q": a}) for i, a in enumerate(answers)]
    s = stat_for(analyse_test([numeric], attempts))
    assert s.answered_count == 6
    assert s.answer_counts == [
        {"answer": "1.2e3", "count": 3, "isCorrect": False},
        {"answer": "12e3", "count": 2, "isCorrect": True},
        {"answer": "7", "count": 1, "isCorrect": False},
    ]


def test_no_attempts_means_no_stats():
    assert analyse_test([scq("q")], []) == []
