"""
Runs the whole job against a real Postgres built from the app's migrations.

Opt-in: set TEST_DATABASE_URL to a local, disposable database that has had
`npx prisma migrate deploy`. It refuses any host but localhost. Every row it
creates hangs off one course and its users, which it deletes afterwards.
"""

import os
import uuid
from urllib.parse import urlsplit

import pytest
from psycopg.types.json import Jsonb

from question_analytics import db, job

TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL")

pytestmark = pytest.mark.skipif(not TEST_DATABASE_URL, reason="set TEST_DATABASE_URL to run database tests")

STUDENTS = 25


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


@pytest.fixture
def conn():
    host = urlsplit(TEST_DATABASE_URL).hostname
    if host not in ("localhost", "127.0.0.1", "::1"):
        pytest.fail(f"TEST_DATABASE_URL must point at a local database, not {host}")
    with db.connect(TEST_DATABASE_URL) as connection:
        yield connection


@pytest.fixture
def exam(conn):
    """
    A course with one test: four ordinary questions that rank the class, a
    good question, one with a wrong key, and a sketch.
    """
    course_id, test_id = new_id("course"), new_id("test")
    good, wrong_key, sketch = new_id("q"), new_id("q"), new_id("q")
    anchors = [new_id("q") for _ in range(4)]
    students = [new_id("student") for _ in range(STUDENTS)]
    teacher = new_id("teacher")

    conn.execute(
        'INSERT INTO "Course" (id, title, slug, "updatedAt") VALUES (%s, %s, %s, now())',
        (course_id, "Analytics test course", course_id),
    )
    conn.execute(
        'INSERT INTO "CourseTest" (id, "courseId", title, status, "updatedAt") VALUES (%s, %s, %s, %s, now())',
        (test_id, course_id, "Analytics test", "PUBLISHED"),
    )
    questions = [(qid, "SCQ", ["A"]) for qid in anchors] + [(good, "SCQ", ["A"]), (wrong_key, "SCQ", ["A"]), (sketch, "SKETCH", [])]
    for order, (qid, qtype, key) in enumerate(questions):
        conn.execute(
            """INSERT INTO "TestQuestion" (id, "testId", type, prompt, options, "correctAnswer", points, "order")
               VALUES (%s, %s, %s::"QuestionType", %s, %s, %s, %s, %s)""",
            (qid, test_id, qtype, f"Question {order + 1}", Jsonb(["A", "B", "C"] if qtype == "SCQ" else []), Jsonb(key), 4, order),
        )
    for uid in students:
        conn.execute('INSERT INTO "User" (id, role, "updatedAt") VALUES (%s, %s, now())', (uid, "STUDENT"))
    conn.execute('INSERT INTO "User" (id, role, "updatedAt") VALUES (%s, %s, now())', (teacher, "MENTOR"))

    def attempt(uid: str, answers: dict, minutes_ago: int, submitted: bool = True, grades: dict | None = None):
        conn.execute(
            """INSERT INTO "TestAttempt" (id, "testId", "userId", answers, "sketchGrades", "submittedAt")
               VALUES (%s, %s, %s, %s, %s, CASE WHEN %s THEN now() - make_interval(mins => %s) END)""",
            (new_id("attempt"), test_id, uid, Jsonb(answers), Jsonb(grades) if grades else None, submitted, minutes_ago),
        )

    # The second half of the class is stronger: they get the ordinary questions
    # and the good one right, and pick B on the wrong-key question
    for i, uid in enumerate(students):
        strong = i >= STUDENTS // 2
        attempt(
            uid,
            {
                **{qid: "A" if strong else "C" for qid in anchors},
                good: "A" if strong else "C",
                wrong_key: "B" if strong else "A",
                sketch: "https://example.com/s.png",
            },
            minutes_ago=60,
            grades={sketch: {"points": 3 if strong else 1}} if i % 5 else None,
        )
    # None of these may count: a retake, a teacher's preview, an unfinished attempt
    attempt(students[0], {good: "A", wrong_key: "B"}, minutes_ago=5)
    attempt(teacher, {good: "B", wrong_key: "C"}, minutes_ago=5)
    attempt(students[1], {good: "A"}, minutes_ago=0, submitted=False)

    yield {"test_id": test_id, "good": good, "wrong_key": wrong_key, "sketch": sketch}

    conn.execute('DELETE FROM "Course" WHERE id = %s', (course_id,))  # cascades to the test, questions, attempts, stats
    conn.execute('DELETE FROM "User" WHERE id = ANY(%s)', (students + [teacher],))


def stats_by_question(conn, test_id):
    rows = conn.execute(
        """SELECT "questionId", "studentCount", "answeredCount", "correctCount", "pendingCount",
                  difficulty, discrimination, "answerCounts", flags, "computedAt"
           FROM "QuestionStat" WHERE "testId" = %s""",
        (test_id,),
    ).fetchall()
    keys = ["student_count", "answered", "correct", "pending", "difficulty", "discrimination", "answer_counts", "flags", "computed_at"]
    return {row[0]: dict(zip(keys, row[1:])) for row in rows}


def test_job_writes_stats_from_first_student_attempts(conn, exam):
    summary = job.run(conn, test_id=exam["test_id"])
    assert summary["failedTests"] == [] and summary["tests"] == 1 and summary["questions"] == 7

    stats = stats_by_question(conn, exam["test_id"])
    good, wrong, sketch = stats[exam["good"]], stats[exam["wrong_key"]], stats[exam["sketch"]]

    # 25 students; the retake, the teacher and the unfinished attempt are left out
    assert good["student_count"] == STUDENTS and good["correct"] == STUDENTS - STUDENTS // 2
    assert good["discrimination"] > 0.9 and good["flags"] == []

    assert wrong["discrimination"] < 0
    assert "NEGATIVE_DISCRIMINATION" in wrong["flags"] and "TOP_STUDENTS_DISAGREE" in wrong["flags"]
    assert {"answer": "B", "count": 13, "isCorrect": False} in wrong["answer_counts"]

    assert sketch["pending"] == 5  # every fifth student has no sketch grade yet
    assert sketch["answer_counts"] == []


def test_rerunning_replaces_the_rows(conn, exam):
    job.run(conn, test_id=exam["test_id"])
    first = stats_by_question(conn, exam["test_id"])
    job.run(conn, test_id=exam["test_id"])
    second = stats_by_question(conn, exam["test_id"])
    assert second.keys() == first.keys()
    assert all(second[q]["computed_at"] >= first[q]["computed_at"] for q in first)


def test_dry_run_writes_nothing(conn, exam):
    summary = job.run(conn, test_id=exam["test_id"], dry_run=True)
    assert summary["questions"] == 7
    assert stats_by_question(conn, exam["test_id"]) == {}


def test_deleting_a_question_deletes_its_stats(conn, exam):
    job.run(conn, test_id=exam["test_id"])
    conn.execute('DELETE FROM "TestQuestion" WHERE id = %s', (exam["sketch"],))
    assert exam["sketch"] not in stats_by_question(conn, exam["test_id"])

