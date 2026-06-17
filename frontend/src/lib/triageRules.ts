import { DEFAULT_CARE_REGION, localizePathway } from "./careTerminology";
import { getNextQuestion, questionById, symptomGroupForPrimary } from "./questions";
import type {
  AnswerValue,
  AssociatedSymptoms,
  CareRegion,
  CarePathway,
  Patient,
  PresentingComplaint,
  Question,
  RedFlag,
  RiskFactors,
  TriageSession,
  TriageState,
  UrgencyTier,
  ProviderSummary
} from "./triageTypes";

const EMERGENCY: UrgencyTier = "Emergency services now";

const DEFAULT_PATIENT: Patient = {
  name: null,
  age: null,
  sex: null,
  pregnancyStatus: null,
  knownConditions: [],
  medications: [],
  allergies: []
};

const DEFAULT_PRESENTING_COMPLAINT: PresentingComplaint = {
  primarySymptom: null,
  onset: null,
  duration: null,
  severity0To10: null,
  location: null,
  character: null,
  progression: null,
  triggers: [],
  relievingFactors: []
};

const DEFAULT_ASSOCIATED_SYMPTOMS: AssociatedSymptoms = {
  fever: null,
  shortnessOfBreath: null,
  chestPain: null,
  neurologicalSymptoms: [],
  vomiting: null,
  rash: null,
  bleeding: null,
  painRadiation: [],
  lossOfConsciousness: null,
  sweating: null,
  nausea: null,
  dizziness: null,
  confusion: null
};

const DEFAULT_RISK_FACTORS: RiskFactors = {
  cardiacHistory: null,
  strokeHistory: null,
  diabetes: null,
  immunosuppressed: null,
  recentSurgery: null,
  recentTrauma: null,
  ageOver65: null,
  infantOrChild: null
};

const DEFAULT_TRIAGE: TriageState = {
  redFlagsDetected: [],
  urgencyTier: null,
  confidence: null,
  reasoningSummary: null,
  recommendedAction: null
};

export const CARE_PATHWAYS: Record<UrgencyTier, CarePathway> = {
  "Emergency services now": {
    tier: "Emergency services now",
    title: "Emergency services now",
    message:
      "Based on what you shared, this may be an emergency. Please call emergency services now. Do not drive yourself.",
    whatToDoNow: [
      "Call emergency services now.",
      "Stay where you are unless the area is unsafe.",
      "Do not drive yourself.",
      "If another person is present, ask them to stay with you."
    ],
    whatToTellProvider: [
      "The main symptom and when it started.",
      "Any spreading pain, breathing difficulty, weakness, confusion, bleeding, fainting, seizure, or severe allergy symptoms.",
      "Medical conditions, medications, allergies, and pregnancy status if relevant."
    ],
    redFlagsToWatch: [
      "Worsening breathing difficulty",
      "Chest pain with spreading pain, sweating, nausea, fainting, or breathlessness",
      "Face droop, arm weakness, speech difficulty, confusion, vision change, or trouble walking",
      "Loss of consciousness, seizure, heavy bleeding, or immediate self-harm risk"
    ],
    whenToEscalate: "This is already escalated to emergency care."
  },
  "A&E today": {
    tier: "A&E today",
    title: "A&E / emergency department today",
    message:
      "These symptoms do not currently match a hard emergency override, but they should be assessed in an emergency department today.",
    whatToDoNow: [
      "Arrange same-day emergency department assessment.",
      "Avoid driving yourself if symptoms could worsen suddenly.",
      "Take a list of medications, allergies, and relevant medical history."
    ],
    whatToTellProvider: [
      "When symptoms started and whether they are worsening.",
      "Severity from 0 to 10.",
      "Associated symptoms such as fever, vomiting, breathing difficulty, injury, or dehydration."
    ],
    redFlagsToWatch: [
      "Severe or rapidly worsening symptoms",
      "Fainting, confusion, weakness, trouble speaking, or trouble breathing",
      "Blood in vomit or stool, rigid abdomen, or uncontrolled pain"
    ],
    whenToEscalate: "Call emergency services now if red flags appear or symptoms rapidly worsen."
  },
  "GP urgent appointment": {
    tier: "GP urgent appointment",
    title: "Urgent GP appointment",
    message:
      "This does not sound like an emergency based on your answers, but it should be assessed by a clinician within 24 hours.",
    whatToDoNow: [
      "Contact a GP, urgent care clinic, or local clinical advice line today.",
      "Monitor symptoms and keep fluids up if appropriate.",
      "Use the provider summary when booking or speaking to a clinician."
    ],
    whatToTellProvider: [
      "Main symptom, duration, severity, and progression.",
      "Fever, infection symptoms, urinary symptoms, neurological changes, or chronic conditions.",
      "What has helped or made symptoms worse."
    ],
    redFlagsToWatch: [
      "Breathing difficulty at rest",
      "New weakness, speech problems, confusion, or vision change",
      "High fever with stiff neck, rash, extreme drowsiness, or dehydration"
    ],
    whenToEscalate: "Seek emergency care if symptoms become severe, rapidly worse, or any red flag appears."
  },
  "GP routine": {
    tier: "GP routine",
    title: "Routine GP appointment",
    message:
      "These symptoms appear stable and non-emergency from the information provided, but a clinician review this week may be appropriate.",
    whatToDoNow: [
      "Book a routine GP appointment.",
      "Track symptom timing, severity, triggers, and what helps.",
      "Bring medication and allergy details to the appointment."
    ],
    whatToTellProvider: [
      "How long symptoms have persisted.",
      "Whether they recur or affect daily activities.",
      "Relevant medical history and medication questions."
    ],
    redFlagsToWatch: [
      "Rapid worsening",
      "Severe pain",
      "Fever with stiff neck or confusion",
      "Breathing difficulty or chest pain"
    ],
    whenToEscalate: "Move to urgent care or emergency care if red flags develop."
  },
  "Self-care with monitoring": {
    tier: "Self-care with monitoring",
    title: "Self-care with monitoring",
    message:
      "This does not sound like an emergency based on your answers. Symptoms can change, so continue monitoring closely.",
    whatToDoNow: [
      "Rest and hydrate if appropriate.",
      "Use usual self-care measures you know are safe for you.",
      "Monitor symptoms over the next 24 to 48 hours."
    ],
    whatToTellProvider: [
      "If symptoms persist, share the start time, severity, and associated symptoms.",
      "Mention any change from your usual pattern.",
      "Share medications, allergies, and relevant conditions."
    ],
    redFlagsToWatch: [
      "Sudden severe headache",
      "Weakness, speech trouble, confusion, fever with stiff neck, or vision changes",
      "Chest pain, shortness of breath, fainting, heavy bleeding, or rapidly worsening symptoms"
    ],
    whenToEscalate: "Seek urgent care if symptoms worsen, persist, or any red flag appears."
  }
};

export function createEmptySession(): TriageSession {
  return {
    patient: { ...DEFAULT_PATIENT },
    presentingComplaint: { ...DEFAULT_PRESENTING_COMPLAINT },
    associatedSymptoms: { ...DEFAULT_ASSOCIATED_SYMPTOMS, neurologicalSymptoms: [], painRadiation: [] },
    riskFactors: { ...DEFAULT_RISK_FACTORS },
    triage: { ...DEFAULT_TRIAGE, redFlagsDetected: [] },
    answers: [],
    activeSymptomGroup: null,
    freeTextNotes: "",
    deniedSymptoms: [],
    emergencyClarification: [],
    aiExtraction: null,
    completedAt: null
  };
}

export function cloneSession(session: TriageSession): TriageSession {
  return {
    ...session,
    patient: {
      ...session.patient,
      knownConditions: [...session.patient.knownConditions],
      medications: [...session.patient.medications],
      allergies: [...session.patient.allergies]
    },
    presentingComplaint: {
      ...session.presentingComplaint,
      triggers: [...session.presentingComplaint.triggers],
      relievingFactors: [...session.presentingComplaint.relievingFactors]
    },
    associatedSymptoms: {
      ...session.associatedSymptoms,
      neurologicalSymptoms: [...session.associatedSymptoms.neurologicalSymptoms],
      painRadiation: [...session.associatedSymptoms.painRadiation]
    },
    riskFactors: { ...session.riskFactors },
    triage: {
      ...session.triage,
      redFlagsDetected: session.triage.redFlagsDetected.map((flag) => ({ ...flag, evidence: [...flag.evidence] }))
    },
    answers: session.answers.map((answer) => ({ ...answer })),
    deniedSymptoms: [...(session.deniedSymptoms ?? [])],
    emergencyClarification: [...session.emergencyClarification],
    aiExtraction: session.aiExtraction ? { ...session.aiExtraction, confidenceNotes: [...session.aiExtraction.confidenceNotes] } : null
  };
}

function normalize(value: unknown): string {
  if (Array.isArray(value)) return value.join(" ").toLowerCase();
  return String(value ?? "").toLowerCase();
}

function normalizeAll(session: TriageSession): string {
  return [
    session.presentingComplaint.primarySymptom,
    session.presentingComplaint.onset,
    session.presentingComplaint.duration,
    session.presentingComplaint.location,
    session.presentingComplaint.character,
    session.presentingComplaint.progression,
    session.freeTextNotes,
    ...session.presentingComplaint.triggers,
    ...session.presentingComplaint.relievingFactors,
    ...session.associatedSymptoms.neurologicalSymptoms,
    ...session.associatedSymptoms.painRadiation,
    ...session.patient.knownConditions,
    ...session.patient.medications,
    ...session.patient.allergies,
    ...session.emergencyClarification,
    ...session.answers.map((answer) => normalize(answer.answer))
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function hasAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}

function hasYes(session: TriageSession, questionId: string): boolean {
  return session.answers.some((answer) => answer.questionId === questionId && answer.answer === "Yes");
}

function hasAnswer(session: TriageSession, questionId: string, value: string): boolean {
  return session.answers.some((answer) => {
    if (answer.questionId !== questionId) return false;
    if (Array.isArray(answer.answer)) return answer.answer.includes(value);
    return answer.answer === value;
  });
}

function addFlag(flags: RedFlag[], id: string, label: string, evidence: string[]) {
  if (!flags.some((flag) => flag.id === id)) {
    flags.push({ id, label, evidence });
  }
}

function withoutNone(values: string[]): string[] {
  return values.filter((value) => {
    const normalized = value.toLowerCase();
    return normalized !== "none" && normalized !== "no" && normalized !== "none of these";
  });
}

function mergeUnique(current: string[], additions: string[]): string[] {
  return [...new Set([...current, ...additions].map((item) => item.trim()).filter(Boolean))];
}

function containsChoice(answer: AnswerValue, choice: string): boolean {
  if (Array.isArray(answer)) return answer.includes(choice);
  return answer === choice;
}

function answerList(answer: AnswerValue): string[] {
  if (Array.isArray(answer)) return withoutNone(answer);
  if (typeof answer === "string" && answer && answer !== "None") return [answer];
  return [];
}

function parseDays(value: string | null): number | null {
  const text = (value ?? "").toLowerCase();
  const match = text.match(/(\d+)\s*(hour|hours|day|days|week|weeks)/);
  if (!match) return null;
  const amount = Number(match[1]);
  const unit = match[2];
  if (unit.startsWith("hour")) return amount / 24;
  if (unit.startsWith("week")) return amount * 7;
  return amount;
}

function sanitizeAge(age: number | null): number | null {
  if (age === null || !Number.isFinite(age)) return null;
  if (age < 1) return null;
  return Math.min(120, Math.trunc(age));
}

function sanitizePatientName(name: string | null): string | null {
  const normalized = name?.replace(/\s+/g, " ").trim() ?? "";
  const placeholderValues = new Set(["example: priya sharma", "optional", "patient name"]);
  if (!normalized || placeholderValues.has(normalized.toLowerCase())) return null;
  return normalized.slice(0, 80).trim();
}

function sanitizeTextList(values: string[]): string[] {
  const placeholderValues = new Set([
    "optional",
    "leave blank if none",
    "diabetes, asthma",
    "example: diabetes, asthma",
    "example: metformin",
    "example: penicillin"
  ]);
  return [
    ...new Set(
      values
        .map((value) => value.trim())
        .filter((value) => value && !placeholderValues.has(value.toLowerCase()))
    )
  ];
}

function normalizeSex(value: string | null): string | null {
  const text = value?.trim();
  if (!text) return null;
  if (text.toLowerCase() === "intersex") return "Other";
  return text;
}

function isMaleSex(value: string | null): boolean {
  return value?.trim().toLowerCase() === "male";
}

function normalizePregnancyStatus(value: string | null): string | null {
  const text = value?.trim();
  if (!text) return null;
  const normalized = text.toLowerCase();
  if (normalized === "yes" || normalized === "pregnant") return "Pregnant";
  if (normalized === "possibly pregnant" || normalized === "possible" || normalized === "possibly") return "Unsure";
  if (normalized === "not sure" || normalized === "unsure") return "Unsure";
  if (normalized === "no" || normalized === "not pregnant") return "Not pregnant";
  if (normalized === "not applicable") return null;
  return text;
}

function pregnancyPossible(status: string | null): boolean {
  const normalized = normalizePregnancyStatus(status)?.toLowerCase();
  return Boolean(normalized && normalized !== "not pregnant");
}

function syncPatientRiskFactors(session: TriageSession) {
  session.riskFactors.ageOver65 = session.patient.age !== null ? session.patient.age >= 65 : null;
  session.riskFactors.infantOrChild = session.patient.age !== null ? session.patient.age < 16 : null;
  const conditions = session.patient.knownConditions.join(" ").toLowerCase();
  if (hasAny(conditions, ["heart", "cardiac", "blood clot", "hypertension", "high blood pressure"])) {
    session.riskFactors.cardiacHistory = true;
  }
  if (conditions.includes("stroke")) session.riskFactors.strokeHistory = true;
  if (conditions.includes("diabetes")) session.riskFactors.diabetes = true;
  if (hasAny(conditions, ["immunosuppressed", "immune", "chemotherapy", "transplant"])) {
    session.riskFactors.immunosuppressed = true;
  }
}

function sanitizePatientContextInPlace(session: TriageSession) {
  session.patient.name = sanitizePatientName(session.patient.name);
  session.patient.age = sanitizeAge(session.patient.age);
  session.patient.sex = normalizeSex(session.patient.sex);
  session.patient.knownConditions = sanitizeTextList(session.patient.knownConditions);
  session.patient.medications = sanitizeTextList(session.patient.medications);
  session.patient.allergies = sanitizeTextList(session.patient.allergies);
  session.patient.pregnancyStatus = isMaleSex(session.patient.sex) ? null : normalizePregnancyStatus(session.patient.pregnancyStatus);
  syncPatientRiskFactors(session);
}

export function sanitizePatientContext(session: TriageSession): TriageSession {
  const next = cloneSession(session);
  sanitizePatientContextInPlace(next);
  return next;
}

function isSevere(session: TriageSession, threshold = 7): boolean {
  return (session.presentingComplaint.severity0To10 ?? 0) >= threshold;
}

function updateTriageForSafety(session: TriageSession): TriageSession {
  sanitizePatientContextInPlace(session);
  const redFlags = detectRedFlags(session);
  session.triage.redFlagsDetected = redFlags;
  if (redFlags.length > 0) {
    session.triage.urgencyTier = EMERGENCY;
    session.triage.confidence = "high";
    session.triage.reasoningSummary = "A deterministic emergency safety guardrail matched and overrides all lower-acuity triage.";
    session.triage.recommendedAction = CARE_PATHWAYS[EMERGENCY].message;
    session.completedAt = new Date().toISOString();
  }
  return session;
}

export function mergeExtractedSession(
  session: TriageSession,
  extracted: Partial<TriageSession>,
  sourceText: string
): TriageSession {
  const next = cloneSession(session);

  // LLM or simulated-AI extraction is intentionally non-authoritative. It may suggest structured fields,
  // but deterministic rules below re-check every merged signal before any urgency state is shown.
  if (extracted.patient) {
    const patient = extracted.patient;
    next.patient = {
      ...next.patient,
      name: patient.name?.trim() ? patient.name : next.patient.name,
      age: patient.age ?? next.patient.age,
      sex: patient.sex ?? next.patient.sex,
      pregnancyStatus: patient.pregnancyStatus ?? next.patient.pregnancyStatus,
      knownConditions: mergeUnique(next.patient.knownConditions, patient.knownConditions ?? []),
      medications: mergeUnique(next.patient.medications, patient.medications ?? []),
      allergies: mergeUnique(next.patient.allergies, patient.allergies ?? [])
    };
  }

  if (extracted.presentingComplaint) {
    next.presentingComplaint = {
      ...next.presentingComplaint,
      ...Object.fromEntries(
        Object.entries(extracted.presentingComplaint).filter(([, value]) => value !== null && value !== undefined && value !== "")
      ),
      triggers: mergeUnique(next.presentingComplaint.triggers, extracted.presentingComplaint.triggers ?? []),
      relievingFactors: mergeUnique(next.presentingComplaint.relievingFactors, extracted.presentingComplaint.relievingFactors ?? [])
    };
  }

  if (extracted.associatedSymptoms) {
    const associated = extracted.associatedSymptoms;
    next.associatedSymptoms = {
      ...next.associatedSymptoms,
      fever: associated.fever ?? next.associatedSymptoms.fever,
      shortnessOfBreath: associated.shortnessOfBreath ?? next.associatedSymptoms.shortnessOfBreath,
      chestPain: associated.chestPain ?? next.associatedSymptoms.chestPain,
      vomiting: associated.vomiting ?? next.associatedSymptoms.vomiting,
      rash: associated.rash ?? next.associatedSymptoms.rash,
      bleeding: associated.bleeding ?? next.associatedSymptoms.bleeding,
      lossOfConsciousness: associated.lossOfConsciousness ?? next.associatedSymptoms.lossOfConsciousness,
      sweating: associated.sweating ?? next.associatedSymptoms.sweating,
      nausea: associated.nausea ?? next.associatedSymptoms.nausea,
      dizziness: associated.dizziness ?? next.associatedSymptoms.dizziness,
      confusion: associated.confusion ?? next.associatedSymptoms.confusion,
      neurologicalSymptoms: mergeUnique(
        next.associatedSymptoms.neurologicalSymptoms,
        associated.neurologicalSymptoms ?? []
      ),
      painRadiation: mergeUnique(next.associatedSymptoms.painRadiation, associated.painRadiation ?? [])
    };
  }

  if (extracted.riskFactors) {
    next.riskFactors = { ...next.riskFactors, ...extracted.riskFactors };
  }

  sanitizePatientContextInPlace(next);

  next.deniedSymptoms = mergeUnique(next.deniedSymptoms, extracted.deniedSymptoms ?? []);
  next.freeTextNotes = mergeNote(next.freeTextNotes, extracted.freeTextNotes ?? "");
  next.activeSymptomGroup =
    extracted.activeSymptomGroup ?? symptomGroupForPrimary(next.presentingComplaint.primarySymptom ?? sourceText);
  next.aiExtraction = {
    sourceText,
    extractedAt: extracted.aiExtraction?.extractedAt ?? new Date().toISOString(),
    reviewed: false,
    confidenceNotes: extracted.aiExtraction?.confidenceNotes ?? [
      "Local simulated extraction used. Deterministic guardrails remain authoritative."
    ]
  };

  const redFlags = detectRedFlags(next);
  const tier = classifyUrgency(next);
  next.triage.redFlagsDetected = redFlags;
  next.triage.urgencyTier = tier;
  next.triage.confidence = redFlags.length > 0 ? "high" : "low";
  next.triage.reasoningSummary =
    redFlags.length > 0
      ? "Emergency override activated from the description. A hard-coded safety rule matched before normal questioning continued."
      : "AI-assisted extraction created an initial care-level preview. Continue the focused questions to refine it.";
  next.triage.recommendedAction = CARE_PATHWAYS[tier].message;
  next.completedAt = redFlags.length > 0 ? new Date().toISOString() : null;

  return next;
}

export function markAIExtractionReviewed(session: TriageSession): TriageSession {
  const next = cloneSession(session);
  if (next.aiExtraction) {
    next.aiExtraction.reviewed = true;
  }
  return next;
}

export function updatePatientContext(session: TriageSession, updates: Partial<Patient>): TriageSession {
  const next = cloneSession(session);
  next.patient = {
    ...next.patient,
    ...updates,
    knownConditions: updates.knownConditions ?? next.patient.knownConditions,
    medications: updates.medications ?? next.patient.medications,
    allergies: updates.allergies ?? next.patient.allergies
  };
  sanitizePatientContextInPlace(next);
  return updateTriageForSafety(next);
}

export function applyAnswerToSession(session: TriageSession, questionId: string, answer: AnswerValue): TriageSession {
  const next = cloneSession(session);
  const question = questionById(questionId);
  const questionText = question?.text ?? questionId;

  next.answers = [
    ...next.answers.filter((record) => record.questionId !== questionId),
    {
      questionId,
      questionText,
      answer,
      answeredAt: new Date().toISOString()
    }
  ];

  switch (questionId) {
    case "primary_symptom": {
      const value = String(answer ?? "");
      next.presentingComplaint.primarySymptom = value;
      next.activeSymptomGroup = symptomGroupForPrimary(value);
      next.associatedSymptoms.chestPain = next.activeSymptomGroup === "chest" ? true : next.associatedSymptoms.chestPain;
      next.associatedSymptoms.shortnessOfBreath =
        next.activeSymptomGroup === "breathing" ? true : next.associatedSymptoms.shortnessOfBreath;
      next.associatedSymptoms.fever = next.activeSymptomGroup === "fever" ? true : next.associatedSymptoms.fever;
      break;
    }
    case "other_description": {
      const value = String(answer ?? "").trim();
      next.freeTextNotes = value;
      if (!next.presentingComplaint.primarySymptom || next.presentingComplaint.primarySymptom === "Something else") {
        next.presentingComplaint.primarySymptom = value || "Something else";
      }
      next.activeSymptomGroup = symptomGroupForPrimary(value);
      if (next.activeSymptomGroup === "other") next.activeSymptomGroup = "other";
      break;
    }
    case "emergency_clarify": {
      next.emergencyClarification = answerList(answer);
      break;
    }
    case "chest_character":
      next.presentingComplaint.character = String(answer ?? "");
      break;
    case "chest_duration":
    case "headache_duration":
    case "abdominal_duration":
    case "fever_duration":
    case "other_duration":
      next.presentingComplaint.duration = String(answer ?? "");
      break;
    case "chest_sudden":
      next.presentingComplaint.onset = answer === "Yes" ? "Sudden" : answer === "No" ? "Not sudden" : "Not sure";
      break;
    case "chest_radiation":
      next.associatedSymptoms.painRadiation = answerList(answer);
      break;
    case "chest_associated": {
      const values = answerList(answer);
      next.associatedSymptoms.shortnessOfBreath = values.includes("Shortness of breath") ? true : next.associatedSymptoms.shortnessOfBreath;
      next.associatedSymptoms.sweating = values.includes("Sweating") ? true : next.associatedSymptoms.sweating;
      next.associatedSymptoms.nausea = values.includes("Nausea") ? true : next.associatedSymptoms.nausea;
      next.associatedSymptoms.dizziness = values.includes("Dizziness") ? true : next.associatedSymptoms.dizziness;
      next.associatedSymptoms.lossOfConsciousness = values.includes("Fainting") ? true : next.associatedSymptoms.lossOfConsciousness;
      break;
    }
    case "chest_severity":
    case "breathing_severity":
    case "headache_severity":
    case "abdominal_severity":
    case "other_severity":
      next.presentingComplaint.severity0To10 = typeof answer === "number" ? answer : Number(answer);
      break;
    case "chest_history": {
      const values = answerList(answer);
      next.patient.knownConditions = mergeUnique(next.patient.knownConditions, values);
      next.riskFactors.cardiacHistory = values.some((value) =>
        ["Heart disease", "High blood pressure", "History of blood clots"].includes(value)
      );
      next.riskFactors.diabetes = values.includes("Diabetes");
      break;
    }
    case "breathing_rest":
      next.associatedSymptoms.shortnessOfBreath = answer === "Yes" || answer === "Not sure" ? true : next.associatedSymptoms.shortnessOfBreath;
      next.presentingComplaint.location = "Breathing at rest";
      break;
    case "breathing_full_sentences":
      if (answer === "Yes") next.associatedSymptoms.shortnessOfBreath = true;
      break;
    case "breathing_blue":
      if (answer === "Yes") next.freeTextNotes = mergeNote(next.freeTextNotes, "Blue or grey lips or face");
      break;
    case "breathing_chest_pain":
      next.associatedSymptoms.chestPain = answer === "Yes" || answer === "Not sure" ? true : next.associatedSymptoms.chestPain;
      break;
    case "breathing_onset_worsening":
      next.presentingComplaint.progression = answer === "Yes" ? "New, sudden, or worsening" : String(answer ?? "");
      break;
    case "breathing_history": {
      const values = answerList(answer);
      next.patient.knownConditions = mergeUnique(next.patient.knownConditions, values);
      next.riskFactors.cardiacHistory = values.includes("Heart disease") ? true : next.riskFactors.cardiacHistory;
      break;
    }
    case "headache_sudden":
      if (answer === "Yes") next.presentingComplaint.onset = "Sudden and severe";
      break;
    case "headache_worst":
      if (answer === "Yes") next.presentingComplaint.character = "Worst headache of life";
      break;
    case "headache_neuro":
      next.associatedSymptoms.neurologicalSymptoms = mergeUnique(
        next.associatedSymptoms.neurologicalSymptoms,
        answerList(answer)
      );
      if (answerList(answer).includes("Confusion")) next.associatedSymptoms.confusion = true;
      if (answerList(answer).includes("Vision change")) next.associatedSymptoms.dizziness = next.associatedSymptoms.dizziness ?? null;
      break;
    case "headache_fever_neck": {
      const values = answerList(answer);
      next.associatedSymptoms.fever = values.includes("Fever") ? true : next.associatedSymptoms.fever;
      next.associatedSymptoms.rash = values.includes("Rash") ? true : next.associatedSymptoms.rash;
      next.associatedSymptoms.vomiting = values.includes("Vomiting") ? true : next.associatedSymptoms.vomiting;
      if (values.includes("Stiff neck")) next.freeTextNotes = mergeNote(next.freeTextNotes, "Stiff neck");
      break;
    }
    case "headache_head_injury":
      next.riskFactors.recentTrauma = answer === "Yes" || answer === "Not sure" ? true : next.riskFactors.recentTrauma;
      break;
    case "headache_different":
      next.presentingComplaint.progression = String(answer ?? "");
      break;
    case "abdominal_location":
      next.presentingComplaint.location = String(answer ?? "");
      break;
    case "abdominal_worse":
      next.presentingComplaint.progression = answer === "Yes" ? "Getting worse" : String(answer ?? "");
      break;
    case "abdominal_red_flags": {
      const values = answerList(answer);
      next.associatedSymptoms.vomiting = values.includes("Vomiting blood") ? true : next.associatedSymptoms.vomiting;
      next.associatedSymptoms.bleeding =
        values.includes("Vomiting blood") || values.includes("Black stools") ? true : next.associatedSymptoms.bleeding;
      next.associatedSymptoms.lossOfConsciousness = values.includes("Fainting") ? true : next.associatedSymptoms.lossOfConsciousness;
      next.associatedSymptoms.fever = values.includes("Fever") ? true : next.associatedSymptoms.fever;
      if (values.includes("Rigid abdomen")) next.freeTextNotes = mergeNote(next.freeTextNotes, "Rigid abdomen");
      break;
    }
    case "abdominal_pregnancy":
      next.patient.pregnancyStatus = String(answer ?? "");
      break;
    case "abdominal_surgery_trauma": {
      const values = answerList(answer);
      next.riskFactors.recentSurgery = values.includes("Recent surgery") ? true : next.riskFactors.recentSurgery;
      next.riskFactors.recentTrauma = values.includes("Recent trauma") ? true : next.riskFactors.recentTrauma;
      break;
    }
    case "fever_temperature":
      next.associatedSymptoms.fever = true;
      next.freeTextNotes = mergeNote(next.freeTextNotes, `Temperature: ${String(answer ?? "")}`);
      break;
    case "fever_warning": {
      const values = answerList(answer);
      next.associatedSymptoms.fever = true;
      next.associatedSymptoms.rash = values.includes("Rash") ? true : next.associatedSymptoms.rash;
      next.associatedSymptoms.confusion = values.includes("Confusion") ? true : next.associatedSymptoms.confusion;
      next.associatedSymptoms.shortnessOfBreath =
        values.includes("Breathing difficulty") ? true : next.associatedSymptoms.shortnessOfBreath;
      if (values.includes("Stiff neck")) next.freeTextNotes = mergeNote(next.freeTextNotes, "Stiff neck");
      if (values.includes("Extreme drowsiness")) next.freeTextNotes = mergeNote(next.freeTextNotes, "Extreme drowsiness");
      if (values.includes("Dehydration")) next.freeTextNotes = mergeNote(next.freeTextNotes, "Dehydration risk");
      break;
    }
    case "fever_immuno": {
      const values = answerList(answer);
      next.patient.knownConditions = mergeUnique(next.patient.knownConditions, values);
      next.riskFactors.immunosuppressed = values.length > 0 ? true : next.riskFactors.immunosuppressed;
      break;
    }
    case "fever_worse": {
      const values = answerList(answer);
      if (values.includes("Worsening symptoms")) next.presentingComplaint.progression = "Worsening symptoms";
      if (values.includes("Severe pain")) next.presentingComplaint.severity0To10 = Math.max(next.presentingComplaint.severity0To10 ?? 0, 8);
      if (values.includes("Recent surgery")) next.riskFactors.recentSurgery = true;
      break;
    }
    case "other_associated": {
      const values = answerList(answer);
      next.associatedSymptoms.chestPain = values.includes("Chest pain") ? true : next.associatedSymptoms.chestPain;
      next.associatedSymptoms.shortnessOfBreath =
        values.includes("Shortness of breath") ? true : next.associatedSymptoms.shortnessOfBreath;
      next.associatedSymptoms.fever = values.includes("Fever") ? true : next.associatedSymptoms.fever;
      next.associatedSymptoms.vomiting = values.includes("Vomiting") ? true : next.associatedSymptoms.vomiting;
      next.associatedSymptoms.rash = values.includes("Rash") ? true : next.associatedSymptoms.rash;
      next.associatedSymptoms.bleeding = values.includes("Bleeding") ? true : next.associatedSymptoms.bleeding;
      next.associatedSymptoms.confusion = values.includes("Confusion") ? true : next.associatedSymptoms.confusion;
      next.associatedSymptoms.dizziness = values.includes("Dizziness") ? true : next.associatedSymptoms.dizziness;
      next.freeTextNotes = mergeNote(next.freeTextNotes, values.join(", "));
      break;
    }
    case "other_history":
      next.patient.knownConditions = mergeUnique(next.patient.knownConditions, String(answer ?? "").split(","));
      break;
    default:
      break;
  }

  sanitizePatientContextInPlace(next);
  return updateTriageForSafety(next);
}

function mergeNote(current: string, addition: string): string {
  const trimmed = addition.trim();
  if (!trimmed) return current;
  if (!current.trim()) return trimmed;
  if (current.toLowerCase().includes(trimmed.toLowerCase())) return current;
  return `${current}; ${trimmed}`;
}

export function detectRedFlags(session: TriageSession): RedFlag[] {
  session = sanitizePatientContext(session);
  const flags: RedFlag[] = [];
  const text = normalizeAll(session);
  const primary = normalize(session.presentingComplaint.primarySymptom);
  const chestPain = session.associatedSymptoms.chestPain === true || primary.includes("chest") || hasAny(text, ["chest pain", "chest pressure"]);
  const radiation = session.associatedSymptoms.painRadiation.filter((item) =>
    ["Left arm", "Right arm", "Jaw", "Neck", "Back", "Shoulder"].includes(item)
  );
  const neuro = session.associatedSymptoms.neurologicalSymptoms;
  const emergencyClarification = session.emergencyClarification;
  const possiblePregnancy = pregnancyPossible(session.patient.pregnancyStatus);

  // Safety-critical override: emergency sensitivity is prioritized over reducing false positives.
  // If any deterministic red-flag pattern matches, the app escalates and stops normal questioning.
  if (emergencyClarification.includes("Severe chest pain")) {
    addFlag(flags, "immediate_severe_chest_pain", "Severe chest pain reported on safety scan", ["Severe chest pain"]);
  }
  if (emergencyClarification.includes("Trouble breathing at rest")) {
    addFlag(flags, "immediate_breathing_at_rest", "Trouble breathing at rest reported on safety scan", [
      "Trouble breathing at rest"
    ]);
  }
  if (emergencyClarification.includes("Stroke-like symptoms")) {
    addFlag(flags, "immediate_stroke_symptoms", "Stroke-like symptoms reported on safety scan", ["Stroke-like symptoms"]);
  }
  if (emergencyClarification.includes("Fainting or loss of consciousness")) {
    addFlag(flags, "loss_of_consciousness", "Loss of consciousness or fainting", ["Fainting or loss of consciousness"]);
  }
  if (emergencyClarification.includes("Heavy uncontrolled bleeding")) {
    addFlag(flags, "heavy_bleeding", "Heavy uncontrolled bleeding", ["Heavy uncontrolled bleeding"]);
  }
  if (emergencyClarification.includes("Seizure")) {
    addFlag(flags, "seizure", "Seizure", ["Seizure"]);
  }
  if (emergencyClarification.includes("Sudden severe headache")) {
    addFlag(flags, "sudden_severe_headache", "Sudden severe headache", ["Sudden severe headache"]);
  }
  if (emergencyClarification.includes("Severe allergic reaction with swelling or breathing difficulty")) {
    addFlag(flags, "severe_allergic_reaction", "Severe allergic reaction with swelling or breathing difficulty", [
      "Swelling or breathing difficulty"
    ]);
  }
  if (emergencyClarification.includes("Suicidal intent or immediate self-harm risk")) {
    addFlag(flags, "self_harm_risk", "Suicidal intent or immediate self-harm risk", [
      "Immediate self-harm risk"
    ]);
  }

  if (chestPain && radiation.length > 0) {
    addFlag(flags, "chest_pain_radiation", "Chest pain with pain spreading to arm, jaw, back, neck, or shoulder", [
      "Chest pain",
      ...radiation
    ]);
  }
  if (chestPain && session.associatedSymptoms.shortnessOfBreath) {
    addFlag(flags, "chest_pain_shortness_breath", "Chest pain with shortness of breath", [
      "Chest pain",
      "Shortness of breath"
    ]);
  }
  if (
    chestPain &&
    (session.associatedSymptoms.sweating ||
      session.associatedSymptoms.nausea ||
      session.associatedSymptoms.dizziness ||
      session.associatedSymptoms.lossOfConsciousness)
  ) {
    const evidence = [
      session.associatedSymptoms.sweating ? "Sweating" : "",
      session.associatedSymptoms.nausea ? "Nausea" : "",
      session.associatedSymptoms.dizziness ? "Lightheadedness or dizziness" : "",
      session.associatedSymptoms.lossOfConsciousness ? "Fainting" : ""
    ].filter(Boolean);
    addFlag(flags, "chest_pain_autonomic", "Chest pain with sweating, nausea, lightheadedness, or fainting", [
      "Chest pain",
      ...evidence
    ]);
  }

  const strokeEvidence = neuro.filter((item) =>
    [
      "Face drooping",
      "Arm weakness",
      "Weakness",
      "Speech difficulty",
      "Numbness",
      "Confusion",
      "Vision change",
      "Trouble walking"
    ].includes(item)
  );
  if (
    strokeEvidence.length > 0 ||
    hasAny(text, [
      "face droop",
      "face drooping",
      "arm weakness",
      "one-sided weakness",
      "one sided weakness",
      "slurred speech",
      "speech difficulty",
      "sudden confusion",
      "sudden trouble seeing",
      "vision loss",
      "sudden vision loss",
      "sudden trouble walking",
      "trouble walking",
      "loss of balance"
    ])
  ) {
    addFlag(flags, "stroke_symptoms", "Stroke-like symptoms need emergency assessment", [
      ...strokeEvidence,
      ...matchingText(text, [
        "face droop",
        "arm weakness",
        "slurred speech",
        "speech difficulty",
        "one-sided weakness",
        "vision loss",
        "trouble walking",
        "loss of balance"
      ])
    ]);
  }

  if (
    hasAny(text, ["worst headache of my life", "worst headache of life"]) ||
    (primary.includes("headache") &&
      (session.presentingComplaint.onset?.toLowerCase().includes("sudden") || hasYes(session, "headache_sudden")) &&
      (session.presentingComplaint.character?.toLowerCase().includes("worst") || hasYes(session, "headache_worst") || isSevere(session, 8)))
  ) {
    addFlag(flags, "worst_headache", "Sudden severe headache or worst headache of life", [
      "Sudden severe headache",
      "Worst headache of life"
    ]);
  }

  if (
    hasAnswer(session, "breathing_blue", "Yes") ||
    hasAnswer(session, "breathing_full_sentences", "Yes") ||
    (session.associatedSymptoms.shortnessOfBreath && isSevere(session, 8)) ||
    hasAny(text, ["severe breathing difficulty", "cannot breathe", "can't breathe", "blue lips", "blue face"])
  ) {
    addFlag(flags, "severe_breathing", "Severe breathing difficulty", [
      hasAnswer(session, "breathing_full_sentences", "Yes") ? "Unable to speak in full sentences" : "",
      hasAnswer(session, "breathing_blue", "Yes") ? "Blue or grey lips or face" : "",
      isSevere(session, 8) ? "Severe breathing symptoms" : ""
    ].filter(Boolean));
  }

  if (hasAny(text, ["swelling", "allergic reaction", "anaphylaxis"]) && session.associatedSymptoms.shortnessOfBreath) {
    addFlag(flags, "allergic_reaction_breathing", "Severe allergic reaction with swelling or breathing difficulty", [
      "Allergic reaction",
      "Breathing difficulty"
    ]);
  }
  if (hasAny(text, ["seizure", "convulsion"])) addFlag(flags, "seizure", "Seizure", ["Seizure"]);
  if (session.associatedSymptoms.lossOfConsciousness || hasAny(text, ["loss of consciousness", "passed out", "fainted"])) {
    addFlag(flags, "loss_of_consciousness", "Loss of consciousness", ["Loss of consciousness"]);
  }
  if (session.associatedSymptoms.confusion || hasAny(text, ["severe confusion", "very confused"])) {
    addFlag(flags, "severe_confusion", "Severe confusion", ["Confusion"]);
  }
  if (hasAny(text, ["heavy bleeding", "uncontrolled bleeding", "bleeding heavily"])) {
    addFlag(flags, "heavy_bleeding", "Heavy uncontrolled bleeding", ["Heavy uncontrolled bleeding"]);
  }
  if (possiblePregnancy && (session.associatedSymptoms.bleeding || hasAny(text, ["heavy bleeding", "bleeding heavily", "heavy vaginal bleeding", "uncontrolled bleeding"]))) {
    addFlag(flags, "pregnancy_heavy_bleeding", "Pregnancy with heavy or concerning bleeding", [
      session.patient.pregnancyStatus ?? "Possible pregnancy",
      "Bleeding"
    ]);
  }

  const fever = session.associatedSymptoms.fever || primary.includes("fever") || hasAny(text, ["fever", "temperature"]);
  const stiffNeck = hasAny(text, ["stiff neck"]);
  const rash = session.associatedSymptoms.rash || hasAny(text, ["rash"]);
  const confusion = session.associatedSymptoms.confusion || hasAny(text, ["confusion", "confused"]);
  const drowsy = hasAny(text, ["extreme drowsiness", "very drowsy", "hard to wake"]);
  if (fever && stiffNeck) addFlag(flags, "fever_stiff_neck", "Fever with stiff neck", ["Fever", "Stiff neck"]);
  if (fever && confusion) addFlag(flags, "fever_confusion", "Fever with confusion", ["Fever", "Confusion"]);
  if (fever && rash && confusion) addFlag(flags, "fever_rash_confusion", "Fever with rash and confusion", ["Fever", "Rash", "Confusion"]);
  if (fever && drowsy) addFlag(flags, "fever_extreme_drowsiness", "Fever with extreme drowsiness", ["Fever", "Extreme drowsiness"]);

  if (hasAny(text, ["severe trauma", "major trauma", "hit by car", "fall from height"])) {
    addFlag(flags, "severe_trauma", "Severe trauma", ["Severe trauma"]);
  }
  if (hasAny(text, ["suicidal", "kill myself", "self-harm now", "self harm now", "immediate self-harm", "want to hurt myself"])) {
    addFlag(flags, "self_harm_risk", "Suicidal intent or immediate self-harm risk", ["Immediate self-harm risk"]);
  }

  return flags;
}

function matchingText(text: string, terms: string[]): string[] {
  return terms.filter((term) => text.includes(term));
}

export function classifyUrgency(session: TriageSession): UrgencyTier {
  session = sanitizePatientContext(session);
  // Deterministic red flags always run first. This prevents an AI-generated explanation,
  // incomplete answer set, or lower-acuity scoring path from down-triaging a dangerous pattern.
  const redFlags = detectRedFlags(session);
  if (redFlags.length > 0) return EMERGENCY;

  const text = normalizeAll(session);
  const group = session.activeSymptomGroup ?? symptomGroupForPrimary(session.presentingComplaint.primarySymptom);
  const severity = session.presentingComplaint.severity0To10 ?? 0;
  const days = parseDays(session.presentingComplaint.duration);
  const persistent = days !== null ? days >= 7 : hasAny(text, ["persistent", "weeks", "months", "ongoing"]);
  const worsening = hasAny(text, ["getting worse", "worsening", "worse"]) || session.presentingComplaint.progression?.toLowerCase().includes("worse");
  const feverSeveralDays = group === "fever" && days !== null && days >= 3;
  const urinaryUrgent = hasAny(text, ["painful urination", "burning urination", "flank pain"]) && hasAny(text, ["fever", "temperature"]);
  const coldPattern = hasAny(text, ["cough", "runny nose", "sore throat", "cold"]) && !session.associatedSymptoms.shortnessOfBreath;
  const possibleFracture = hasAny(text, ["possible fracture", "fracture", "broken bone", "deformity"]);
  const headInjuryVomiting = hasAny(text, ["head injury", "hit my head", "head trauma"]) && hasAny(text, ["vomiting", "threw up"]);
  const dehydrationVomiting = hasAny(text, ["persistent vomiting", "repeated vomiting", "vomiting"]) && hasAny(text, ["dehydration", "can't keep fluids", "cannot keep fluids"]);
  const worseningChronic = hasAny(text, ["worsening chronic", "chronic condition worse", "diabetes worse", "copd worse", "asthma worse"]);
  const medicationQuestion = hasAny(text, ["medication question", "medicine question", "medication advice", "side effect"]);
  const skinRoutine = hasAny(text, ["skin change", "mole", "rash for weeks", "non-urgent skin"]);
  const mildShort = severity <= 4 && !worsening && (days === null || days <= 3);
  const possiblePregnancy = pregnancyPossible(session.patient.pregnancyStatus);

  if (possibleFracture || headInjuryVomiting || dehydrationVomiting) return "A&E today";
  if (group === "chest" && severity >= 4) return "A&E today";
  if (group === "breathing") {
    if (hasAnswer(session, "breathing_rest", "Yes") || severity >= 5 || hasAnswer(session, "breathing_onset_worsening", "Yes")) {
      return "A&E today";
    }
    if (session.riskFactors.cardiacHistory || hasAny(text, ["asthma", "copd"])) return "GP urgent appointment";
  }
  if (group === "abdominal") {
    if (possiblePregnancy && (severity >= 7 || hasAny(text, ["severe abdominal", "severe stomach", "severe belly"]))) {
      return "A&E today";
    }
    if (severity >= 7 || (severity >= 5 && worsening) || hasAny(text, ["vomiting blood", "black stools", "rigid abdomen", "fainting"])) {
      return "A&E today";
    }
    if (worsening || severity >= 5) return "GP urgent appointment";
  }
  if (group === "headache") {
    if (severity >= 7 || hasAnswer(session, "headache_head_injury", "Yes") || hasAnswer(session, "headache_different", "Different")) {
      return "A&E today";
    }
    if (session.associatedSymptoms.neurologicalSymptoms.length > 0 || worsening) return "GP urgent appointment";
    if (hasAnswer(session, "headache_different", "Similar to previous headaches") && mildShort) return "Self-care with monitoring";
  }
  if (group === "fever") {
    if (
      hasAny(text, ["dehydration", "breathing difficulty"]) ||
      (session.riskFactors.immunosuppressed && (severity >= 6 || worsening))
    ) {
      return "A&E today";
    }
    if (feverSeveralDays || worsening || session.riskFactors.immunosuppressed || hasAny(text, ["recent surgery", "severe pain"])) {
      return "GP urgent appointment";
    }
  }
  if (urinaryUrgent) return "GP urgent appointment";
  if (worseningChronic) return "GP urgent appointment";
  if (medicationQuestion || skinRoutine) return "GP routine";
  if (severity >= 8) return "A&E today";
  if (severity >= 6 || worsening) return "GP urgent appointment";
  if (persistent) return "GP routine";
  if (coldPattern && mildShort) return "Self-care with monitoring";
  if (mildShort) return "Self-care with monitoring";
  return "GP routine";
}

export function finalizeTriage(session: TriageSession): TriageSession {
  const next = cloneSession(session);
  sanitizePatientContextInPlace(next);
  const redFlags = detectRedFlags(next);
  const tier = classifyUrgency(next);
  const pathway = CARE_PATHWAYS[tier];
  next.triage.redFlagsDetected = redFlags;
  next.triage.urgencyTier = tier;
  next.triage.confidence = redFlags.length > 0 ? "high" : confidenceForTier(next, tier);
  next.triage.reasoningSummary = reasoningForTier(next, tier, redFlags);
  next.triage.recommendedAction = pathway.message;
  next.completedAt = new Date().toISOString();
  return next;
}

function confidenceForTier(session: TriageSession, tier: UrgencyTier): "high" | "medium" | "low" {
  if (tier === EMERGENCY) return "high";
  const nextQuestion = getNextQuestion(session);
  if (nextQuestion) return "low";
  if (tier === "Self-care with monitoring" || tier === "A&E today") return "medium";
  return "medium";
}

function reasoningForTier(session: TriageSession, tier: UrgencyTier, redFlags: RedFlag[]): string {
  if (redFlags.length > 0) return "A hard-coded red-flag pattern matched. The emergency override prevents down-triage.";
  const group = session.activeSymptomGroup ?? "other";
  const severity = session.presentingComplaint.severity0To10;
  if (tier === "A&E today") return `No hard emergency override matched, but ${group} symptoms and severity${severity !== null ? ` ${severity}/10` : ""} need same-day assessment.`;
  if (tier === "GP urgent appointment") return "No emergency pattern matched, but the symptom pattern should be assessed within 24 hours.";
  if (tier === "GP routine") return "Symptoms appear stable without emergency features, but clinician review this week may be appropriate.";
  return "Answers suggest mild, short-duration symptoms without red flags. Continue monitoring because symptoms can change.";
}

export function generateTellThemScript(session: TriageSession): string {
  const symptom = session.presentingComplaint.primarySymptom || "concerning symptoms";
  const pieces: string[] = [`I have ${symptom.toLowerCase()}`];
  const radiation = session.associatedSymptoms.painRadiation;
  if (radiation.length > 0) pieces.push(`spreading to ${radiation.map((item) => myBodyPart(item)).join(" and ")}`);
  if (session.associatedSymptoms.shortnessOfBreath) pieces.push("I feel short of breath");
  if (session.associatedSymptoms.sweating) pieces.push("I feel sweaty");
  if (session.associatedSymptoms.nausea) pieces.push("I feel nauseated");
  if (session.associatedSymptoms.dizziness) pieces.push("I feel lightheaded or dizzy");
  if (session.associatedSymptoms.neurologicalSymptoms.length > 0) {
    pieces.push(`I have ${session.associatedSymptoms.neurologicalSymptoms.join(", ").toLowerCase()}`);
  }
  if (session.associatedSymptoms.fever && session.freeTextNotes.toLowerCase().includes("stiff neck")) {
    pieces.push("I have fever with a stiff neck");
  }
  if (session.emergencyClarification.length > 0) {
    pieces.push(`I reported ${session.emergencyClarification.join(", ").toLowerCase()}`);
  }
  if (session.presentingComplaint.duration) pieces.push(`it has been happening for ${session.presentingComplaint.duration}`);
  if (session.presentingComplaint.severity0To10 !== null) pieces.push(`severity is ${session.presentingComplaint.severity0To10}/10`);
  return `${sentenceJoin(pieces)}.`;
}

function myBodyPart(value: string): string {
  const lower = value.toLowerCase();
  if (lower.includes("arm")) return `my ${lower}`;
  return `my ${lower}`;
}

function sentenceJoin(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? "I have concerning symptoms";
  const [first, ...rest] = parts;
  return `${first} ${rest.map((part, index) => (index === rest.length - 1 ? `and ${part}` : part)).join(", ")}`;
}

function noneProvided(values: string[]): string {
  return values.length ? values.join(", ") : "None provided";
}

function pregnancySummary(patient: Patient): string {
  if (isMaleSex(patient.sex)) return "Not applicable";
  return patient.pregnancyStatus || "Not provided";
}

export function generateProviderSummary(session: TriageSession, region: CareRegion = DEFAULT_CARE_REGION): string {
  return buildProviderSummary(session, region).fullText;
}

export function buildProviderSummary(session: TriageSession, region: CareRegion = DEFAULT_CARE_REGION): ProviderSummary {
  const finalized = sanitizePatientContext(session.triage.urgencyTier ? session : finalizeTriage(session));
  const tier = finalized.triage.urgencyTier ?? classifyUrgency(finalized);
  const pathway = localizePathway(CARE_PATHWAYS[tier], region);
  const associated = associatedSummary(finalized);
  const history = [
    finalized.patient.age !== null ? `Age: ${finalized.patient.age}` : "",
    ...finalized.patient.knownConditions,
    finalized.riskFactors.ageOver65 ? "Age over 65" : "",
    pregnancyPossible(finalized.patient.pregnancyStatus) ? `Pregnancy: ${finalized.patient.pregnancyStatus}` : ""
  ].filter(Boolean);
  const redFlags = finalized.triage.redFlagsDetected.map((flag) => flag.label);
  const timeline = [
    finalized.presentingComplaint.onset ? `Onset: ${finalized.presentingComplaint.onset}` : "",
    finalized.presentingComplaint.duration ? `Duration: ${finalized.presentingComplaint.duration}` : "",
    finalized.presentingComplaint.progression ? `Progression: ${finalized.presentingComplaint.progression}` : ""
  ]
    .filter(Boolean)
    .join("; ");
  const severity =
    finalized.presentingComplaint.severity0To10 === null ? "Not documented" : `${finalized.presentingComplaint.severity0To10}/10`;
  const tellThemScript = generateTellThemScript(finalized);
  const patientName = finalized.patient.name || "Not provided";
  const symptomDetails = [
    `Severity: ${severity}`,
    `Location: ${finalized.presentingComplaint.location || "Not documented"}`,
    `Character: ${finalized.presentingComplaint.character || "Not documented"}`,
    `Triggers: ${finalized.presentingComplaint.triggers.join(", ") || "Not documented"}`,
    `Relieving factors: ${finalized.presentingComplaint.relievingFactors.join(", ") || "Not documented"}`
  ];
  const rationale = finalized.triage.reasoningSummary ?? reasoningForTier(finalized, tier, finalized.triage.redFlagsDetected);
  const patientFacingSummary =
    tier === "Emergency services now"
      ? `${pathway.message} Tell the responder: "${tellThemScript}"`
      : `Based on the information provided, this is currently routed to ${pathway.title}. ${pathway.whenToEscalate}`;

  // The summary intentionally uses "may", "appears", and "based on what was shared" wording.
  // The app is a care-navigation aid, not a diagnostic product.
  const lines = [
    "Provider Summary",
    `Patient name: ${patientName}`,
    `Presenting complaint: ${finalized.presentingComplaint.primarySymptom || "Not documented"}`,
    "Timeline:",
    `- Onset: ${finalized.presentingComplaint.onset || "Not documented"}`,
    `- Duration: ${finalized.presentingComplaint.duration || "Not documented"}`,
    `- Progression: ${finalized.presentingComplaint.progression || "Not documented"}`,
    "Symptom details:",
    ...symptomDetails.map((item) => `- ${item}`),
    "Associated symptoms:",
    `- Positive: ${associated.join(", ") || "None documented"}`,
    `- Negative / denied: ${finalized.deniedSymptoms.join(", ") || "None documented"}`,
    "Relevant history:",
    `- Age: ${finalized.patient.age ?? "Not provided"}`,
    `- Pregnancy status: ${pregnancySummary(finalized.patient)}`,
    `- Known conditions: ${noneProvided(finalized.patient.knownConditions)}`,
    `- Medications: ${noneProvided(finalized.patient.medications)}`,
    `- Allergies: ${noneProvided(finalized.patient.allergies)}`,
    `- Recent trauma/surgery/travel: ${[
      finalized.riskFactors.recentTrauma ? "Recent trauma" : "",
      finalized.riskFactors.recentSurgery ? "Recent surgery" : ""
    ]
      .filter(Boolean)
      .join(", ") || "None documented"}`,
    `Red flags detected: ${redFlags.join(", ") || "None"}`,
    "AI urgency assessment:",
    `- Care level: ${pathway.title}`,
    `- Rationale: ${rationale}`,
    "Recommended care pathway:",
    `- ${pathway.message}`,
    "Patient instructions:",
    `- What to do now: ${pathway.whatToDoNow.join(" ")}`,
    `- What to tell the provider: ${pathway.whatToTellProvider.join(" ")}`,
    `- Red flags to watch for: ${pathway.redFlagsToWatch.join(" ")}`,
    `Tell them: "${tellThemScript}"`
  ];

  return {
    patientName,
    presentingComplaint: finalized.presentingComplaint.primarySymptom || "Not documented",
    symptomTimeline: timeline || "Not documented",
    severity,
    symptomDetails,
    associatedSymptoms: associated,
    negativeSymptoms: finalized.deniedSymptoms,
    relevantHistory: history,
    redFlagsDetected: redFlags,
    aiUrgencyAssessment: `${pathway.title}. ${rationale}`,
    recommendedCarePathway: pathway.message,
    patientInstructions: pathway.whatToDoNow,
    tellThemScript,
    patientFacingSummary,
    structuredSession: finalized,
    fullText: lines.join("\n")
  };
}

export function associatedSummary(session: TriageSession): string[] {
  return [
    session.associatedSymptoms.fever ? "Fever" : "",
    session.associatedSymptoms.shortnessOfBreath ? "Shortness of breath" : "",
    session.associatedSymptoms.chestPain ? "Chest pain" : "",
    session.associatedSymptoms.vomiting ? "Vomiting" : "",
    session.associatedSymptoms.rash ? "Rash" : "",
    session.associatedSymptoms.bleeding ? "Bleeding" : "",
    session.associatedSymptoms.lossOfConsciousness ? "Loss of consciousness or fainting" : "",
    session.associatedSymptoms.sweating ? "Sweating" : "",
    session.associatedSymptoms.nausea ? "Nausea" : "",
    session.associatedSymptoms.dizziness ? "Dizziness" : "",
    session.associatedSymptoms.confusion ? "Confusion" : "",
    ...session.associatedSymptoms.painRadiation.map((item) => `Pain spreading to ${item.toLowerCase()}`),
    ...session.associatedSymptoms.neurologicalSymptoms
  ].filter(Boolean);
}

export function shouldShowResult(session: TriageSession): boolean {
  return Boolean(session.triage.urgencyTier && (session.triage.redFlagsDetected.length > 0 || !getNextQuestion(session)));
}

export function answerPreview(question: Question, answer: AnswerValue): string {
  if (question.type === "scale") return `${answer}/10`;
  if (Array.isArray(answer)) return answer.join(", ");
  return String(answer ?? "");
}
