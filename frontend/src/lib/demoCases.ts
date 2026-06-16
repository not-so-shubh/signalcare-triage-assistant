import { applyAnswerToSession, createEmptySession, finalizeTriage, updatePatientContext } from "./triageRules";
import type { AnswerValue, TriageSession, UrgencyTier } from "./triageTypes";

export type DemoDefinition = {
  id: string;
  title: string;
  description: string;
  input: string;
  expectedTier: UrgencyTier | "Adaptive fever questions";
  answers?: Array<[string, AnswerValue]>;
};

export const DEMO_DEFINITIONS: DemoDefinition[] = [
  {
    id: "emergency_chest_pain",
    title: "Emergency chest pain",
    description: "AI extracts chest tightness, left arm radiation, and sweating before guardrails escalate.",
    input: "I have chest tightness and it’s spreading to my left arm. I feel sweaty.",
    expectedTier: "Emergency services now",
    answers: [
      ["primary_symptom", "Chest pain"],
      ["emergency_screen", "No"],
      ["chest_character", "Tightness"],
      ["chest_duration", "30 minutes"],
      ["chest_radiation", ["Left arm"]],
      ["chest_associated", ["Sweating"]],
      ["chest_severity", 8]
    ]
  },
  {
    id: "low_urgency_headache",
    title: "Low-urgency headache",
    description: "Mild familiar headache with denied neurological and infection red flags.",
    input: "I have a mild headache like ones I’ve had before. No weakness, no vision changes, no fever.",
    expectedTier: "Self-care with monitoring",
    answers: [
      ["primary_symptom", "Headache"],
      ["emergency_screen", "No"],
      ["headache_duration", "6 hours"],
      ["headache_sudden", "No"],
      ["headache_worst", "No"],
      ["headache_neuro", ["None"]],
      ["headache_fever_neck", ["None"]],
      ["headache_head_injury", "No"],
      ["headache_different", "Similar to previous headaches"],
      ["headache_severity", 3]
    ]
  },
  {
    id: "ambiguous_fever",
    title: "Ambiguous fever",
    description: "No immediate emergency phrase, so the assistant asks fever-specific safety questions.",
    input: "I have a fever and feel really unwell.",
    expectedTier: "Adaptive fever questions"
  }
];

export function getDemoSession(id: string): TriageSession {
  const definition = DEMO_DEFINITIONS.find((item) => item.id === id) ?? DEMO_DEFINITIONS[0];
  const base = updatePatientContext(createEmptySession(), { age: id === "emergency_chest_pain" ? 58 : null });
  const answered = (definition.answers ?? []).reduce(
    (session, [questionId, answer]) => applyAnswerToSession(session, questionId, answer),
    base
  );
  return finalizeTriage(answered);
}
