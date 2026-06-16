from __future__ import annotations

from typing import Dict, List

from app.models import PatientCase, SymptomAnswer, UrgencyTier


def answer(
    id: str,
    answer_value: object,
    maps_to: str,
    question: str = "",
    red_flag_related: bool = True,
    answer_type: str = "yes_no",
) -> SymptomAnswer:
    return SymptomAnswer(
        id=id,
        question=question or id.replace("_", " "),
        answer=answer_value,
        answer_type=answer_type,  # type: ignore[arg-type]
        maps_to=maps_to,
        red_flag_related=red_flag_related,
    )


DEMO_CASES: List[Dict[str, object]] = [
    {
        "id": "emergency_chest_arm_sob",
        "name": "Chest pain with left arm pain and shortness of breath",
        "expected_tier": "EMERGENCY_NOW",
        "case": PatientCase(
            primary_complaint="Chest pain",
            duration="30 minutes",
            severity=8,
            onset="sudden",
            associated_symptoms=["left arm pain", "shortness of breath", "sweating"],
            age=58,
            sex="male",
            medical_history=["high blood pressure"],
        ),
    },
    {
        "id": "emergency_worst_headache",
        "name": "Sudden worst headache",
        "expected_tier": "EMERGENCY_NOW",
        "case": PatientCase(
            primary_complaint="Sudden worst headache of life",
            duration="10 minutes",
            severity=10,
            onset="sudden",
            associated_symptoms=["neck pain"],
            age=42,
        ),
    },
    {
        "id": "emergency_stroke_fast",
        "name": "Face drooping with slurred speech",
        "expected_tier": "EMERGENCY_NOW",
        "case": PatientCase(
            primary_complaint="Possible stroke symptoms",
            duration="45 minutes",
            onset="sudden",
            associated_symptoms=["face drooping", "slurred speech", "arm weakness"],
            age=70,
        ),
    },
    {
        "id": "emergency_breathing_blue_lips",
        "name": "Severe breathing difficulty with blue lips",
        "expected_tier": "EMERGENCY_NOW",
        "case": PatientCase(
            primary_complaint="Breathing difficulty",
            duration="20 minutes",
            severity=9,
            associated_symptoms=["blue lips", "unable to speak full sentences"],
            medical_history=["asthma"],
        ),
    },
    {
        "id": "emergency_fever_confusion_stiff_neck",
        "name": "Fever with confusion and stiff neck",
        "expected_tier": "EMERGENCY_NOW",
        "case": PatientCase(
            primary_complaint="High fever",
            duration="1 day",
            severity=7,
            associated_symptoms=["confusion", "stiff neck"],
            age=34,
        ),
    },
    {
        "id": "emergency_severe_bleeding",
        "name": "Severe bleeding after injury",
        "expected_tier": "EMERGENCY_NOW",
        "case": PatientCase(
            primary_complaint="Deep cut after injury",
            duration="just now",
            severity=8,
            associated_symptoms=["severe bleeding", "bleeding won't stop"],
        ),
    },
    {
        "id": "mild_chest_burning",
        "name": "Mild chest burning after spicy food",
        "expected_tier": "SELF_CARE",
        "case": PatientCase(
            primary_complaint="Mild chest burning after spicy food",
            duration="2 hours",
            severity=3,
            onset="gradual after dinner",
            associated_symptoms=["sour taste"],
            answers=[
                answer("chest_radiation", False, "radiation"),
                answer("chest_shortness_breath", False, "shortness_of_breath"),
                answer("chest_sweating", False, "sweating"),
                answer("chest_fainting", False, "fainting"),
            ],
        ),
    },
    {
        "id": "mild_screen_headache",
        "name": "Mild headache after screen use",
        "expected_tier": "SELF_CARE",
        "case": PatientCase(
            primary_complaint="Mild headache after screen use",
            duration="4 hours",
            severity=3,
            onset="gradual",
            associated_symptoms=["eye strain"],
            answers=[
                answer("headache_sudden", False, "sudden_onset"),
                answer("headache_worst", False, "worst_headache"),
                answer("headache_neuro", False, "neuro_symptoms"),
                answer("headache_stiff_neck", False, "stiff_neck"),
                answer("headache_head_injury", False, "head_injury"),
            ],
        ),
    },
    {
        "id": "sore_throat_mild_fever",
        "name": "Sore throat and mild fever with stable breathing",
        "expected_tier": "SELF_CARE",
        "case": PatientCase(
            primary_complaint="Sore throat with mild fever",
            duration="2 days",
            severity=3,
            associated_symptoms=["runny nose"],
            answers=[
                answer("fever_confusion", False, "confusion"),
                answer("fever_rash", False, "rash"),
                answer("fever_stiff_neck", False, "stiff_neck"),
                answer("fever_breathing", False, "breathing_difficulty"),
                answer("fever_dehydration", False, "dehydration"),
            ],
        ),
    },
    {
        "id": "abdominal_pain_vomiting",
        "name": "Abdominal pain with persistent vomiting",
        "expected_tier": "AE_TODAY",
        "case": PatientCase(
            primary_complaint="Abdominal pain",
            duration="36 hours",
            severity=7,
            associated_symptoms=["persistent vomiting", "getting worse"],
            answers=[
                answer("abdominal_blood", False, "blood"),
                answer("abdominal_pregnancy", False, "pregnancy_possible"),
            ],
        ),
    },
    {
        "id": "cough_two_weeks",
        "name": "Cough for two weeks without breathing difficulty",
        "expected_tier": "GP_ROUTINE",
        "case": PatientCase(
            primary_complaint="Cough",
            duration="14 days",
            severity=3,
            associated_symptoms=["tiredness"],
            answers=[answer("general_breathing", False, "breathing_difficulty")],
        ),
    },
    {
        "id": "minor_ankle_sprain",
        "name": "Minor ankle sprain, able to walk",
        "expected_tier": "SELF_CARE",
        "case": PatientCase(
            primary_complaint="Ankle sprain after twisting foot",
            duration="1 day",
            severity=4,
            associated_symptoms=["mild swelling"],
            answers=[
                answer("injury_deformity", False, "deformity"),
                answer("injury_head", False, "head_injury"),
                answer("injury_walk", True, "ability_to_move", red_flag_related=False),
            ],
        ),
    },
]


def get_demo_cases() -> List[Dict[str, object]]:
    return DEMO_CASES


def expected_tier(case_entry: Dict[str, object]) -> UrgencyTier:
    return case_entry["expected_tier"]  # type: ignore[return-value]
