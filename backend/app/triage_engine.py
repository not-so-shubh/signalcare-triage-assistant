from __future__ import annotations

import re
from typing import List, Tuple

from app.models import DecisionTraceStep, PatientCase, TriageResult, UrgencyTier
from app.question_engine import detect_category
from app.rule_loader import load_care_pathways
from app.safety_guardrails import (
    check_emergency_guardrails,
    collect_normalized_text,
    has_any,
    matching_terms,
)


SERIOUS_CATEGORIES = {"chest_pain", "headache", "neurological", "breathing", "fever_infection", "abdominal_pain"}
HIGH_RISK_HISTORY_TERMS = [
    "heart disease",
    "heart attack",
    "stroke",
    "diabetes",
    "immunosuppressed",
    "immune compromise",
    "cancer",
    "chemotherapy",
    "copd",
    "asthma",
    "kidney disease",
    "pregnant",
]

CRITICAL_MAPS = {
    "chest_pain": {"radiation", "shortness_of_breath", "sweating", "fainting", "onset", "severity"},
    "headache": {"sudden_onset", "worst_headache", "neuro_symptoms", "fever", "stiff_neck", "head_injury"},
    "neurological": {"face_drooping", "arm_weakness", "speech_difficulty", "onset"},
    "breathing": {"blue_lips", "full_sentences", "chest_pain", "asthma_copd", "duration", "severity"},
    "fever_infection": {"temperature", "duration", "confusion", "rash", "stiff_neck", "breathing_difficulty"},
    "abdominal_pain": {"location", "vomiting", "blood", "pregnancy_possible", "fever", "worsening"},
    "injury_bleeding": {"mechanism", "bleeding_severity", "deformity", "head_injury", "loss_of_consciousness"},
}


def _trace(step: int, label: str, details: str, evidence: List[str] | None = None) -> DecisionTraceStep:
    return DecisionTraceStep(step=step, label=label, details=details, evidence=evidence or [])


def _answered_maps(case: PatientCase) -> set[str]:
    maps = {answer.maps_to for answer in case.answers if answer.maps_to}
    if case.duration:
        maps.add("duration")
    if case.severity is not None:
        maps.add("severity")
    if case.onset:
        maps.add("onset")
    return maps


def _duration_days(case: PatientCase) -> int | None:
    duration = " ".join([case.duration or "", case.free_text_notes or ""]).lower()
    match = re.search(r"(\d+)\s*(day|days|week|weeks|month|months)", duration)
    if not match:
        return None
    value = int(match.group(1))
    unit = match.group(2)
    if unit.startswith("day"):
        return value
    if unit.startswith("week"):
        return value * 7
    return value * 30


def _has_persistent_duration(case: PatientCase) -> bool:
    days = _duration_days(case)
    if days is not None and days >= 7:
        return True
    text = collect_normalized_text(case)
    return has_any(text, ["weeks", "months", "persistent", "ongoing", "not improving"])


def _has_short_mild_pattern(case: PatientCase, text: str) -> bool:
    severity = case.severity if case.severity is not None else 0
    if severity > 4:
        return False
    if has_any(text, ["severe", "worsening quickly", "rapidly worse", "blood", "fainting", "confusion"]):
        return False
    days = _duration_days(case)
    return days is None or days <= 3


def _high_risk_evidence(case: PatientCase, text: str) -> List[str]:
    evidence: List[str] = []
    if case.age is not None and case.age >= 65:
        evidence.append(f"age {case.age}")
    if case.pregnancy_status and "preg" in case.pregnancy_status.lower():
        evidence.append("pregnancy")
    evidence.extend(matching_terms(text, HIGH_RISK_HISTORY_TERMS))
    return sorted(set(evidence))


def _missing_critical_answers(case: PatientCase, category: str) -> Tuple[bool, List[str]]:
    if category not in SERIOUS_CATEGORIES:
        return False, []
    required = CRITICAL_MAPS.get(category, set())
    answered = _answered_maps(case)
    missing = sorted(required - answered)

    if category in {"chest_pain", "breathing", "neurological"}:
        return len(required - answered) >= 3, missing
    return len(required - answered) >= 4 and len(answered & required) <= 1, missing


def _select_tier(score: int, category: str, persistent: bool, short_mild: bool) -> UrgencyTier:
    if score >= 6:
        return "AE_TODAY"
    if score >= 3:
        return "GP_URGENT"
    if category in {"chest_pain", "breathing"} and score >= 2:
        return "GP_URGENT"
    if persistent:
        return "GP_ROUTINE"
    if short_mild:
        return "SELF_CARE"
    return "GP_ROUTINE"


def assess_urgency(case: PatientCase) -> TriageResult:
    pathways = load_care_pathways()
    category = detect_category(case)
    text = collect_normalized_text(case)
    trace: List[DecisionTraceStep] = [
        _trace(1, "Primary complaint detected", f"Detected complaint category: {category}.", [case.primary_complaint]),
        _trace(2, "Symptoms normalized", "Patient language and common informal phrases were normalized for deterministic matching.", [text]),
    ]

    guardrail = check_emergency_guardrails(case)
    if guardrail:
        tier: UrgencyTier = "EMERGENCY_NOW"
        trace.append(
            _trace(
                3,
                "Emergency guardrail matched",
                guardrail["reason"],
                guardrail.get("evidence", []),
            )
        )
        trace.append(_trace(4, "Urgency selected", "Hard safety override selected EMERGENCY_NOW."))
        pathway = pathways[tier]
        return TriageResult(
            tier=tier,
            title=pathway["label"],
            recommendation=pathway["urgency_message"],
            reasoning=[guardrail["reason"], "Emergency guardrails override all lower-acuity scoring."],
            confidence="high",
            matched_rules=[guardrail["matched_rule"]],
            red_flags=guardrail.get("evidence", []),
            decision_trace=trace,
            care_pathway=pathway,
        )

    trace.append(_trace(3, "Guardrails checked", "No hard emergency override matched.", []))

    score = 0
    reasoning: List[str] = []
    matched_rules: List[str] = []
    red_flags: List[str] = []
    severity = case.severity or 0

    if severity >= 8:
        score += 4
        reasoning.append("Severe pain or symptom intensity was reported.")
        matched_rules.append("severity_ge_8")
    elif severity >= 6:
        score += 2
        reasoning.append("Moderate-to-severe symptom intensity increases urgency.")
        matched_rules.append("severity_ge_6")

    if has_any(text, ["worsening quickly", "rapidly worse", "rapidly worsening", "getting worse fast", "sudden onset"]):
        score += 2
        reasoning.append("Symptoms are worsening quickly or began suddenly.")
        matched_rules.append("rapid_worsening_or_sudden_onset")

    high_risk = _high_risk_evidence(case, text)
    if high_risk:
        score += 2
        reasoning.append("Relevant high-risk history or patient factor was reported.")
        matched_rules.append("high_risk_history")
        red_flags.extend(high_risk)

    breathing_evidence = matching_terms(text, ["shortness of breath", "breathing difficulty", "wheeze", "breathless"])
    if breathing_evidence:
        score += 3
        reasoning.append("Breathing symptoms increase urgency even when emergency breathing guardrails are not met.")
        matched_rules.append("breathing_symptoms")
        red_flags.extend(breathing_evidence)

    fever_warning = matching_terms(text, ["fever", "high temperature", "temperature"])
    if fever_warning and has_any(text, ["rash", "dehydration", "immune compromise"]):
        score += 3
        reasoning.append("Fever with warning features needs urgent clinical review.")
        matched_rules.append("fever_with_warning_features")
        red_flags.extend(fever_warning)
    elif fever_warning:
        score += 1
        reasoning.append("Fever was reported without hard emergency features.")
        matched_rules.append("fever")

    if category == "abdominal_pain" and has_any(text, ["persistent vomiting", "repeated vomiting", "blood in vomit", "blood in stool"]):
        score += 4
        reasoning.append("Abdominal pain with persistent vomiting or bleeding needs same-day urgent assessment.")
        matched_rules.append("abdominal_pain_with_vomiting_or_blood")

    if category == "injury_bleeding" and has_any(text, ["deformity", "unable to move", "cannot walk", "unable to walk"]):
        score += 3
        reasoning.append("Injury with deformity or reduced function needs urgent assessment.")
        matched_rules.append("injury_function_or_deformity")

    persistent = _has_persistent_duration(case)
    if persistent:
        reasoning.append("Persistent symptoms should be reviewed if they are not improving.")
        matched_rules.append("persistent_symptoms")

    short_mild = _has_short_mild_pattern(case, text)
    missing_critical, missing = _missing_critical_answers(case, category)
    confidence = "medium"
    if missing_critical:
        confidence = "low"
        reasoning.append(
            "Some critical safety answers are missing for this complaint, so the recommendation is conservatively escalated."
        )
        matched_rules.append("missing_critical_answers_conservative_escalation")

    tier = _select_tier(score, category, persistent, short_mild)
    if missing_critical:
        if category in {"chest_pain", "breathing", "neurological"}:
            tier = "AE_TODAY"
        elif tier in {"SELF_CARE", "GP_ROUTINE"}:
            tier = "GP_URGENT"

    if not reasoning:
        reasoning.append("No emergency red flags were identified in the provided information.")

    if tier in {"SELF_CARE", "GP_ROUTINE"} and confidence != "low":
        confidence = "high" if short_mild or persistent else "medium"

    trace.append(
        _trace(
            4,
            "Rule scoring applied",
            f"Non-emergency rule score: {score}. Missing critical answers: {missing_critical}.",
            matched_rules + missing,
        )
    )
    trace.append(_trace(5, "Urgency selected", f"Selected tier: {tier}.", reasoning))

    pathway = pathways[tier]
    return TriageResult(
        tier=tier,
        title=pathway["label"],
        recommendation=pathway["urgency_message"],
        reasoning=reasoning,
        confidence=confidence,
        matched_rules=sorted(set(matched_rules)),
        red_flags=sorted(set([*red_flags, *(case.red_flags or [])])),
        decision_trace=trace,
        care_pathway=pathway,
    )
