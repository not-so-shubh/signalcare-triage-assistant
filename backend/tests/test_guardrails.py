from app.models import PatientCase
from app.safety_guardrails import check_emergency_guardrails


def test_chest_pain_guardrail_matches_hinglish_synonyms():
    case = PatientCase(
        primary_complaint="seene me dard",
        associated_symptoms=["left haath pain", "saans phoolna"],
    )

    result = check_emergency_guardrails(case)

    assert result is not None
    assert result["tier"] == "EMERGENCY_NOW"
    assert result["matched_rule"] == "chest_pain_with_radiation_or_shortness_of_breath"


def test_mild_chest_burning_without_red_flags_does_not_match_guardrail():
    case = PatientCase(
        primary_complaint="mild chest burning after spicy food",
        severity=3,
        free_text_notes="No shortness of breath, no arm pain, no sweating, no fainting.",
    )

    assert check_emergency_guardrails(case) is None
