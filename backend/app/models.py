from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional, Union
from uuid import uuid4

from pydantic import BaseModel, Field


UrgencyTier = Literal[
    "EMERGENCY_NOW",
    "AE_TODAY",
    "GP_URGENT",
    "GP_ROUTINE",
    "SELF_CARE",
]

AnswerValue = Union[str, int, float, bool, List[str], None]
AnswerType = Literal["yes_no", "scale", "text", "multi_select"]


class SymptomAnswer(BaseModel):
    id: str
    question: Optional[str] = None
    answer: AnswerValue = None
    answer_type: Optional[AnswerType] = None
    maps_to: Optional[str] = None
    red_flag_related: bool = False
    category: Optional[str] = None


class PatientCase(BaseModel):
    session_id: str = Field(default_factory=lambda: str(uuid4()))
    primary_complaint: str = ""
    duration: Optional[str] = None
    severity: Optional[int] = Field(default=None, ge=0, le=10)
    onset: Optional[str] = None
    associated_symptoms: List[str] = Field(default_factory=list)
    age: Optional[int] = Field(default=None, ge=0, le=130)
    sex: Optional[str] = None
    medical_history: List[str] = Field(default_factory=list)
    medications: List[str] = Field(default_factory=list)
    allergies: List[str] = Field(default_factory=list)
    pregnancy_status: Optional[str] = None
    answers: List[SymptomAnswer] = Field(default_factory=list)
    red_flags: List[str] = Field(default_factory=list)
    free_text_notes: Optional[str] = None


class TriageRequest(BaseModel):
    case: PatientCase


class QuestionItem(BaseModel):
    id: str
    text: str
    answer_type: AnswerType
    priority: int
    red_flag_related: bool
    maps_to: str
    options: Optional[List[str]] = None


class QuestionResponse(BaseModel):
    category: str
    questions: List[QuestionItem]
    explanation: str


class DecisionTraceStep(BaseModel):
    step: int
    label: str
    details: str
    evidence: List[str] = Field(default_factory=list)


class TriageResult(BaseModel):
    tier: UrgencyTier
    title: str
    recommendation: str
    reasoning: List[str]
    confidence: Literal["high", "medium", "low"]
    matched_rules: List[str] = Field(default_factory=list)
    red_flags: List[str] = Field(default_factory=list)
    decision_trace: List[DecisionTraceStep] = Field(default_factory=list)
    care_pathway: Dict[str, Any]


class ProviderSummary(BaseModel):
    presenting_complaint: str
    timeline: str
    severity: str
    associated_symptoms: List[str]
    relevant_negatives: List[str]
    medical_history: List[str]
    medications_allergies: Dict[str, List[str]]
    red_flags: List[str]
    ai_urgency_assessment: str
    reasoning_decision_trace: List[DecisionTraceStep]
    recommended_care_pathway: Dict[str, Any]
    matched_safety_rules: List[str]
    plain_english_summary: str
    provider_facing_summary: str
    safety_disclaimer: str


class SummaryRequest(BaseModel):
    case: PatientCase
    result: TriageResult


class DemoCaseResult(BaseModel):
    id: str
    name: str
    expected_tier: UrgencyTier
    actual_tier: UrgencyTier
    passed: bool
    guardrail_override: bool
    summary_complete: bool
    result: TriageResult
    summary: ProviderSummary
