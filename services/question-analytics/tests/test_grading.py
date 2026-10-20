import json
import math
from pathlib import Path

import pytest

from question_analytics.grading import Question, grade, js_number, js_string, js_trim

FIXTURE = json.loads((Path(__file__).parent / "fixtures" / "grading_cases.json").read_text(encoding="utf-8"))


def to_question(raw: dict) -> Question:
    return Question(
        id="q",
        type=raw["type"],
        points=raw["points"],
        correct_answer=raw.get("correctAnswer"),
        negative_marks=raw.get("negativeMarks", 0),
        allow_partial_marking=raw.get("allowPartialMarking", False),
    )


@pytest.mark.parametrize("case", FIXTURE["cases"], ids=[c["name"] for c in FIXTURE["cases"]])
def test_matches_the_app(case):
    """Same cases as src/test/lib/grading-parity.test.ts, so both graders agree."""
    result = grade(to_question(case["question"]), case["answer"])
    assert result.is_correct == case["expected"]["isCorrect"]
    assert result.points_awarded == pytest.approx(case["expected"]["pointsAwarded"])


def test_js_trim_matches_javascript_whitespace():
    assert js_trim("﻿  B 　") == "B"
    assert js_trim("\x1cB\x85") == "\x1cB\x85"  # JavaScript keeps these; str.strip() wouldn't


def test_js_string_matches_javascript():
    assert js_string(1.0) == "1"
    assert js_string(1.5) == "1.5"
    assert js_string(True) == "true"
    assert js_string([1, None, "a"]) == "1,,a"
    assert js_string({"a": 1}) == "[object Object]"


def test_js_number_matches_javascript():
    assert js_number("  ") == 0
    assert js_number("0b101") == 5
    assert js_number("0o17") == 15
    assert js_number("-Infinity") == -math.inf
    assert math.isnan(js_number("1,5"))
    assert math.isnan(js_number("0x"))
