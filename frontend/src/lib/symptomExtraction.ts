import { createEmptySession } from "./triageRules";
import type { TriageSession } from "./triageTypes";

function has(text: string, patterns: Array<string | RegExp>): boolean {
  return patterns.some((pattern) => (typeof pattern === "string" ? text.includes(pattern) : pattern.test(text)));
}

function denied(text: string, term: string): boolean {
  return new RegExp(`\\b(no|not|without|denies|deny)\\s+(?:any\\s+)?(?:${term})\\b`, "i").test(text);
}

function affirmed(text: string, patterns: Array<string | RegExp>, denialPattern: string): boolean {
  // AI-style extraction is useful for language understanding, but every extracted symptom is treated
  // as untrusted draft data. Basic negation handling prevents phrases such as "no vision changes"
  // from being converted into positive red flags before deterministic guardrails validate the case.
  return has(text, patterns) && !denied(text, denialPattern);
}

function addUnique(items: string[], value: string) {
  if (!items.includes(value)) items.push(value);
}

function extractDuration(text: string): string | null {
  const match = text.match(/\b(\d+)\s*(minute|minutes|min|mins|hour|hours|day|days|week|weeks)\b/i);
  if (!match) return null;
  const unit = match[2].startsWith("min") ? "minutes" : match[2];
  return `${match[1]} ${unit}`;
}

function extractSeverity(text: string): number | null {
  const score = text.match(/\b([0-9]|10)\s*(?:\/|out of)\s*10\b/i);
  if (score) return Number(score[1]);
  if (has(text, ["severe", "unbearable", "very bad"])) return 8;
  if (has(text, ["moderate"])) return 5;
  if (has(text, ["mild", "minor", "slight"])) return 3;
  return null;
}

function simulatedExtraction(input: string): Partial<TriageSession> {
  const text = input.toLowerCase();
  const session = createEmptySession();
  const positives: string[] = [];
  const deniedSymptoms: string[] = [];

  if (has(text, ["chest tightness", "chest pain", "chest pressure", "tight chest"])) {
    session.presentingComplaint.primarySymptom = has(text, ["tightness", "tight chest"]) ? "Chest tightness" : "Chest pain";
    session.activeSymptomGroup = "chest";
    session.associatedSymptoms.chestPain = true;
    addUnique(positives, "Chest pain or tightness");
  } else if (
    affirmed(
      text,
      ["short of breath", "breathing problem", "breathless", "can't breathe", "cannot breathe"],
      "shortness of breath|breathing problem|breathless|trouble breathing"
    )
  ) {
    session.presentingComplaint.primarySymptom = "Breathing problem";
    session.activeSymptomGroup = "breathing";
    session.associatedSymptoms.shortnessOfBreath = true;
    addUnique(positives, "Breathing difficulty");
  } else if (has(text, ["headache", "migraine", "head pain"])) {
    session.presentingComplaint.primarySymptom = "Headache";
    session.activeSymptomGroup = "headache";
  } else if (has(text, ["abdominal", "stomach", "belly"])) {
    session.presentingComplaint.primarySymptom = "Abdominal pain";
    session.activeSymptomGroup = "abdominal";
  } else if (affirmed(text, ["fever", "temperature", "infection"], "fever|temperature|infection")) {
    session.presentingComplaint.primarySymptom = "Fever";
    session.activeSymptomGroup = "fever";
    session.associatedSymptoms.fever = true;
  } else {
    session.presentingComplaint.primarySymptom = "Something else";
    session.activeSymptomGroup = "other";
  }

  const duration = extractDuration(text);
  if (duration) session.presentingComplaint.duration = duration;

  const severity = extractSeverity(text);
  if (severity !== null) session.presentingComplaint.severity0To10 = severity;

  if (has(text, ["sudden", "suddenly"])) session.presentingComplaint.onset = "Sudden";
  if (has(text, ["spreading", "radiating", "goes to"])) session.presentingComplaint.progression = "Spreading";
  if (has(text, ["getting worse", "worsening", "worse"])) session.presentingComplaint.progression = "Worsening";
  if (has(text, ["like ones i've had before", "like ones i have had before", "similar to previous", "usual headache"])) {
    session.presentingComplaint.progression = "Similar to previous headaches";
  }

  if (has(text, ["tightness", "tight"])) session.presentingComplaint.character = "Tightness";
  if (has(text, ["pressure"])) session.presentingComplaint.character = "Pressure";
  if (has(text, ["burning"])) session.presentingComplaint.character = "Burning";
  if (has(text, ["sharp"])) session.presentingComplaint.character = "Sharp";
  if (has(text, ["worst headache", "worst headache of my life", "worst headache of life"])) {
    session.presentingComplaint.character = "Worst headache of life";
    session.presentingComplaint.primarySymptom = "Headache";
    session.activeSymptomGroup = "headache";
  }

  if (has(text, ["left arm"])) session.associatedSymptoms.painRadiation.push("Left arm");
  if (has(text, ["right arm"])) session.associatedSymptoms.painRadiation.push("Right arm");
  if (has(text, ["jaw"])) session.associatedSymptoms.painRadiation.push("Jaw");
  if (has(text, ["neck"])) session.associatedSymptoms.painRadiation.push("Neck");
  if (has(text, ["back"])) session.associatedSymptoms.painRadiation.push("Back");
  if (has(text, ["shoulder"])) session.associatedSymptoms.painRadiation.push("Shoulder");

  if (affirmed(text, ["sweaty", "sweating", "clammy"], "sweaty|sweating|clammy")) session.associatedSymptoms.sweating = true;
  if (affirmed(text, ["nausea", "nauseous", "sick to my stomach"], "nausea|nauseous|sick")) {
    session.associatedSymptoms.nausea = true;
  }
  if (affirmed(text, ["dizzy", "lightheaded", "light headed"], "dizzy|dizziness|lightheaded|light headed")) {
    session.associatedSymptoms.dizziness = true;
  }
  if (
    affirmed(
      text,
      ["short of breath", "breathless", "can't breathe", "cannot breathe", "trouble breathing"],
      "shortness of breath|breathing difficulty|trouble breathing|breathless"
    )
  ) {
    session.associatedSymptoms.shortnessOfBreath = true;
  }
  if (affirmed(text, ["fainted", "passed out", "loss of consciousness"], "fainted|passed out|loss of consciousness")) {
    session.associatedSymptoms.lossOfConsciousness = true;
  }
  if (has(text, ["seizure", "convulsion"])) addUnique(session.emergencyClarification, "Seizure");
  if (affirmed(text, ["bleeding", "uncontrolled bleeding", "bleeding heavily"], "bleeding|uncontrolled bleeding")) {
    session.associatedSymptoms.bleeding = true;
  }
  if (affirmed(text, ["rash"], "rash")) session.associatedSymptoms.rash = true;
  if (affirmed(text, ["vomiting", "throwing up", "threw up"], "vomiting|throwing up")) session.associatedSymptoms.vomiting = true;
  if (affirmed(text, ["fever", "temperature"], "fever|temperature")) session.associatedSymptoms.fever = true;
  if (affirmed(text, ["confused", "confusion"], "confusion|confused")) session.associatedSymptoms.confusion = true;
  if (affirmed(text, ["stiff neck"], "stiff neck")) addUnique(positives, "Stiff neck");

  if (has(text, ["face drooping", "face droop"])) addUnique(session.associatedSymptoms.neurologicalSymptoms, "Face drooping");
  if (has(text, ["slurred speech", "speech difficulty", "can't speak"])) {
    addUnique(session.associatedSymptoms.neurologicalSymptoms, "Speech difficulty");
  }
  if (
    affirmed(
      text,
      ["weak on one side", "one-sided weakness", "one sided weakness", "arm weakness"],
      "weakness|weak on one side|one-sided weakness|one sided weakness|arm weakness"
    )
  ) {
    addUnique(session.associatedSymptoms.neurologicalSymptoms, "Weakness");
  }
  if (affirmed(text, ["numbness", "numb on one side"], "numbness|numb on one side")) {
    addUnique(session.associatedSymptoms.neurologicalSymptoms, "Numbness");
  }
  if (affirmed(text, ["vision loss", "vision changes", "trouble seeing"], "vision change|vision changes|vision loss|trouble seeing")) {
    addUnique(session.associatedSymptoms.neurologicalSymptoms, "Vision change");
  }
  if (affirmed(text, ["trouble walking", "loss of balance"], "trouble walking|loss of balance")) {
    addUnique(session.associatedSymptoms.neurologicalSymptoms, "Trouble walking");
  }

  if (has(text, ["allergic reaction", "anaphylaxis"])) addUnique(positives, "Allergic reaction");
  if (has(text, ["swelling", "swollen"])) addUnique(positives, "Swelling");
  if (has(text, ["want to hurt myself", "kill myself", "suicidal", "self harm", "self-harm"])) {
    addUnique(session.emergencyClarification, "Suicidal intent or immediate self-harm risk");
  }

  if (has(text, ["heart disease", "heart problem", "blood pressure", "blood clot"])) session.riskFactors.cardiacHistory = true;
  if (has(text, ["diabetes"])) session.riskFactors.diabetes = true;
  if (has(text, ["stroke history", "previous stroke"])) session.riskFactors.strokeHistory = true;
  if (has(text, ["chemotherapy", "transplant", "immunosuppressed", "immune suppressed"])) {
    session.riskFactors.immunosuppressed = true;
  }
  if (has(text, ["recent surgery"])) session.riskFactors.recentSurgery = true;
  if (has(text, ["recent trauma", "injury", "fall", "head injury"])) session.riskFactors.recentTrauma = true;

  [
    ["weakness", "weakness"],
    ["vision change|vision changes|vision loss", "vision change"],
    ["fever", "fever"],
    ["stiff neck", "stiff neck"],
    ["rash", "rash"],
    ["confusion|confused", "confusion"],
    ["breathing difficulty|shortness of breath|trouble breathing", "breathing difficulty"],
    ["neurological symptoms", "neurological symptoms"]
  ].forEach(([pattern, label]) => {
    if (denied(text, pattern)) addUnique(deniedSymptoms, label);
  });

  if (deniedSymptoms.includes("weakness") && deniedSymptoms.includes("vision change")) {
    addUnique(deniedSymptoms, "neurological symptoms");
  }

  session.deniedSymptoms = deniedSymptoms;
  session.freeTextNotes = positives.join("; ");
  session.aiExtraction = {
    sourceText: input,
    extractedAt: new Date().toISOString(),
    reviewed: false,
    confidenceNotes: [
      "Local simulated extraction used because no LLM API is configured.",
      "AI output is treated as a draft and re-checked by deterministic emergency rules."
    ]
  };

  return session;
}

export async function extractSymptomsFromText(input: string): Promise<Partial<TriageSession>> {
  const llmEndpoint = import.meta.env.VITE_SIGNALCARE_LLM_ENDPOINT as string | undefined;

  // A real LLM, if configured, may help with language understanding only. Its response must never
  // decide urgency directly; the caller merges the result and reruns deterministic guardrails.
  if (llmEndpoint) {
    try {
      const response = await fetch(llmEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input })
      });
      if (response.ok) return (await response.json()) as Partial<TriageSession>;
    } catch {
      // Fall through to the local extractor so the MVP remains deterministic and offline-capable.
    }
  }

  return simulatedExtraction(input);
}
