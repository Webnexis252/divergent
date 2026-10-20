"""
Recomputes QuestionStat for every test that students have submitted.

Each test is analysed and written on its own, so one bad test (say, a question
deleted while the job runs) is logged and skipped without losing the rest.
The next run recomputes everything, which is why the job is safe to re-run
and has no state of its own.
"""

from __future__ import annotations

import json
import time
from dataclasses import asdict
from typing import Any

import psycopg

from question_analytics import db
from question_analytics.analysis import DEFAULT_MIN_STUDENTS, analyse_test


def log(event: str, **fields: Any) -> None:
    # One JSON object per line, which CloudWatch Logs Insights can query
    print(json.dumps({"event": event, **fields}, default=str), flush=True)


def run(
    conn: psycopg.Connection,
    *,
    test_id: str | None = None,
    min_students: int = DEFAULT_MIN_STUDENTS,
    dry_run: bool = False,
) -> dict[str, Any]:
    started = time.monotonic()
    summary: dict[str, Any] = {"tests": 0, "questions": 0, "flagged": 0, "failedTests": [], "dryRun": dry_run}

    for tid in db.tests_with_student_attempts(conn, test_id):
        try:
            questions = db.load_questions(conn, tid)
            attempts = db.load_first_attempts(conn, tid)
            stats = analyse_test(questions, attempts, min_students)
            if dry_run:
                log("test_stats", testId=tid, students=len(attempts), stats=[asdict(s) for s in stats])
            else:
                db.replace_test_stats(conn, tid, stats)
        except Exception as err:
            # E.g. a question deleted mid-run trips the foreign key. The other tests
            # still run, the Lambda reports failure at the end, and the next run catches up.
            log("test_failed", testId=tid, error=f"{type(err).__name__}: {err}".strip())
            summary["failedTests"].append(tid)
            continue
        flagged = sum(1 for s in stats if s.flags)
        summary["tests"] += 1
        summary["questions"] += len(stats)
        summary["flagged"] += flagged
        log("test_done", testId=tid, students=len(attempts), questions=len(stats), flagged=flagged)

    summary["seconds"] = round(time.monotonic() - started, 2)
    log("run_done", **summary)
    return summary
