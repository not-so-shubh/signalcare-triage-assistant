from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List


RULE_DIR = Path(__file__).resolve().parent / "rules"


@lru_cache(maxsize=16)
def load_rule_file(filename: str) -> Dict[str, Any]:
    path = RULE_DIR / filename
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def load_care_pathways() -> Dict[str, Any]:
    return load_rule_file("care_pathways.json")


def load_red_flags() -> Dict[str, List[Dict[str, Any]]]:
    return load_rule_file("red_flags.json")


def load_symptom_questions() -> Dict[str, List[Dict[str, Any]]]:
    return load_rule_file("symptom_questions.json")
