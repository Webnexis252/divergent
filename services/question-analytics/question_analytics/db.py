"""
Postgres access. The job reads CourseTest, TestQuestion, TestAttempt and User
and writes only "QuestionStat". Prisma owns the schema (the table comes from a
migration in prisma/migrations); this code never creates or alters tables.
"""

from __future__ import annotations

from collections.abc import Iterable
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

import psycopg
from psycopg.types.json import Jsonb

from question_analytics.analysis import Attempt, QuestionStat
from question_analytics.grading import Question

# Query parameters Prisma understands but libpq rejects ("invalid URI query parameter")
PRISMA_ONLY_PARAMS = {
    "pgbouncer",
    "connection_limit",
    "pool_timeout",
    "schema",
    "statement_cache_size",
    "socket_timeout",
}


def libpq_url(database_url: str) -> str:
    """The app's DATABASE_URL with the Prisma-only parameters removed."""
    parts = urlsplit(database_url)
    query = [(k, v) for k, v in parse_qsl(parts.query, keep_blank_values=True) if k not in PRISMA_ONLY_PARAMS]
    return urlunsplit(parts._replace(query=urlencode(query)))


def connect(database_url: str) -> psycopg.Connection:
    # prepare_threshold=None: no server-side prepared statements, which
    # PgBouncer's transaction mode (Supabase port 6543) can't keep per client
    return psycopg.connect(libpq_url(database_url), autocommit=True, prepare_threshold=None, connect_timeout=15)


def tests_with_student_attempts(conn: psycopg.Connection, test_id: str | None = None) -> list[str]:
    rows = conn.execute(
        """
        SELECT t.id
        FROM "CourseTest" t
        WHERE (%(test_id)s::text IS NULL OR t.id = %(test_id)s)
          AND EXISTS (
            SELECT 1 FROM "TestAttempt" a
            JOIN "User" u ON u.id = a."userId"
            WHERE a."testId" = t.id AND a."submittedAt" IS NOT NULL AND u.role = 'STUDENT'
          )
        ORDER BY t.id
        """,
        {"test_id": test_id},
    ).fetchall()
    return [row[0] for row in rows]


def load_questions(conn: psycopg.Connection, test_id: str) -> list[Question]:
    rows = conn.execute(
        """
        SELECT id, type::text, points, "negativeMarks", "allowPartialMarking", options, "correctAnswer"
        FROM "TestQuestion"
        WHERE "testId" = %s
        ORDER BY "order", id
        """,
        (test_id,),
    ).fetchall()
    return [
        Question(
            id=qid,
            type=qtype,
            points=points,
            negative_marks=negative_marks or 0,
            allow_partial_marking=bool(partial),
            options=tuple(o for o in options if isinstance(o, str)) if isinstance(options, list) else (),
            correct_answer=correct_answer,
        )
        for qid, qtype, points, negative_marks, partial, options, correct_answer in rows
    ]


def load_first_attempts(conn: psycopg.Connection, test_id: str) -> list[Attempt]:
    """Each student's first submitted attempt. Teachers' and admins' previews don't count."""
    rows = conn.execute(
        """
        SELECT DISTINCT ON (a."userId") a.id, a."userId", a.answers, a."questionOrder", a."sketchGrades"
        FROM "TestAttempt" a
        JOIN "User" u ON u.id = a."userId"
        WHERE a."testId" = %s AND a."submittedAt" IS NOT NULL AND u.role = 'STUDENT'
        ORDER BY a."userId", a."submittedAt", a.id
        """,
        (test_id,),
    ).fetchall()
    return [
        Attempt(
            id=attempt_id,
            user_id=user_id,
            answers=answers if isinstance(answers, dict) else {},
            question_order=order if isinstance(order, list) else None,
            sketch_grades=grades if isinstance(grades, dict) else None,
        )
        for attempt_id, user_id, answers, order, grades in rows
    ]


def replace_test_stats(conn: psycopg.Connection, test_id: str, stats: Iterable[QuestionStat]) -> None:
    """Swaps a test's rows in one transaction, so readers see the old set or the new one, never half."""
    with conn.transaction():
        # Two runs at once (a manual run during the nightly one) take turns per
        # test instead of colliding on the primary key. Released at commit.
        conn.execute("SELECT pg_advisory_xact_lock(hashtext('QuestionStat'), hashtext(%s))", (test_id,))
        conn.execute('DELETE FROM "QuestionStat" WHERE "testId" = %s', (test_id,))
        with conn.cursor() as cur:
            cur.executemany(
                """
                INSERT INTO "QuestionStat" (
                  "questionId", "testId", "studentCount", "answeredCount", "correctCount", "pendingCount",
                  "difficulty", "discrimination", "answerCounts", "flags", "computedAt"
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, now() AT TIME ZONE 'UTC')
                """,
                [
                    (
                        s.question_id,
                        test_id,
                        s.student_count,
                        s.answered_count,
                        s.correct_count,
                        s.pending_count,
                        s.difficulty,
                        s.discrimination,
                        Jsonb(s.answer_counts),
                        s.flags,
                    )
                    for s in stats
                ],
            )
