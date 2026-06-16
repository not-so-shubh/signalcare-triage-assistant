from app.demo_cases import DEMO_CASES
from app.summary_generator import generate_provider_summary
from app.triage_engine import assess_urgency


def test_provider_summary_includes_required_fields():
    demo = DEMO_CASES[0]
    result = assess_urgency(demo["case"])
    summary = generate_provider_summary(demo["case"], result)

    assert summary.presenting_complaint
    assert summary.timeline
    assert summary.severity
    assert summary.medications_allergies is not None
    assert summary.ai_urgency_assessment
    assert summary.reasoning_decision_trace
    assert summary.recommended_care_pathway
    assert summary.provider_facing_summary
    assert summary.safety_disclaimer


def test_provider_summary_captures_relevant_negatives():
    demo = next(item for item in DEMO_CASES if item["id"] == "mild_chest_burning")
    result = assess_urgency(demo["case"])
    summary = generate_provider_summary(demo["case"], result)

    assert "shortness_of_breath" in summary.relevant_negatives
    assert "radiation" in summary.relevant_negatives
