from app.demo_cases import DEMO_CASES
from app.models import PatientCase
from app.triage_engine import assess_urgency


def test_all_emergency_demo_cases_classify_emergency_now():
    for demo in DEMO_CASES:
        if demo["expected_tier"] == "EMERGENCY_NOW":
            result = assess_urgency(demo["case"])
            assert result.tier == "EMERGENCY_NOW", demo["name"]


def test_mild_similar_cases_do_not_classify_as_emergency():
    mild_ids = {"mild_chest_burning", "mild_screen_headache", "sore_throat_mild_fever"}
    for demo in DEMO_CASES:
        if demo["id"] in mild_ids:
            result = assess_urgency(demo["case"])
            assert result.tier != "EMERGENCY_NOW", demo["name"]


def test_demo_expected_tiers_pass():
    for demo in DEMO_CASES:
        result = assess_urgency(demo["case"])
        assert result.tier == demo["expected_tier"], demo["name"]


def test_uncertainty_escalates_serious_complaint():
    result = assess_urgency(PatientCase(primary_complaint="Chest pain"))

    assert result.tier in {"AE_TODAY", "GP_URGENT"}
    assert result.confidence == "low"
    assert "missing_critical_answers_conservative_escalation" in result.matched_rules
