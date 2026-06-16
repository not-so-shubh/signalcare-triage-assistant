from app.models import PatientCase, SymptomAnswer
from app.question_engine import get_next_questions


def test_adaptive_questions_differ_by_complaint():
    chest = get_next_questions(PatientCase(primary_complaint="Chest pain"))
    headache = get_next_questions(PatientCase(primary_complaint="Headache"))

    chest_ids = {question.id for question in chest.questions}
    headache_ids = {question.id for question in headache.questions}

    assert chest.category == "chest_pain"
    assert headache.category == "headache"
    assert chest_ids != headache_ids
    assert "chest_radiation" in chest_ids
    assert "headache_sudden" in headache_ids


def test_question_engine_skips_answered_questions():
    case = PatientCase(
        primary_complaint="Breathing difficulty",
        answers=[SymptomAnswer(id="breathing_blue_lips", answer=False, maps_to="blue_lips")],
    )

    response = get_next_questions(case)
    ids = {question.id for question in response.questions}

    assert "breathing_blue_lips" not in ids
    assert response.category == "breathing"
