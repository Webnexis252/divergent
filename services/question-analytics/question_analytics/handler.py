"""AWS Lambda entry point, called nightly by EventBridge Scheduler (infra/aws/question-analytics.yaml)."""

from __future__ import annotations

import os
from typing import Any

from question_analytics import db, job
from question_analytics.analysis import DEFAULT_MIN_STUDENTS


def handler(event: dict[str, Any] | None, context: Any) -> dict[str, Any]:
    event = event or {}
    with db.connect(os.environ["DATABASE_URL"]) as conn:
        summary = job.run(
            conn,
            test_id=event.get("testId"),
            min_students=int(os.environ.get("MIN_STUDENTS", DEFAULT_MIN_STUDENTS)),
        )
    # Raising marks the invocation as failed, which the CloudWatch alarm watches
    if summary["failedTests"]:
        raise RuntimeError(f"{len(summary['failedTests'])} test(s) failed: {', '.join(summary['failedTests'])}")
    return summary
