"""
Python port of gradeQuestionAnswer in src/lib/test-grading.ts.

The LMS stores what each student answered, not whether it was right, so this
job re-grades every answer. It must agree with the app exactly: the shared
cases in tests/fixtures/grading_cases.json run against both implementations
(pytest here, vitest in src/test/lib/grading-parity.test.ts). Change both
files together.

The helpers below copy JavaScript's behaviour where Python's differs:
String.prototype.trim() strips a different set of characters than str.strip(),
and Number("...") parses differently from float().
"""

from __future__ import annotations

import math
import re
from dataclasses import dataclass
from typing import Any

# Characters JavaScript's trim() removes: WhiteSpace and LineTerminator.
JS_WHITESPACE = (
    "\t\n\v\f\r          "
    "        　﻿"
)

# [0-9], not \d: Python's \d also matches other scripts' digits, JavaScript's doesn't
_DECIMAL = re.compile(r"[+-]?(?:Infinity|(?:[0-9]+\.?[0-9]*|\.[0-9]+)(?:[eE][+-]?[0-9]+)?)")
# Unsigned only, as in JavaScript: Number("-0x10") is NaN
_RADIX = (
    (re.compile(r"0[xX][0-9a-fA-F]+"), 16),
    (re.compile(r"0[oO][0-7]+"), 8),
    (re.compile(r"0[bB][01]+"), 2),
)


def js_trim(value: str) -> str:
    return value.strip(JS_WHITESPACE)


def js_string(value: Any) -> str:
    """String(value) for the JSON values an answer can hold."""
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, int):
        return str(value)
    if isinstance(value, float):
        if math.isnan(value):
            return "NaN"
        if math.isinf(value):
            return "Infinity" if value > 0 else "-Infinity"
        if value.is_integer() and abs(value) < 1e21:
            return str(int(value))
        return repr(value)
    if isinstance(value, list):
        # [1, null, "a"].toString() is "1,,a"
        return ",".join("" if item is None else js_string(item) for item in value)
    if isinstance(value, dict):
        return "[object Object]"
    return str(value)


def js_number(value: str) -> float:
    """Number(value) for a string: NaN when JavaScript would give NaN."""
    text = js_trim(value)
    if text == "":
        return 0.0
    if _DECIMAL.fullmatch(text):
        return float(text.replace("Infinity", "inf"))
    for pattern, radix in _RADIX:
        if pattern.fullmatch(text):
            return float(int(text[2:], radix))
    return math.nan


def to_trimmed_string_array(value: Any) -> list[str]:
    if isinstance(value, list):
        items = (item if isinstance(item, str) else ("" if item is None else js_string(item)) for item in value)
        return [trimmed for trimmed in (js_trim(item) for item in items) if trimmed != ""]
    if isinstance(value, str):
        trimmed = js_trim(value)
        return [trimmed] if trimmed else []
    return []


@dataclass(frozen=True)
class Question:
    id: str
    type: str
    points: float
    correct_answer: Any
    options: tuple[str, ...] = ()
    negative_marks: float = 0.0
    allow_partial_marking: bool = False


@dataclass(frozen=True)
class Graded:
    # None for SKETCH: a teacher grades those
    is_correct: bool | None
    points_awarded: float


def grade(question: Question, answer: Any) -> Graded:
    negative = -(question.negative_marks or 0)

    if question.type == "SKETCH":
        return Graded(None, 0)

    if question.type == "SCQ":
        correct = next(iter(to_trimmed_string_array(question.correct_answer)), "")
        given = js_trim(answer) if isinstance(answer, str) else ""
        is_correct = given != "" and given == correct
        attempted = given != ""
        return Graded(is_correct, question.points if is_correct else (negative if attempted else 0))

    if question.type == "MCQ":
        correct_arr = to_trimmed_string_array(question.correct_answer)
        selected_arr = to_trimmed_string_array(answer)
        if not selected_arr:
            return Graded(False, 0)
        correct_set, selected_set = set(correct_arr), set(selected_arr)
        has_incorrect = any(s not in correct_set for s in selected_arr)
        has_all_correct = all(c in selected_set for c in correct_arr)
        if not has_incorrect and has_all_correct and len(selected_arr) == len(correct_arr):
            return Graded(True, question.points)
        if question.allow_partial_marking and not has_incorrect:
            return Graded(False, len(selected_arr) / len(correct_arr) * question.points)
        return Graded(False, negative)

    if question.type == "NUMERIC":
        correct_arr = to_trimmed_string_array(question.correct_answer)
        given = js_trim(answer if isinstance(answer, str) else "")
        attempted = given != ""
        is_correct = False
        if attempted:
            if len(correct_arr) > 1:
                low, high, number = js_number(correct_arr[0]), js_number(correct_arr[1]), js_number(given)
                if not (math.isnan(number) or math.isnan(low) or math.isnan(high)):
                    is_correct = low <= number <= high
            else:
                is_correct = given.lower() == next(iter(correct_arr), "").lower()
        return Graded(is_correct, question.points if is_correct else (negative if attempted else 0))

    # Types the app doesn't grade (MULTIPLE_RESPONSE) score nothing there either
    return Graded(False, 0)
