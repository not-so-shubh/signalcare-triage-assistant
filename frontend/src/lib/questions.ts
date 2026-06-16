import type { Question, SymptomGroup, TriageSession } from "./triageTypes";

export const SYMPTOM_OPTIONS = [
  "Chest pain",
  "Breathing problem",
  "Headache",
  "Fever",
  "Abdominal pain",
  "Something else"
];

export const QUESTIONS: Record<string, Question[]> = {
  intake: [
    {
      id: "primary_symptom",
      symptomGroup: "intake",
      text: "What symptom are you most concerned about today?",
      helperText: "Choose the closest match. You can describe something else in your own words.",
      type: "single",
      options: SYMPTOM_OPTIONS,
      required: true
    },
    {
      id: "other_description",
      symptomGroup: "other",
      text: "Tell me what is happening in a sentence or two.",
      helperText: "Include the main symptom, where it is, and what worries you most.",
      type: "text",
      required: true
    },
    {
      id: "emergency_screen",
      symptomGroup: "safety",
      text: "Before we continue: are you experiencing severe chest pain, trouble breathing, stroke-like symptoms, fainting, heavy bleeding, seizure, or sudden severe headache?",
      helperText:
        "If you are unsure, choose Not sure. The assistant will ask one focused safety check and route conservatively.",
      type: "single",
      options: ["Yes", "No", "Not sure"],
      required: true
    },
    {
      id: "emergency_clarify",
      symptomGroup: "safety",
      text: "Which of these best matches what is happening right now?",
      helperText: "Choose all that apply. If none apply, select None of these.",
      type: "multi",
      options: [
        "Severe chest pain",
        "Trouble breathing at rest",
        "Stroke-like symptoms",
        "Fainting or loss of consciousness",
        "Heavy uncontrolled bleeding",
        "Seizure",
        "Sudden severe headache",
        "Severe allergic reaction with swelling or breathing difficulty",
        "Suicidal intent or immediate self-harm risk",
        "None of these"
      ],
      required: true
    }
  ],
  chest: [
    {
      id: "chest_character",
      symptomGroup: "chest",
      text: "How would you describe the chest pain?",
      type: "single",
      options: ["Pressure", "Tightness", "Burning", "Sharp", "Aching", "Not sure"],
      required: true
    },
    {
      id: "chest_duration",
      symptomGroup: "chest",
      text: "How long has this been going on?",
      helperText: "Examples: 15 minutes, 2 hours, since yesterday.",
      type: "text",
      required: true
    },
    {
      id: "chest_sudden",
      symptomGroup: "chest",
      text: "Did it start suddenly?",
      type: "single",
      options: ["Yes", "No", "Not sure"],
      required: true
    },
    {
      id: "chest_radiation",
      symptomGroup: "chest",
      text: "Does the pain spread anywhere?",
      helperText: "Select all that apply.",
      type: "multi",
      options: ["Left arm", "Right arm", "Jaw", "Neck", "Back", "Shoulder", "No", "Not sure"],
      required: true
    },
    {
      id: "chest_associated",
      symptomGroup: "chest",
      text: "Are you also having any of these?",
      type: "multi",
      options: ["Shortness of breath", "Sweating", "Nausea", "Dizziness", "Fainting", "None"],
      required: true
    },
    {
      id: "chest_severity",
      symptomGroup: "chest",
      text: "How severe is it from 0 to 10?",
      type: "scale",
      required: true
    },
    {
      id: "chest_history",
      symptomGroup: "chest",
      text: "Do you have heart disease, diabetes, high blood pressure, or a history of blood clots?",
      type: "multi",
      options: ["Heart disease", "Diabetes", "High blood pressure", "History of blood clots", "None", "Not sure"],
      required: false
    }
  ],
  breathing: [
    {
      id: "breathing_rest",
      symptomGroup: "breathing",
      text: "Are you short of breath at rest?",
      type: "single",
      options: ["Yes", "No", "Not sure"],
      required: true
    },
    {
      id: "breathing_full_sentences",
      symptomGroup: "breathing",
      text: "Are you struggling to speak in full sentences?",
      type: "single",
      options: ["Yes", "No", "Not sure"],
      required: true
    },
    {
      id: "breathing_blue",
      symptomGroup: "breathing",
      text: "Do your lips or face look blue or grey?",
      type: "single",
      options: ["Yes", "No", "Not sure"],
      required: true
    },
    {
      id: "breathing_chest_pain",
      symptomGroup: "breathing",
      text: "Do you have chest pain with the breathing problem?",
      type: "single",
      options: ["Yes", "No", "Not sure"],
      required: true
    },
    {
      id: "breathing_onset_worsening",
      symptomGroup: "breathing",
      text: "Is this new, sudden, rapidly worsening, or different from usual?",
      type: "single",
      options: ["Yes", "No", "Not sure"],
      required: true
    },
    {
      id: "breathing_history",
      symptomGroup: "breathing",
      text: "Do you have asthma, COPD, heart disease, or a recent infection?",
      type: "multi",
      options: ["Asthma", "COPD", "Heart disease", "Recent infection", "None", "Not sure"],
      required: false
    },
    {
      id: "breathing_severity",
      symptomGroup: "breathing",
      text: "How severe is the breathing difficulty from 0 to 10?",
      type: "scale",
      required: true
    }
  ],
  headache: [
    {
      id: "headache_duration",
      symptomGroup: "headache",
      text: "How long has the headache been present?",
      type: "text",
      required: true
    },
    {
      id: "headache_sudden",
      symptomGroup: "headache",
      text: "Did the headache start suddenly and severely?",
      type: "single",
      options: ["Yes", "No", "Not sure"],
      required: true
    },
    {
      id: "headache_worst",
      symptomGroup: "headache",
      text: "Is it the worst headache of your life?",
      type: "single",
      options: ["Yes", "No", "Not sure"],
      required: true
    },
    {
      id: "headache_neuro",
      symptomGroup: "headache",
      text: "Do you have weakness, numbness, face drooping, speech difficulty, confusion, vision change, or trouble walking?",
      type: "multi",
      options: [
        "Weakness",
        "Numbness",
        "Face drooping",
        "Speech difficulty",
        "Confusion",
        "Vision change",
        "Trouble walking",
        "None"
      ],
      required: true
    },
    {
      id: "headache_fever_neck",
      symptomGroup: "headache",
      text: "Do you have fever, stiff neck, rash, or vomiting?",
      type: "multi",
      options: ["Fever", "Stiff neck", "Rash", "Vomiting", "None"],
      required: true
    },
    {
      id: "headache_head_injury",
      symptomGroup: "headache",
      text: "Was there a recent head injury?",
      type: "single",
      options: ["Yes", "No", "Not sure"],
      required: true
    },
    {
      id: "headache_different",
      symptomGroup: "headache",
      text: "Is this headache different from your usual headaches?",
      type: "single",
      options: ["Different", "Similar to previous headaches", "No usual headaches", "Not sure"],
      required: true
    },
    {
      id: "headache_severity",
      symptomGroup: "headache",
      text: "How severe is it from 0 to 10?",
      type: "scale",
      required: true
    }
  ],
  abdominal: [
    {
      id: "abdominal_location",
      symptomGroup: "abdominal",
      text: "Where is the abdominal pain?",
      type: "text",
      required: true
    },
    {
      id: "abdominal_duration",
      symptomGroup: "abdominal",
      text: "How long has it been present?",
      type: "text",
      required: true
    },
    {
      id: "abdominal_severity",
      symptomGroup: "abdominal",
      text: "How severe is it from 0 to 10?",
      type: "scale",
      required: true
    },
    {
      id: "abdominal_worse",
      symptomGroup: "abdominal",
      text: "Is it getting worse?",
      type: "single",
      options: ["Yes", "No", "Not sure"],
      required: true
    },
    {
      id: "abdominal_red_flags",
      symptomGroup: "abdominal",
      text: "Any vomiting blood, black stools, fainting, fever, or rigid abdomen?",
      type: "multi",
      options: ["Vomiting blood", "Black stools", "Fainting", "Fever", "Rigid abdomen", "None"],
      required: true
    },
    {
      id: "abdominal_pregnancy",
      symptomGroup: "abdominal",
      text: "Any chance of pregnancy?",
      type: "single",
      options: ["Yes", "No", "Not sure", "Not applicable"],
      required: false
    },
    {
      id: "abdominal_surgery_trauma",
      symptomGroup: "abdominal",
      text: "Any recent surgery or trauma?",
      type: "multi",
      options: ["Recent surgery", "Recent trauma", "None"],
      required: false
    }
  ],
  fever: [
    {
      id: "fever_warning",
      symptomGroup: "fever",
      text: "Any stiff neck, rash, confusion, extreme drowsiness, breathing difficulty, or dehydration?",
      type: "multi",
      options: ["Stiff neck", "Rash", "Confusion", "Extreme drowsiness", "Breathing difficulty", "Dehydration", "None"],
      required: true
    },
    {
      id: "fever_immuno",
      symptomGroup: "fever",
      text: "Any immune suppression, chemotherapy, transplant medication, or serious chronic illness?",
      type: "multi",
      options: ["Immune suppression", "Chemotherapy", "Transplant medication", "Serious chronic illness", "None"],
      required: false
    },
    {
      id: "fever_temperature",
      symptomGroup: "fever",
      text: "How high is the temperature?",
      helperText: "Use the value you know, or write Not measured.",
      type: "text",
      required: true
    },
    {
      id: "fever_duration",
      symptomGroup: "fever",
      text: "How long has the fever lasted?",
      type: "text",
      required: true
    },
    {
      id: "fever_worse",
      symptomGroup: "fever",
      text: "Any severe pain, worsening symptoms, or recent surgery?",
      type: "multi",
      options: ["Severe pain", "Worsening symptoms", "Recent surgery", "None"],
      required: false
    }
  ],
  other: [
    {
      id: "other_duration",
      symptomGroup: "other",
      text: "How long has this been happening?",
      type: "text",
      required: true
    },
    {
      id: "other_severity",
      symptomGroup: "other",
      text: "How severe is it from 0 to 10?",
      type: "scale",
      required: true
    },
    {
      id: "other_associated",
      symptomGroup: "other",
      text: "Are any of these happening with it?",
      type: "multi",
      options: [
        "Chest pain",
        "Shortness of breath",
        "Fever",
        "Vomiting",
        "Rash",
        "Bleeding",
        "Confusion",
        "Dizziness",
        "Painful urination",
        "Flank pain",
        "Cough",
        "Runny nose",
        "Sore throat",
        "None"
      ],
      required: true
    },
    {
      id: "other_history",
      symptomGroup: "other",
      text: "Any relevant medical history or current medications?",
      type: "text",
      required: false
    }
  ]
};

export function symptomGroupForPrimary(primary: string | null): SymptomGroup {
  const value = (primary ?? "").toLowerCase();
  if (value.includes("chest")) return "chest";
  if (value.includes("breath") || value.includes("shortness") || value.includes("wheez")) return "breathing";
  if (value.includes("head") || value.includes("migraine") || value.includes("neuro")) return "headache";
  if (value.includes("abdominal") || value.includes("stomach") || value.includes("belly")) return "abdominal";
  if (value.includes("fever") || value.includes("temperature") || value.includes("infection")) return "fever";
  return "other";
}

export function questionById(questionId: string): Question | undefined {
  return Object.values(QUESTIONS)
    .flat()
    .find((question) => question.id === questionId);
}

export function getQuestionsForSession(session: TriageSession): Question[] {
  const group = session.activeSymptomGroup ?? symptomGroupForPrimary(session.presentingComplaint.primarySymptom);
  return QUESTIONS[group] ?? QUESTIONS.other;
}

export function getNextQuestion(session: TriageSession): Question | null {
  const answeredIds = new Set(session.answers.map((answer) => answer.questionId));

  const primary = QUESTIONS.intake[0];
  if (!session.presentingComplaint.primarySymptom) return primary;

  const shouldAskOtherDescription =
    session.activeSymptomGroup === "other" &&
    !session.freeTextNotes.trim() &&
    !answeredIds.has("other_description");
  if (shouldAskOtherDescription) return QUESTIONS.intake[1];

  const emergencyScreen = QUESTIONS.intake[2];
  if (!session.aiExtraction && !answeredIds.has("emergency_screen")) return emergencyScreen;

  const safetyAnswer = session.answers.find((answer) => answer.questionId === "emergency_screen")?.answer;
  const needsClarification = safetyAnswer === "Yes" || safetyAnswer === "Not sure";
  if (needsClarification && !answeredIds.has("emergency_clarify")) return QUESTIONS.intake[3];

  return getQuestionsForSession(session).find((question) => !answeredIds.has(question.id) && !questionSatisfied(session, question)) ?? null;
}

export function questionProgress(session: TriageSession): { current: number; total: number } {
  const coreQuestions = getQuestionsForSession(session);
  const intakeCount = session.aiExtraction ? 1 : session.activeSymptomGroup === "other" ? 3 : 2;
  const clarificationCount = session.answers.some(
    (answer) => answer.questionId === "emergency_screen" && (answer.answer === "Yes" || answer.answer === "Not sure")
  )
    ? 1
    : 0;
  const total = intakeCount + clarificationCount + coreQuestions.length;
  const satisfiedCount = coreQuestions.filter((question) => questionSatisfied(session, question)).length;
  const current = Math.min(session.answers.length + satisfiedCount + 1, total);
  return { current, total };
}

export function questionSatisfied(session: TriageSession, question: Question): boolean {
  const denied = new Set(session.deniedSymptoms.map((item) => item.toLowerCase()));
  switch (question.id) {
    case "chest_character":
      return Boolean(session.presentingComplaint.character);
    case "chest_duration":
    case "headache_duration":
    case "abdominal_duration":
    case "fever_duration":
    case "other_duration":
      return Boolean(session.presentingComplaint.duration);
    case "chest_sudden":
    case "headache_sudden":
      return Boolean(session.presentingComplaint.onset);
    case "chest_radiation":
      return session.associatedSymptoms.painRadiation.length > 0 || denied.has("pain radiation");
    case "chest_associated":
      return Boolean(
        session.associatedSymptoms.shortnessOfBreath ||
          session.associatedSymptoms.sweating ||
          session.associatedSymptoms.nausea ||
          session.associatedSymptoms.dizziness ||
          session.associatedSymptoms.lossOfConsciousness
      );
    case "chest_severity":
    case "breathing_severity":
    case "headache_severity":
    case "abdominal_severity":
    case "other_severity":
      return session.presentingComplaint.severity0To10 !== null;
    case "headache_worst":
      return Boolean(session.presentingComplaint.character?.toLowerCase().includes("worst")) || denied.has("worst headache");
    case "headache_neuro":
      return session.associatedSymptoms.neurologicalSymptoms.length > 0 || denied.has("neurological symptoms");
    case "headache_fever_neck":
      return (
        Boolean(session.associatedSymptoms.fever || session.associatedSymptoms.rash || session.associatedSymptoms.vomiting) ||
        denied.has("fever") ||
        denied.has("stiff neck")
      );
    case "headache_different":
    case "abdominal_worse":
    case "breathing_onset_worsening":
      return Boolean(session.presentingComplaint.progression);
    case "abdominal_location":
      return Boolean(session.presentingComplaint.location);
    case "abdominal_pregnancy":
      return session.patient.sex?.toLowerCase() === "male" || Boolean(session.patient.pregnancyStatus);
    case "fever_warning":
      return Boolean(
        session.associatedSymptoms.rash ||
          session.associatedSymptoms.confusion ||
          session.associatedSymptoms.shortnessOfBreath ||
          denied.has("stiff neck") ||
          denied.has("rash") ||
          denied.has("confusion") ||
          denied.has("breathing difficulty")
      );
    case "other_associated":
      return (
        session.associatedSymptoms.neurologicalSymptoms.length > 0 ||
        Boolean(
          session.associatedSymptoms.chestPain ||
            session.associatedSymptoms.shortnessOfBreath ||
            session.associatedSymptoms.fever ||
            session.associatedSymptoms.vomiting ||
            session.associatedSymptoms.rash ||
            session.associatedSymptoms.bleeding ||
            session.associatedSymptoms.confusion
        )
      );
    default:
      return false;
  }
}
