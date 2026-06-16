from __future__ import annotations

from typing import Dict, List

from app.models import PatientCase, QuestionItem, QuestionResponse
from app.rule_loader import load_symptom_questions
from app.safety_guardrails import collect_normalized_text, has_any


CATEGORY_EXPLANATIONS: Dict[str, str] = {
    "chest_pain": "Asking this because chest symptoms need fast screening for heart and breathing red flags.",
    "headache": "Asking this because headache urgency depends on sudden onset, neurological signs, infection signs, and injury.",
    "neurological": "Asking this because stroke-like symptoms are time-critical and depend heavily on FAST signs and onset time.",
    "breathing": "Asking this because breathing symptoms can become urgent when speech, color, chest pain, or chronic lung history are involved.",
    "fever_infection": "Asking this because fever needs screening for serious infection, dehydration, breathing difficulty, and immune risk.",
    "abdominal_pain": "Asking this because abdominal pain urgency depends on location, severity, vomiting, bleeding, pregnancy possibility, and worsening.",
    "injury_bleeding": "Asking this because injury urgency depends on mechanism, bleeding, deformity, head injury, consciousness, and function.",
    "general": "Asking this because these details help route care safely when the complaint is still broad.",
}


def detect_category(case: PatientCase) -> str:
    text = collect_normalized_text(case)

    if has_any(
        text,
        [
            "face drooping",
            "arm weakness",
            "slurred speech",
            "speech difficulty",
            "one sided weakness",
            "vision loss",
            "sudden confusion",
            "stroke",
        ],
    ):
        return "neurological"
    if has_any(text, ["chest pain", "chest pressure", "chest tightness", "chest burning", "seene me dard"]):
        return "chest_pain"
    if has_any(text, ["shortness of breath", "breathing difficulty", "difficulty breathing", "breathless", "wheeze"]):
        return "breathing"
    if has_any(text, ["headache", "head pain", "migraine", "sir dard"]):
        return "headache"
    if has_any(text, ["fever", "temperature", "chills", "infection", "sore throat"]):
        return "fever_infection"
    if has_any(text, ["abdominal pain", "stomach pain", "belly pain", "vomiting", "diarrhea"]):
        return "abdominal_pain"
    if has_any(text, ["injury", "fall", "bleeding", "sprain", "fracture", "cut", "wound", "head injury"]):
        return "injury_bleeding"
    return "general"


def _answered_keys(case: PatientCase) -> set[str]:
    keys: set[str] = set()
    for answer in case.answers or []:
        keys.add(answer.id)
        if answer.maps_to:
            keys.add(answer.maps_to)
    if case.duration:
        keys.add("duration")
    if case.severity is not None:
        keys.add("severity")
    if case.onset:
        keys.add("onset")
    if case.age is not None:
        keys.add("age")
    if case.sex:
        keys.add("sex")
    if case.medical_history:
        keys.add("medical_history")
    if case.medications:
        keys.add("medications")
    if case.allergies:
        keys.add("allergies")
    if case.pregnancy_status:
        keys.add("pregnancy_status")
    return keys


def _build_question(raw: dict, category: str) -> QuestionItem:
    return QuestionItem(category=category, **raw)


def get_next_questions(case: PatientCase) -> QuestionResponse:
    question_bank = load_symptom_questions()
    category = detect_category(case)
    answered = _answered_keys(case)

    category_questions = [
        _build_question(item, category)
        for item in question_bank.get(category, [])
        if item["id"] not in answered and item["maps_to"] not in answered
    ]
    category_questions.sort(key=lambda item: (not item.red_flag_related, -item.priority))

    selected: List[QuestionItem] = category_questions[:4]
    if len(selected) < 2 and category != "general":
        general_questions = [
            _build_question(item, "general")
            for item in question_bank.get("general", [])
            if item["id"] not in answered and item["maps_to"] not in answered
        ]
        general_questions.sort(key=lambda item: (not item.red_flag_related, -item.priority))
        selected.extend(general_questions[: 4 - len(selected)])

    return QuestionResponse(
        category=category,
        questions=selected[:4],
        explanation=CATEGORY_EXPLANATIONS.get(category, CATEGORY_EXPLANATIONS["general"]),
    )
