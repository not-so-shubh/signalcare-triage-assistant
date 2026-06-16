from __future__ import annotations

from typing import List

from app.models import PatientCase, ProviderSummary, SymptomAnswer, TriageResult
from app.safety_guardrails import answer_is_positive


INVERTED_FALSE_POSITIVES = {"full_sentences", "ability_to_move"}


DISCLAIMER = (
    "Educational prototype only. It does not diagnose, does not replace a clinician, "
    "and emergency symptoms require immediate professional help."
)


def _format_unknown(value: object, fallback: str = "Not provided") -> str:
    if value is None or value == "" or value == []:
        return fallback
    return str(value)


def _relevant_negatives(answers: List[SymptomAnswer]) -> List[str]:
    negatives: List[str] = []
    for answer in answers:
        if answer.maps_to in INVERTED_FALSE_POSITIVES and answer.answer is False:
            continue
        if answer.answer is False:
            negatives.append(answer.maps_to or answer.question or answer.id)
        elif isinstance(answer.answer, str) and not answer_is_positive(answer.answer):
            negatives.append(answer.maps_to or answer.question or answer.id)
        elif isinstance(answer.answer, list) and not answer.answer:
            negatives.append(answer.maps_to or answer.question or answer.id)
    return sorted(set(item for item in negatives if item))


def generate_provider_summary(case: PatientCase, result: TriageResult) -> ProviderSummary:
    timeline_parts = []
    if case.duration:
        timeline_parts.append(f"Duration: {case.duration}")
    if case.onset:
        timeline_parts.append(f"Onset: {case.onset}")
    timeline = "; ".join(timeline_parts) if timeline_parts else "Not provided"

    severity = f"{case.severity}/10" if case.severity is not None else "Not provided"
    relevant_negatives = _relevant_negatives(case.answers)
    associated = case.associated_symptoms or []

    demographics = []
    if case.age is not None:
        demographics.append(f"age {case.age}")
    if case.sex:
        demographics.append(f"sex {case.sex}")
    if case.pregnancy_status:
        demographics.append(f"pregnancy status {case.pregnancy_status}")
    demo_text = ", ".join(demographics) if demographics else "demographics not provided"

    plain = (
        f"The patient reports {case.primary_complaint or 'an unspecified complaint'} "
        f"with severity {severity}. Current educational triage tier is {result.tier}: "
        f"{result.recommendation}"
    )

    provider = (
        f"Presenting complaint: {_format_unknown(case.primary_complaint)}. "
        f"Timeline: {timeline}. Severity: {severity}. "
        f"Associated symptoms: {', '.join(associated) if associated else 'none documented'}. "
        f"Relevant negatives: {', '.join(relevant_negatives) if relevant_negatives else 'none documented'}. "
        f"History: {', '.join(case.medical_history) if case.medical_history else 'none documented'}. "
        f"Medications: {', '.join(case.medications) if case.medications else 'none documented'}. "
        f"Allergies: {', '.join(case.allergies) if case.allergies else 'none documented'}. "
        f"Demographics: {demo_text}. "
        f"AI urgency assessment: {result.tier}. Reasoning: {'; '.join(result.reasoning)}"
    )

    return ProviderSummary(
        presenting_complaint=_format_unknown(case.primary_complaint),
        timeline=timeline,
        severity=severity,
        associated_symptoms=associated,
        relevant_negatives=relevant_negatives,
        medical_history=case.medical_history,
        medications_allergies={
            "medications": case.medications,
            "allergies": case.allergies,
        },
        red_flags=sorted(set([*(case.red_flags or []), *(result.red_flags or [])])),
        ai_urgency_assessment=f"{result.tier} - {result.title}",
        reasoning_decision_trace=result.decision_trace,
        recommended_care_pathway=result.care_pathway,
        matched_safety_rules=result.matched_rules,
        plain_english_summary=plain,
        provider_facing_summary=provider,
        safety_disclaimer=DISCLAIMER,
    )
