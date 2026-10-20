"""
Run the job from a terminal:

    DATABASE_URL=... python -m question_analytics --dry-run
    DATABASE_URL=... python -m question_analytics --test-id <id>

--dry-run only reads, and prints the stats instead of writing them, so it
works on a database that doesn't have the QuestionStat table yet.
"""

from __future__ import annotations

import argparse
import os
import sys

from question_analytics import db, job
from question_analytics.analysis import DEFAULT_MIN_STUDENTS


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="question_analytics", description=__doc__.split("\n\n")[0])
    parser.add_argument("--test-id", help="analyse one test instead of all of them")
    parser.add_argument("--min-students", type=int, default=int(os.environ.get("MIN_STUDENTS", DEFAULT_MIN_STUDENTS)))
    parser.add_argument("--dry-run", action="store_true", help="print the stats; write nothing")
    args = parser.parse_args(argv)

    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        parser.error("set DATABASE_URL")
    with db.connect(database_url) as conn:
        summary = job.run(conn, test_id=args.test_id, min_students=args.min_students, dry_run=args.dry_run)
    return 1 if summary["failedTests"] else 0


if __name__ == "__main__":
    sys.exit(main())
