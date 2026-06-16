export type UrgencyTier =
  | "EMERGENCY_NOW"
  | "AE_TODAY"
  | "GP_URGENT"
  | "GP_ROUTINE"
  | "SELF_CARE";

export type AnswerType = "yes_no" | "scale" | "text" | "multi_select";
export type AnswerValue = string | number | boolean | string[] | null;

export interface SymptomAnswer {
  id: string;
  question?: string | null;
  answer: AnswerValue;
  answer_type?: AnswerType | null;
  maps_to?: string | null;
  red_flag_related: boolean;
  category?: string | null;
}

export interface PatientCase {
  session_id: string;
  primary_complaint: string;
  duration?: string | null;
  severity?: number | null;
  onset?: string | null;
  associated_symptoms: string[];
  age?: number | null;
  sex?: string | null;
  medical_history: string[];
  medications: string[];
  allergies: string[];
  pregnancy_status?: string | null;
  answers: SymptomAnswer[];
  red_flags: string[];
  free_text_notes?: string | null;
}

export interface QuestionItem {
  id: string;
  text: string;
  answer_type: AnswerType;
  priority: number;
  red_flag_related: boolean;
  maps_to: string;
  options?: string[] | null;
  category?: string;
}

export interface QuestionResponse {
  category: string;
  questions: QuestionItem[];
  explanation: string;
}

export interface DecisionTraceStep {
  step: number;
  label: string;
  details: string;
  evidence: string[];
}

export interface CarePathway {
  label: string;
  urgency_message: string;
  what_to_do_now: string[];
  what_to_tell_provider: string[];
  red_flags_to_watch: string[];
  disclaimer: string;
}

export interface TriageResult {
  tier: UrgencyTier;
  title: string;
  recommendation: string;
  reasoning: string[];
  confidence: "high" | "medium" | "low";
  matched_rules: string[];
  red_flags: string[];
  decision_trace: DecisionTraceStep[];
  care_pathway: CarePathway;
}

export interface ProviderSummary {
  presenting_complaint: string;
  timeline: string;
  severity: string;
  associated_symptoms: string[];
  relevant_negatives: string[];
  medical_history: string[];
  medications_allergies: {
    medications: string[];
    allergies: string[];
  };
  red_flags: string[];
  ai_urgency_assessment: string;
  reasoning_decision_trace: DecisionTraceStep[];
  recommended_care_pathway: CarePathway;
  matched_safety_rules: string[];
  plain_english_summary: string;
  provider_facing_summary: string;
  safety_disclaimer: string;
}

export interface DemoCaseResult {
  id: string;
  name: string;
  expected_tier: UrgencyTier;
  actual_tier: UrgencyTier;
  passed: boolean;
  guardrail_override: boolean;
  summary_complete: boolean;
  result: TriageResult;
  summary: ProviderSummary;
}

export interface MetricCount {
  passed: number;
  total: number;
}

export interface DemoRunResponse {
  metrics: {
    emergency_cases_caught: MetricCount;
    guardrail_overrides_passed: MetricCount;
    similar_cases_differentiated: MetricCount;
    provider_summaries_complete: MetricCount;
  };
  results: DemoCaseResult[];
}
