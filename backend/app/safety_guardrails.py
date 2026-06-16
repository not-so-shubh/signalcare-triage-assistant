from __future__ import annotations

import re
from typing import Iterable, List, Optional

from app.models import PatientCase, SymptomAnswer


EMERGENCY_TIER = "EMERGENCY_NOW"

SYNONYM_MAP = {
    "seene me dard": "chest pain",
    "seene mein dard": "chest pain",
    "chati me dard": "chest pain",
    "chhati me dard": "chest pain",
    "left haath pain": "left arm pain",
    "left hath pain": "left arm pain",
    "baaye haath dard": "left arm pain",
    "saans phoolna": "shortness of breath",
    "saans fulna": "shortness of breath",
    "saans lene me dikkat": "shortness of breath",
    "sir dard": "headache",
    "sar dard": "headache",
    "bolne me dikkat": "speech difficulty",
    "bolne mein dikkat": "speech difficulty",
    "zubaan ladkhadana": "slurred speech",
    "chehra latakna": "face drooping",
    "munh tedha": "face drooping",
}

NEGATION_WORDS = ("no", "not", "without", "denies", "deny", "never", "none")
INVERTED_FALSE_POSITIVES = {
    "full_sentences": "unable to speak full sentences",
    "ability_to_move": "unable to move",
}


def normalize_text(value: object) -> str:
    text = str(value or "").lower()
    text = text.replace("_", " ").replace("-", " ")
    for phrase, canonical in sorted(SYNONYM_MAP.items(), key=lambda item: len(item[0]), reverse=True):
        text = re.sub(rf"\b{re.escape(phrase)}\b", canonical, text)
    text = re.sub(r"[^a-z0-9.+/ ]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def answer_is_positive(answer: object) -> bool:
    if isinstance(answer, bool):
        return answer
    if isinstance(answer, (int, float)):
        return answer > 0
    if isinstance(answer, list):
        return len(answer) > 0
    if isinstance(answer, str):
        normalized = normalize_text(answer)
        if not normalized:
            return False
        return not any(
            normalized == word or normalized.startswith(f"{word} ")
            for word in (*NEGATION_WORDS, "false", "n/a", "na")
        )
    return answer is not None


def _answer_fragments(answer: SymptomAnswer) -> List[str]:
    if answer.answer is False and answer.maps_to in INVERTED_FALSE_POSITIVES:
        return [INVERTED_FALSE_POSITIVES[answer.maps_to]]
    if not answer_is_positive(answer.answer):
        return []
    fragments: List[str] = []
    if answer.maps_to:
        fragments.append(answer.maps_to)
    if isinstance(answer.answer, list):
        fragments.extend(str(item) for item in answer.answer)
    elif isinstance(answer.answer, str):
        fragments.append(answer.answer)
    elif isinstance(answer.answer, bool) and answer.answer and answer.question:
        fragments.append(answer.question)
    return fragments


def collect_positive_fragments(case: PatientCase) -> List[str]:
    fragments: List[str] = [
        case.primary_complaint,
        case.duration or "",
        case.onset or "",
        case.free_text_notes or "",
        *(case.associated_symptoms or []),
        *(case.red_flags or []),
        *(case.medical_history or []),
    ]
    for answer in case.answers or []:
        fragments.extend(_answer_fragments(answer))
    return [fragment for fragment in fragments if normalize_text(fragment)]


def collect_normalized_text(case: PatientCase) -> str:
    return normalize_text(" ".join(collect_positive_fragments(case)))


def _is_negated(text: str, start_index: int) -> bool:
    prefix = text[max(0, start_index - 48) : start_index]
    return bool(re.search(r"\b(no|not|without|denies|deny|never|none)\s+(\w+\s+){0,4}$", prefix))


def matching_terms(text: str, terms: Iterable[str]) -> List[str]:
    normalized_text = normalize_text(text)
    found: List[str] = []
    for term in terms:
        normalized_term = normalize_text(term)
        if not normalized_term:
            continue
        pattern = rf"\b{re.escape(normalized_term)}\b"
        for match in re.finditer(pattern, normalized_text):
            if not _is_negated(normalized_text, match.start()):
                found.append(normalized_term)
                break
    return sorted(set(found))


def has_any(text: str, terms: Iterable[str]) -> bool:
    return bool(matching_terms(text, terms))


def _emergency(
    reason: str,
    matched_rule: str,
    evidence: List[str],
) -> dict:
    return {
        "tier": EMERGENCY_TIER,
        "reason": reason,
        "matched_rule": matched_rule,
        "evidence": sorted(set(evidence)),
    }


def check_emergency_guardrails(case: PatientCase) -> Optional[dict]:
    """Return an emergency override when deterministic red-flag logic matches."""

    text = collect_normalized_text(case)
    severity = case.severity or 0

    chest_terms = [
        "chest pain",
        "chest pressure",
        "chest tightness",
        "chest heaviness",
        "chest burning",
    ]
    chest_danger_terms = [
        "left arm pain",
        "right arm pain",
        "arm pain",
        "jaw pain",
        "neck pain",
        "back pain",
        "shortness of breath",
        "breathing difficulty",
        "sweating",
        "cold sweat",
        "fainting",
        "passed out",
        "syncope",
    ]
    chest_matches = matching_terms(text, chest_terms)
    chest_danger_matches = matching_terms(text, chest_danger_terms)
    if chest_matches and chest_danger_matches:
        return _emergency(
            "Chest discomfort with radiation or cardiopulmonary red flags requires emergency assessment.",
            "chest_pain_with_radiation_or_shortness_of_breath",
            chest_matches + chest_danger_matches,
        )

    stroke_terms = [
        "face drooping",
        "arm weakness",
        "slurred speech",
        "speech difficulty",
        "sudden one sided weakness",
        "one sided weakness",
        "sudden confusion",
        "sudden vision loss",
        "vision loss",
        "facial droop",
        "weakness on one side",
    ]
    stroke_matches = matching_terms(text, stroke_terms)
    if stroke_matches:
        return _emergency(
            "Stroke-like symptoms are time-critical and require emergency services now.",
            "stroke_fast_symptoms",
            stroke_matches,
        )

    headache_terms = ["headache", "head pain"]
    headache_danger_terms = [
        "sudden severe headache",
        "worst headache",
        "worst headache of life",
        "thunderclap headache",
        "seizure",
        "weakness",
        "confusion",
        "vision loss",
        "stiff neck",
        "high fever",
        "rash",
        "head injury",
        "after head injury",
    ]
    headache_matches = matching_terms(text, headache_terms)
    headache_danger_matches = matching_terms(text, headache_danger_terms)
    if headache_matches and headache_danger_matches:
        return _emergency(
            "Headache with sudden onset, neurological symptoms, infection signs, seizure, rash, or injury is an emergency warning pattern.",
            "dangerous_headache_red_flags",
            headache_matches + headache_danger_matches,
        )
    if has_any(text, ["sudden severe headache", "worst headache", "thunderclap headache"]):
        return _emergency(
            "A sudden severe or worst-ever headache can indicate a time-critical emergency.",
            "sudden_worst_headache",
            matching_terms(text, ["sudden severe headache", "worst headache", "thunderclap headache"]),
        )

    breathing_terms = ["shortness of breath", "breathing difficulty", "difficulty breathing", "breathless"]
    breathing_danger_terms = [
        "severe breathing difficulty",
        "blue lips",
        "blue face",
        "unable to speak full sentences",
        "cannot speak full sentences",
        "cant speak full sentences",
        "collapse",
        "collapsed",
        "unresponsive",
    ]
    breathing_matches = matching_terms(text, breathing_terms)
    breathing_danger_matches = matching_terms(text, breathing_danger_terms)
    if breathing_danger_matches or (breathing_matches and severity >= 8):
        evidence = breathing_danger_matches + breathing_matches
        if severity >= 8:
            evidence.append(f"severity {severity}/10")
        return _emergency(
            "Severe breathing difficulty, cyanosis, collapse, or inability to speak full sentences requires emergency care.",
            "severe_breathing_compromise",
            evidence,
        )

    fever_terms = ["fever", "temperature", "high temperature"]
    fever_danger_terms = ["confusion", "stiff neck", "non blanching rash", "purple rash", "seizure", "unresponsive"]
    fever_matches = matching_terms(text, fever_terms)
    fever_danger_matches = matching_terms(text, fever_danger_terms)
    if fever_matches and fever_danger_matches:
        return _emergency(
            "Fever with confusion, stiff neck, seizure, unresponsiveness, or concerning rash can indicate serious infection.",
            "fever_with_sepsis_or_meningitis_warning_signs",
            fever_matches + fever_danger_matches,
        )

    bleeding_matches = matching_terms(
        text,
        [
            "severe bleeding",
            "heavy bleeding",
            "uncontrolled bleeding",
            "spurting blood",
            "blood spurting",
            "bleeding wont stop",
        ],
    )
    seizure_or_loc_matches = matching_terms(
        text,
        ["seizure", "loss of consciousness", "lost consciousness", "passed out", "unresponsive", "collapse"],
    )
    if bleeding_matches:
        return _emergency(
            "Severe or uncontrolled bleeding requires emergency services now.",
            "severe_bleeding",
            bleeding_matches,
        )
    if seizure_or_loc_matches:
        return _emergency(
            "Seizure, loss of consciousness, collapse, or unresponsiveness requires emergency services now.",
            "seizure_or_loss_of_consciousness",
            seizure_or_loc_matches,
        )

    anaphylaxis_matches = matching_terms(
        text,
        [
            "anaphylaxis",
            "throat swelling",
            "tongue swelling",
            "lip swelling",
            "wheezing after allergen",
            "allergic reaction with breathing difficulty",
        ],
    )
    hives_matches = matching_terms(text, ["hives", "widespread rash"])
    if anaphylaxis_matches or (hives_matches and breathing_matches):
        return _emergency(
            "Possible anaphylaxis with airway or breathing symptoms requires emergency services now.",
            "anaphylaxis_airway_breathing_symptoms",
            anaphylaxis_matches + hives_matches + breathing_matches,
        )

    return None
