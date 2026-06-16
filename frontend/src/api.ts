import type {
  DemoRunResponse,
  PatientCase,
  ProviderSummary,
  QuestionResponse,
  TriageResult
} from "./types";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

async function postJson<T>(path: string, payload?: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: payload === undefined ? undefined : JSON.stringify(payload)
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function fetchQuestions(patientCase: PatientCase): Promise<QuestionResponse> {
  return postJson<QuestionResponse>("/api/questions", { case: patientCase });
}

export function assessTriage(patientCase: PatientCase): Promise<TriageResult> {
  return postJson<TriageResult>("/api/triage", { case: patientCase });
}

export function fetchSummary(patientCase: PatientCase, result: TriageResult): Promise<ProviderSummary> {
  return postJson<ProviderSummary>("/api/summary", { case: patientCase, result });
}

export function runDemoCases(): Promise<DemoRunResponse> {
  return postJson<DemoRunResponse>("/api/demo-cases/run");
}
