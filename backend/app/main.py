from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.demo_cases import get_demo_cases
from app.models import DemoCaseResult, SummaryRequest, TriageRequest
from app.question_engine import get_next_questions
from app.summary_generator import generate_provider_summary
from app.triage_engine import assess_urgency


app = FastAPI(
    title="SafeCare Triage API",
    description=(
        "Educational prototype for safety-first healthcare triage. "
        "This API does not diagnose and is not a medical device."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "service": "SafeCare Triage",
        "disclaimer": "Educational prototype only; not medical advice.",
    }


@app.post("/api/questions")
def questions(request: TriageRequest):
    return get_next_questions(request.case)


@app.post("/api/triage")
def triage(request: TriageRequest):
    return assess_urgency(request.case)


@app.post("/api/summary")
def summary(request: SummaryRequest):
    return generate_provider_summary(request.case, request.result)


@app.get("/api/demo-cases")
def demo_cases():
    return [
        {
            "id": item["id"],
            "name": item["name"],
            "expected_tier": item["expected_tier"],
            "case": item["case"],
        }
        for item in get_demo_cases()
    ]


def _summary_complete(summary_payload) -> bool:
    required = [
        summary_payload.presenting_complaint,
        summary_payload.timeline,
        summary_payload.severity,
        summary_payload.ai_urgency_assessment,
        summary_payload.provider_facing_summary,
        summary_payload.recommended_care_pathway,
        summary_payload.safety_disclaimer,
    ]
    return all(bool(value) for value in required)


@app.post("/api/demo-cases/run")
def run_demo_cases() -> dict:
    results: list[DemoCaseResult] = []
    emergency_total = 0
    emergency_caught = 0
    guardrail_passed = 0
    non_emergency_total = 0
    differentiated = 0
    summaries_complete = 0

    for item in get_demo_cases():
        case = item["case"]
        expected = item["expected_tier"]
        result = assess_urgency(case)
        summary_payload = generate_provider_summary(case, result)
        passed = result.tier == expected
        guardrail_override = bool(result.matched_rules and result.tier == "EMERGENCY_NOW")
        complete = _summary_complete(summary_payload)

        if expected == "EMERGENCY_NOW":
            emergency_total += 1
            emergency_caught += int(result.tier == "EMERGENCY_NOW")
            guardrail_passed += int(guardrail_override)
        else:
            non_emergency_total += 1
            differentiated += int(passed and result.tier != "EMERGENCY_NOW")
        summaries_complete += int(complete)

        results.append(
            DemoCaseResult(
                id=item["id"],
                name=item["name"],
                expected_tier=expected,
                actual_tier=result.tier,
                passed=passed,
                guardrail_override=guardrail_override,
                summary_complete=complete,
                result=result,
                summary=summary_payload,
            )
        )

    return {
        "metrics": {
            "emergency_cases_caught": {"passed": emergency_caught, "total": emergency_total},
            "guardrail_overrides_passed": {"passed": guardrail_passed, "total": emergency_total},
            "similar_cases_differentiated": {"passed": differentiated, "total": non_emergency_total},
            "provider_summaries_complete": {"passed": summaries_complete, "total": len(results)},
        },
        "results": results,
    }
