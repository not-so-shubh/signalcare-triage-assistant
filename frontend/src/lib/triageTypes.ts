export type UrgencyTier =
  | "Emergency services now"
  | "A&E today"
  | "GP urgent appointment"
  | "GP routine"
  | "Self-care with monitoring";

export type QuestionType = "single" | "multi" | "scale" | "text";

export type SymptomGroup =
  | "chest"
  | "breathing"
  | "headache"
  | "abdominal"
  | "fever"
  | "other";

export type CareRegion = "uk" | "india" | "us";

export type AnswerValue = string | string[] | number | boolean | null;

export type AnswerOption = {
  label: string;
  value: string;
  helperText?: string;
};

export type Question = {
  id: string;
  symptomGroup: string;
  text: string;
  helperText?: string;
  type: QuestionType;
  options?: string[];
  required?: boolean;
};

export type RedFlag = {
  id: string;
  label: string;
  evidence: string[];
};

export type Patient = {
  age: number | null;
  sex: string | null;
  pregnancyStatus: string | null;
  knownConditions: string[];
  medications: string[];
  allergies: string[];
};

export type PresentingComplaint = {
  primarySymptom: string | null;
  onset: string | null;
  duration: string | null;
  severity0To10: number | null;
  location: string | null;
  character: string | null;
  progression: string | null;
  triggers: string[];
  relievingFactors: string[];
};

export type AssociatedSymptoms = {
  fever: boolean | null;
  shortnessOfBreath: boolean | null;
  chestPain: boolean | null;
  neurologicalSymptoms: string[];
  vomiting: boolean | null;
  rash: boolean | null;
  bleeding: boolean | null;
  painRadiation: string[];
  lossOfConsciousness: boolean | null;
  sweating: boolean | null;
  nausea: boolean | null;
  dizziness: boolean | null;
  confusion: boolean | null;
};

export type RiskFactors = {
  cardiacHistory: boolean | null;
  strokeHistory: boolean | null;
  diabetes: boolean | null;
  immunosuppressed: boolean | null;
  recentSurgery: boolean | null;
  recentTrauma: boolean | null;
  ageOver65: boolean | null;
  infantOrChild: boolean | null;
};

export type TriageState = {
  redFlagsDetected: RedFlag[];
  urgencyTier: UrgencyTier | null;
  confidence: "high" | "medium" | "low" | null;
  reasoningSummary: string | null;
  recommendedAction: string | null;
};

export type AIExtractionReview = {
  sourceText: string;
  extractedAt: string;
  reviewed: boolean;
  confidenceNotes: string[];
};

export type AnswerRecord = {
  questionId: string;
  questionText: string;
  answer: AnswerValue;
  answeredAt: string;
};

export type CarePathway = {
  tier: UrgencyTier;
  title: string;
  message: string;
  whatToDoNow: string[];
  whatToTellProvider: string[];
  redFlagsToWatch: string[];
  whenToEscalate: string;
};

export type TriageSession = {
  patient: Patient;
  presentingComplaint: PresentingComplaint;
  associatedSymptoms: AssociatedSymptoms;
  riskFactors: RiskFactors;
  triage: TriageState;
  answers: AnswerRecord[];
  activeSymptomGroup: SymptomGroup | null;
  freeTextNotes: string;
  deniedSymptoms: string[];
  emergencyClarification: string[];
  aiExtraction: AIExtractionReview | null;
  completedAt: string | null;
};

export type ProviderSummary = {
  presentingComplaint: string;
  symptomTimeline: string;
  severity: string;
  symptomDetails: string[];
  associatedSymptoms: string[];
  negativeSymptoms: string[];
  relevantHistory: string[];
  redFlagsDetected: string[];
  aiUrgencyAssessment: string;
  recommendedCarePathway: string;
  patientInstructions: string[];
  tellThemScript: string;
  patientFacingSummary: string;
  structuredSession: TriageSession;
  fullText: string;
};

export type TriageTestCase = {
  id: string;
  name: string;
  inputSummary: string;
  session: TriageSession;
  expectedTier: UrgencyTier;
};

export type TriageTestResult = {
  id: string;
  name: string;
  expectedTier: UrgencyTier;
  actualTier: UrgencyTier;
  passed: boolean;
  redFlags: string[];
  inputSummary: string;
  expectedEmergency: boolean;
  redFlagCase: boolean;
};

export type EvaluationMetrics = {
  totalCases: number;
  passedCases: number;
  emergencySensitivity: number;
  emergencyMisses: number;
  safetyOverridePassRate: number;
};
