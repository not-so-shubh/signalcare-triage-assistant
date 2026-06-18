import { DEFAULT_CARE_REGION } from "./careTerminology";
import { createDemoSessionBase, DEMO_DEFINITIONS, getDemoSession } from "./demoCases";
import { getNextQuestion } from "./questions";
import { extractSymptomsFromText } from "./symptomExtraction";
import {
  applyAnswerToSession,
  buildProviderSummary,
  createEmptySession,
  finalizeTriage,
  mergeExtractedSession,
  sanitizePatientContext,
  updatePatientContext
} from "./triageRules";
import type {
  AnswerValue,
  EvaluationMetrics,
  TriageSession,
  TriageTestCase,
  TriageTestResult,
  UrgencyTier
} from "./triageTypes";

export type PatientContextTestResult = {
  id: string;
  name: string;
  passed: boolean;
  details: string;
};

function sessionFromAnswers(answers: Array<[string, AnswerValue]>): TriageSession {
  const session = answers.reduce(
    (current, [questionId, answer]) => applyAnswerToSession(current, questionId, answer),
    createEmptySession()
  );
  return finalizeTriage(session);
}

function testCase(
  id: string,
  name: string,
  inputSummary: string,
  expectedTier: UrgencyTier,
  answers: Array<[string, AnswerValue]>
): TriageTestCase {
  return {
    id,
    name,
    inputSummary,
    expectedTier,
    session: sessionFromAnswers(answers)
  };
}

export const TRIAGE_TEST_CASES: TriageTestCase[] = [
  testCase("chest_arm_sweating", "Chest pain + left arm pain + sweating", "Chest pain, left arm radiation, sweating, 8/10", "Emergency services now", [
    ["primary_symptom", "Chest pain"],
    ["emergency_screen", "No"],
    ["chest_radiation", ["Left arm"]],
    ["chest_associated", ["Sweating"]],
    ["chest_severity", 8]
  ]),
  testCase("chest_jaw", "Chest pain + jaw pain", "Chest pain spreading to jaw", "Emergency services now", [
    ["primary_symptom", "Chest pain"],
    ["emergency_screen", "No"],
    ["chest_radiation", ["Jaw"]],
    ["chest_associated", ["None"]],
    ["chest_severity", 6]
  ]),
  testCase("chest_breathing", "Chest pain + shortness of breath", "Chest pain with shortness of breath", "Emergency services now", [
    ["primary_symptom", "Chest pain"],
    ["emergency_screen", "No"],
    ["chest_radiation", ["No"]],
    ["chest_associated", ["Shortness of breath"]],
    ["chest_severity", 5]
  ]),
  testCase("chest_fainting", "Chest pain + fainting", "Chest pain with fainting", "Emergency services now", [
    ["primary_symptom", "Chest pain"],
    ["emergency_screen", "No"],
    ["chest_radiation", ["No"]],
    ["chest_associated", ["Fainting"]],
    ["chest_severity", 5]
  ]),
  testCase("stroke_face_speech", "Sudden face droop + slurred speech", "Sudden face droop and slurred speech", "Emergency services now", [
    ["primary_symptom", "Something else"],
    ["other_description", "Sudden face droop and slurred speech"],
    ["emergency_screen", "No"],
    ["other_duration", "20 minutes"],
    ["other_severity", 6],
    ["other_associated", ["None"]]
  ]),
  testCase("one_sided_weakness", "Sudden one-sided weakness", "Sudden one-sided weakness", "Emergency services now", [
    ["primary_symptom", "Something else"],
    ["other_description", "Sudden one-sided weakness"],
    ["emergency_screen", "No"],
    ["other_duration", "15 minutes"],
    ["other_severity", 5],
    ["other_associated", ["None"]]
  ]),
  testCase("vision_loss", "Sudden vision loss", "Sudden vision loss in one eye", "Emergency services now", [
    ["primary_symptom", "Something else"],
    ["other_description", "Sudden vision loss in one eye"],
    ["emergency_screen", "No"],
    ["other_duration", "10 minutes"],
    ["other_severity", 5],
    ["other_associated", ["None"]]
  ]),
  testCase("trouble_walking", "Sudden trouble walking or loss of balance", "Sudden trouble walking and loss of balance", "Emergency services now", [
    ["primary_symptom", "Something else"],
    ["other_description", "Sudden trouble walking and loss of balance"],
    ["emergency_screen", "No"],
    ["other_duration", "30 minutes"],
    ["other_severity", 5],
    ["other_associated", ["None"]]
  ]),
  testCase("worst_headache", "Sudden severe worst headache", "Sudden worst headache of life, 9/10", "Emergency services now", [
    ["primary_symptom", "Headache"],
    ["emergency_screen", "No"],
    ["headache_duration", "10 minutes"],
    ["headache_sudden", "Yes"],
    ["headache_worst", "Yes"],
    ["headache_neuro", ["None"]],
    ["headache_severity", 9]
  ]),
  testCase("seizure", "Seizure", "Witnessed seizure", "Emergency services now", [
    ["primary_symptom", "Something else"],
    ["other_description", "Witnessed seizure"],
    ["emergency_screen", "No"],
    ["other_duration", "Just now"],
    ["other_severity", 7],
    ["other_associated", ["None"]]
  ]),
  testCase("loss_consciousness", "Loss of consciousness", "Passed out with loss of consciousness", "Emergency services now", [
    ["primary_symptom", "Something else"],
    ["other_description", "Passed out with loss of consciousness"],
    ["emergency_screen", "No"],
    ["other_duration", "5 minutes ago"],
    ["other_severity", 6],
    ["other_associated", ["None"]]
  ]),
  testCase("allergy_swelling_breathing", "Severe allergic reaction with swelling and breathing difficulty", "Allergic reaction, swelling, trouble breathing", "Emergency services now", [
    ["primary_symptom", "Something else"],
    ["other_description", "Severe allergic reaction with swelling and trouble breathing"],
    ["emergency_screen", "No"],
    ["other_duration", "20 minutes"],
    ["other_severity", 7],
    ["other_associated", ["Shortness of breath"]]
  ]),
  testCase("heavy_bleeding", "Heavy uncontrolled bleeding", "Heavy uncontrolled bleeding", "Emergency services now", [
    ["primary_symptom", "Something else"],
    ["other_description", "Heavy uncontrolled bleeding"],
    ["emergency_screen", "No"],
    ["other_duration", "Now"],
    ["other_severity", 7],
    ["other_associated", ["Bleeding"]]
  ]),
  testCase("fever_confusion", "Fever with confusion", "Fever with confusion", "Emergency services now", [
    ["primary_symptom", "Fever"],
    ["emergency_screen", "No"],
    ["fever_temperature", "39 C"],
    ["fever_duration", "1 day"],
    ["fever_warning", ["Confusion"]]
  ]),
  testCase("fever_stiff_neck_rash", "Fever + stiff neck + rash", "Fever with stiff neck and rash", "Emergency services now", [
    ["primary_symptom", "Fever"],
    ["emergency_screen", "No"],
    ["fever_temperature", "39 C"],
    ["fever_duration", "1 day"],
    ["fever_warning", ["Stiff neck", "Rash"]]
  ]),
  testCase("self_harm", "Suicidal intent or immediate self-harm risk", "Patient says they want to hurt themselves now", "Emergency services now", [
    ["primary_symptom", "Something else"],
    ["other_description", "I want to hurt myself now"],
    ["emergency_screen", "No"],
    ["other_duration", "Now"],
    ["other_severity", 8],
    ["other_associated", ["None"]]
  ]),
  testCase("severe_abdominal", "Severe worsening abdominal pain", "Abdominal pain, worsening, 8/10", "A&E today", [
    ["primary_symptom", "Abdominal pain"],
    ["emergency_screen", "No"],
    ["abdominal_location", "Lower right abdomen"],
    ["abdominal_duration", "12 hours"],
    ["abdominal_severity", 8],
    ["abdominal_worse", "Yes"],
    ["abdominal_red_flags", ["None"]]
  ]),
  testCase("head_injury_vomiting", "Head injury with vomiting", "Recent head injury with vomiting", "A&E today", [
    ["primary_symptom", "Headache"],
    ["emergency_screen", "No"],
    ["headache_duration", "2 hours"],
    ["headache_sudden", "No"],
    ["headache_worst", "No"],
    ["headache_neuro", ["None"]],
    ["headache_fever_neck", ["Vomiting"]],
    ["headache_head_injury", "Yes"],
    ["headache_different", "Different"],
    ["headache_severity", 6]
  ]),
  testCase("possible_fracture", "Possible fracture", "Possible fracture with deformity", "A&E today", [
    ["primary_symptom", "Something else"],
    ["other_description", "Possible fracture with deformity"],
    ["emergency_screen", "No"],
    ["other_duration", "1 hour"],
    ["other_severity", 6],
    ["other_associated", ["None"]]
  ]),
  testCase("vomiting_dehydration", "Persistent vomiting with dehydration", "Repeated vomiting and dehydration risk", "A&E today", [
    ["primary_symptom", "Something else"],
    ["other_description", "Persistent vomiting with dehydration"],
    ["emergency_screen", "No"],
    ["other_duration", "1 day"],
    ["other_severity", 6],
    ["other_associated", ["Vomiting"]]
  ]),
  testCase("moderate_breathing", "Moderate breathing difficulty without severe red flags", "Short of breath, moderate, speaking normally", "A&E today", [
    ["primary_symptom", "Breathing problem"],
    ["emergency_screen", "No"],
    ["breathing_rest", "Yes"],
    ["breathing_full_sentences", "No"],
    ["breathing_blue", "No"],
    ["breathing_chest_pain", "No"],
    ["breathing_onset_worsening", "Yes"],
    ["breathing_severity", 5]
  ]),
  testCase("urination_fever_flank", "Painful urination + fever + flank pain", "Painful urination, fever, flank pain", "GP urgent appointment", [
    ["primary_symptom", "Something else"],
    ["other_description", "Painful urination with fever and flank pain"],
    ["emergency_screen", "No"],
    ["other_duration", "2 days"],
    ["other_severity", 5],
    ["other_associated", ["Fever", "Painful urination", "Flank pain"]]
  ]),
  testCase("fever_several_days", "Fever lasting several days", "Fever for 4 days, no stiff neck or confusion", "GP urgent appointment", [
    ["primary_symptom", "Fever"],
    ["emergency_screen", "No"],
    ["fever_temperature", "38.5 C"],
    ["fever_duration", "4 days"],
    ["fever_warning", ["None"]]
  ]),
  testCase("worsening_infection", "Worsening infection symptoms", "Fever with worsening symptoms", "GP urgent appointment", [
    ["primary_symptom", "Fever"],
    ["emergency_screen", "No"],
    ["fever_temperature", "38 C"],
    ["fever_duration", "2 days"],
    ["fever_warning", ["None"]],
    ["fever_worse", ["Worsening symptoms"]]
  ]),
  testCase("asthma_inhaler", "Moderate asthma-like symptoms responding to inhaler", "Wheeze with asthma, inhaler helps, no severe breathing signs", "GP urgent appointment", [
    ["primary_symptom", "Breathing problem"],
    ["emergency_screen", "No"],
    ["breathing_rest", "No"],
    ["breathing_full_sentences", "No"],
    ["breathing_blue", "No"],
    ["breathing_chest_pain", "No"],
    ["breathing_onset_worsening", "No"],
    ["breathing_history", ["Asthma"]],
    ["breathing_severity", 4]
  ]),
  testCase("worsening_chronic", "Worsening chronic condition", "Known chronic condition getting worse", "GP urgent appointment", [
    ["primary_symptom", "Something else"],
    ["other_description", "Worsening chronic condition with diabetes worse than usual"],
    ["emergency_screen", "No"],
    ["other_duration", "3 days"],
    ["other_severity", 5],
    ["other_associated", ["None"]]
  ]),
  testCase("mild_sore_throat", "Mild sore throat, no fever", "Mild sore throat for one day, no fever", "Self-care with monitoring", [
    ["primary_symptom", "Something else"],
    ["other_description", "Minor sore throat"],
    ["emergency_screen", "No"],
    ["other_duration", "1 day"],
    ["other_severity", 2],
    ["other_associated", ["Sore throat"]]
  ]),
  testCase("mild_cold", "Mild cold symptoms", "Cough and runny nose, no breathing difficulty", "Self-care with monitoring", [
    ["primary_symptom", "Something else"],
    ["other_description", "Cough and runny nose"],
    ["emergency_screen", "No"],
    ["other_duration", "1 day"],
    ["other_severity", 2],
    ["other_associated", ["Cough", "Runny nose"]]
  ]),
  testCase("mild_recurring_headache", "Mild recurring headache with no red flags", "Mild headache like previous, no neuro symptoms", "Self-care with monitoring", [
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
  ]),
  testCase("minor_muscle_strain", "Minor muscle strain", "Minor muscle strain, improving", "Self-care with monitoring", [
    ["primary_symptom", "Something else"],
    ["other_description", "Minor muscle strain improving"],
    ["emergency_screen", "No"],
    ["other_duration", "1 day"],
    ["other_severity", 3],
    ["other_associated", ["None"]]
  ]),
  testCase("mild_stomach_upset", "Mild stomach upset improving", "Mild stomach upset that is improving", "Self-care with monitoring", [
    ["primary_symptom", "Abdominal pain"],
    ["emergency_screen", "No"],
    ["abdominal_location", "General stomach"],
    ["abdominal_duration", "1 day"],
    ["abdominal_severity", 2],
    ["abdominal_worse", "No"],
    ["abdominal_red_flags", ["None"]]
  ]),
  testCase("skin_change", "Non-urgent skin change", "Stable skin change for weeks", "GP routine", [
    ["primary_symptom", "Something else"],
    ["other_description", "Non-urgent skin change for weeks"],
    ["emergency_screen", "No"],
    ["other_duration", "3 weeks"],
    ["other_severity", 1],
    ["other_associated", ["None"]]
  ]),
  testCase("medication_question", "Medication question", "Medication question without acute symptoms", "GP routine", [
    ["primary_symptom", "Something else"],
    ["other_description", "Medication question about side effect"],
    ["emergency_screen", "No"],
    ["other_duration", "1 week"],
    ["other_severity", 1],
    ["other_associated", ["None"]]
  ])
];

export function runTriageTestSuite(): TriageTestResult[] {
  const results = TRIAGE_TEST_CASES.map((testCase) => {
    const actualTier = testCase.session.triage.urgencyTier as UrgencyTier;
    const redFlags = testCase.session.triage.redFlagsDetected.map((flag) => flag.label);
    return {
      id: testCase.id,
      name: testCase.name,
      inputSummary: testCase.inputSummary,
      expectedTier: testCase.expectedTier,
      actualTier,
      passed: actualTier === testCase.expectedTier,
      redFlags,
      expectedEmergency: testCase.expectedTier === "Emergency services now",
      redFlagCase: redFlags.length > 0
    };
  });

  console.group("SignalCare deterministic triage test suite");
  console.table(
    results.map((result) => ({
      Case: result.name,
      Expected: result.expectedTier,
      Actual: result.actualTier,
      Passed: result.passed ? "PASS" : "FAIL",
      "Red flags": result.redFlags.join("; ") || "None"
    }))
  );
  console.log(`${results.filter((result) => result.passed).length}/${results.length} tests passed`);
  console.groupEnd();

  return results;
}

function patientContextResult(id: string, name: string, passed: boolean, details: string): PatientContextTestResult {
  return { id, name, passed, details };
}

function abdominalPregnancySession(severity: number): TriageSession {
  let session = updatePatientContext(createEmptySession(), { sex: "Female", pregnancyStatus: "Pregnant" });
  session = applyAnswerToSession(session, "primary_symptom", "Abdominal pain");
  session = applyAnswerToSession(session, "emergency_screen", "No");
  session = applyAnswerToSession(session, "abdominal_location", "Lower abdomen");
  session = applyAnswerToSession(session, "abdominal_duration", "2 hours");
  session = applyAnswerToSession(session, "abdominal_severity", severity);
  session = applyAnswerToSession(session, "abdominal_worse", "No");
  session = applyAnswerToSession(session, "abdominal_red_flags", ["None"]);
  return finalizeTriage(session);
}

export function runPatientContextTestSuite(): PatientContextTestResult[] {
  const malePregnant = updatePatientContext(createEmptySession(), { sex: "Male", pregnancyStatus: "Pregnant" });
  const femalePregnant = updatePatientContext(createEmptySession(), { sex: "Female", pregnancyStatus: "Pregnant" });
  const switchedToMale = updatePatientContext(femalePregnant, { sex: "Male" });
  const severePregnantAbdominal = abdominalPregnancySession(8);

  let pregnantBleeding = updatePatientContext(createEmptySession(), { sex: "Female", pregnancyStatus: "Pregnant" });
  pregnantBleeding = applyAnswerToSession(pregnantBleeding, "primary_symptom", "Something else");
  pregnantBleeding = applyAnswerToSession(pregnantBleeding, "other_description", "Heavy bleeding while pregnant");
  pregnantBleeding = applyAnswerToSession(pregnantBleeding, "emergency_screen", "No");
  pregnantBleeding = applyAnswerToSession(pregnantBleeding, "other_duration", "Now");
  pregnantBleeding = applyAnswerToSession(pregnantBleeding, "other_severity", 7);
  pregnantBleeding = applyAnswerToSession(pregnantBleeding, "other_associated", ["Bleeding"]);
  pregnantBleeding = finalizeTriage(pregnantBleeding);

  const emptySummary = buildProviderSummary(createEmptySession(), DEFAULT_CARE_REGION).fullText;
  const sanitizedAge = updatePatientContext(createEmptySession(), { age: 150 }).patient.age;
  const sanitizedZeroAge = updatePatientContext(createEmptySession(), { age: 0 }).patient.age;
  const sanitizedNegativeAge = updatePatientContext(createEmptySession(), { age: -4 }).patient.age;
  const sanitizedImported = sanitizePatientContext({
    ...createEmptySession(),
    patient: {
      ...createEmptySession().patient,
      sex: "Male",
      pregnancyStatus: "Pregnant",
      medications: ["Optional"],
      allergies: ["Optional"]
    }
  });

  const results = [
    patientContextResult(
      "default_region_india",
      "Default region is India",
      DEFAULT_CARE_REGION === "india",
      `Default region: ${DEFAULT_CARE_REGION}`
    ),
    patientContextResult(
      "male_pregnancy_sanitized",
      "Male + pregnant input is sanitized",
      malePregnant.patient.sex === "Male" && malePregnant.patient.pregnancyStatus === null,
      `Pregnancy status: ${malePregnant.patient.pregnancyStatus ?? "null"}`
    ),
    patientContextResult(
      "male_switch_clears_pregnancy",
      "Changing Female/Pregnant to Male clears pregnancy",
      switchedToMale.patient.sex === "Male" && switchedToMale.patient.pregnancyStatus === null,
      `Pregnancy status after switch: ${switchedToMale.patient.pregnancyStatus ?? "null"}`
    ),
    patientContextResult(
      "pregnant_severe_abdominal_same_day",
      "Pregnant + severe abdominal pain routes to at least emergency department today",
      ["A&E today", "Emergency services now"].includes(severePregnantAbdominal.triage.urgencyTier ?? ""),
      `Actual tier: ${severePregnantAbdominal.triage.urgencyTier}`
    ),
    patientContextResult(
      "pregnant_heavy_bleeding_emergency",
      "Pregnant + heavy bleeding routes to emergency services now",
      pregnantBleeding.triage.urgencyTier === "Emergency services now",
      `Actual tier: ${pregnantBleeding.triage.urgencyTier}`
    ),
    patientContextResult(
      "empty_meds_allergies_no_placeholder",
      "Empty medications/allergies do not appear as Optional",
      !emptySummary.includes("Optional"),
      "Provider summary contains no Optional placeholder text"
    ),
    patientContextResult(
      "empty_conditions_no_placeholder",
      "Empty known conditions do not appear as Diabetes, asthma",
      !emptySummary.includes("Diabetes, asthma"),
      "Provider summary contains no known-condition placeholder text"
    ),
    patientContextResult(
      "age_clamped",
      "Age above 120 is clamped",
      sanitizedAge === 120,
      `Sanitized age: ${sanitizedAge}`
    ),
    patientContextResult(
      "age_below_one_rejected",
      "Age below 1 is treated as not provided",
      sanitizedZeroAge === null && sanitizedNegativeAge === null,
      `Age 0: ${sanitizedZeroAge ?? "null"}, age -4: ${sanitizedNegativeAge ?? "null"}`
    ),
    patientContextResult(
      "imported_patient_context_sanitized",
      "Imported male/pregnant and placeholder context is sanitized",
      sanitizedImported.patient.pregnancyStatus === null &&
        sanitizedImported.patient.medications.length === 0 &&
        sanitizedImported.patient.allergies.length === 0,
      `Pregnancy: ${sanitizedImported.patient.pregnancyStatus ?? "null"}, meds: ${sanitizedImported.patient.medications.length}, allergies: ${sanitizedImported.patient.allergies.length}`
    )
  ];

  console.group("SignalCare patient context validation suite");
  console.table(
    results.map((result) => ({
      Case: result.name,
      Passed: result.passed ? "PASS" : "FAIL",
      Details: result.details
    }))
  );
  console.log(`${results.filter((result) => result.passed).length}/${results.length} patient-context tests passed`);
  console.groupEnd();

  return results;
}

export async function runDemoContextTestSuite(): Promise<PatientContextTestResult[]> {
  const emergencyBase = createDemoSessionBase("emergency_chest_pain");
  const emergencyDemo = getDemoSession("emergency_chest_pain");
  const lowHeadacheSession = getDemoSession("low_urgency_headache");
  const feverSession = getDemoSession("ambiguous_fever");
  const feverNextQuestion = getNextQuestion(feverSession);
  const resetSession = createEmptySession();
  const placeholderStrings = [
    "optional",
    "diabetes, asthma",
    "example: diabetes, asthma",
    "example: metformin",
    "example: penicillin",
    "leave blank if none"
  ];
  const demoPatientText = DEMO_DEFINITIONS.map((demo) =>
    [
      demo.patient.age?.toString() ?? "",
      demo.patient.name ?? "",
      demo.patient.sex ?? "",
      demo.patient.pregnancyStatus ?? "",
      ...demo.patient.knownConditions,
      ...demo.patient.medications,
      ...demo.patient.allergies
    ]
      .join(" ")
      .toLowerCase()
  ).join(" ");

  const results = [
    patientContextResult(
      "demo_emergency_context_realistic",
      "Emergency chest pain demo includes realistic patient context",
      emergencyDemo.patient.age === 58 &&
        emergencyDemo.patient.name === "Raj Mehta" &&
        emergencyDemo.patient.sex === "Male" &&
        emergencyDemo.patient.knownConditions.includes("High blood pressure") &&
        emergencyDemo.patient.knownConditions.includes("High cholesterol") &&
        emergencyDemo.patient.medications.includes("Amlodipine") &&
        emergencyDemo.patient.allergies.includes("None known") &&
        emergencyDemo.triage.urgencyTier === "Emergency services now",
      `Patient: ${emergencyDemo.patient.name}, ${emergencyDemo.patient.age}, ${emergencyDemo.patient.sex}, ${emergencyDemo.patient.knownConditions.join(", ")}`
    ),
    patientContextResult(
      "demo_launch_no_ai_extraction_path",
      "Demo launch sessions do not use AI extraction",
      [emergencyDemo, lowHeadacheSession, feverSession].every((session) => session.aiExtraction === null),
      `AI extraction states: ${[emergencyDemo, lowHeadacheSession, feverSession].map((session) => session.aiExtraction?.sourceText ?? "null").join(", ")}`
    ),
    patientContextResult(
      "demo_male_pregnancy_sanitized",
      "Male demo patient cannot have pregnancy status",
      emergencyBase.patient.sex === "Male" && emergencyBase.patient.pregnancyStatus === null,
      `Pregnancy status: ${emergencyBase.patient.pregnancyStatus ?? "null"}`
    ),
    patientContextResult(
      "demo_low_headache_denials_respected",
      "Low-headache demo does not trigger emergency",
      lowHeadacheSession.triage.urgencyTier === "Self-care with monitoring" &&
        lowHeadacheSession.triage.redFlagsDetected.length === 0,
      `Tier: ${lowHeadacheSession.triage.urgencyTier}, red flags: ${lowHeadacheSession.triage.redFlagsDetected.length}`
    ),
    patientContextResult(
      "demo_fever_reaches_warning_question",
      "Ambiguous fever demo reaches fever-specific safety question",
      feverSession.presentingComplaint.primarySymptom === "Fever" &&
        feverNextQuestion?.id === "fever_warning" &&
        feverSession.patient.name === "Priya Sharma",
      `Next question: ${feverNextQuestion?.id ?? "none"}, patient: ${feverSession.patient.name ?? "none"}`
    ),
    patientContextResult(
      "demo_context_no_placeholder_strings",
      "Demo patient context does not contain placeholder strings",
      placeholderStrings.every((placeholder) => !demoPatientText.includes(placeholder)),
      "Demo patients contain only saved clinical context, not UI placeholders"
    ),
    patientContextResult(
      "reset_creates_empty_patient_context",
      "Start/reset creates empty patient context again",
      resetSession.patient.age === null &&
        resetSession.patient.name === null &&
        resetSession.patient.sex === null &&
        resetSession.patient.pregnancyStatus === null &&
        resetSession.patient.knownConditions.length === 0 &&
        resetSession.patient.medications.length === 0 &&
        resetSession.patient.allergies.length === 0,
      `Patient reset: name ${resetSession.patient.name ?? "null"}, age ${resetSession.patient.age ?? "null"}, conditions ${resetSession.patient.knownConditions.length}`
    )
  ];

  console.group("SignalCare demo context validation suite");
  console.table(
    results.map((result) => ({
      Case: result.name,
      Passed: result.passed ? "PASS" : "FAIL",
      Details: result.details
    }))
  );
  console.log(`${results.filter((result) => result.passed).length}/${results.length} demo-context tests passed`);
  console.groupEnd();

  return results;
}

export async function runPatientNameTestSuite(): Promise<PatientContextTestResult[]> {
  const mildHeadacheAnswers: Array<[string, AnswerValue]> = [
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
  ];
  const namedBase = updatePatientContext(createEmptySession(), { name: "  Priya   Sharma  " });
  const unnamedOutcome = sessionFromAnswers(mildHeadacheAnswers).triage.urgencyTier;
  const namedOutcome = finalizeTriage(
    mildHeadacheAnswers.reduce(
      (current, [questionId, answer]) => applyAnswerToSession(current, questionId, answer),
      namedBase
    )
  ).triage.urgencyTier;
  const placeholderNames = ["Example: Priya Sharma", "Optional", "Patient name"].map(
    (value) => updatePatientContext(createEmptySession(), { name: value }).patient.name
  );
  const longName = `${"A".repeat(88)} Sharma`;
  const cappedName = updatePatientContext(createEmptySession(), { name: longName }).patient.name;
  const namedSummary = buildProviderSummary(namedBase, DEFAULT_CARE_REGION).fullText;
  const blankSummary = buildProviderSummary(createEmptySession(), DEFAULT_CARE_REGION).fullText;
  const resetSession = createEmptySession();
  const expectedDemoNames = new Map([
    ["emergency_chest_pain", "Raj Mehta"],
    ["low_urgency_headache", "Ananya Rao"],
    ["ambiguous_fever", "Priya Sharma"]
  ]);

  const results = [
    patientContextResult(
      "blank_patient_has_no_name",
      "Blank patient has no name",
      createEmptySession().patient.name === null,
      `Name: ${createEmptySession().patient.name ?? "null"}`
    ),
    patientContextResult(
      "placeholder_name_sanitized",
      "Placeholder-looking names are sanitized away",
      placeholderNames.every((value) => value === null),
      `Sanitized placeholders: ${placeholderNames.map((value) => value ?? "null").join(", ")}`
    ),
    patientContextResult(
      "long_name_capped",
      "Long patient name is capped",
      cappedName !== null && cappedName.length === 80,
      `Length: ${cappedName?.length ?? 0}`
    ),
    patientContextResult(
      "demo_cases_include_names",
      "Demo cases include expected patient names",
      DEMO_DEFINITIONS.every((demo) => createDemoSessionBase(demo.id).patient.name === expectedDemoNames.get(demo.id)),
      DEMO_DEFINITIONS.map((demo) => `${demo.id}: ${createDemoSessionBase(demo.id).patient.name}`).join("; ")
    ),
    patientContextResult(
      "reset_clears_patient_name",
      "Start/reset clears patient name",
      resetSession.patient.name === null,
      `Reset name: ${resetSession.patient.name ?? "null"}`
    ),
    patientContextResult(
      "patient_name_does_not_change_triage",
      "Patient name does not change triage outcome",
      namedOutcome === unnamedOutcome,
      `Unnamed: ${unnamedOutcome}, named: ${namedOutcome}`
    ),
    patientContextResult(
      "provider_summary_shows_name",
      "Provider summary shows name when present",
      namedSummary.includes("Patient name: Priya Sharma"),
      namedSummary.split("\n").find((line) => line.startsWith("Patient name:")) ?? "Missing name line"
    ),
    patientContextResult(
      "provider_summary_blank_name",
      "Provider summary says Patient name: Not provided when blank",
      blankSummary.includes("Patient name: Not provided"),
      blankSummary.split("\n").find((line) => line.startsWith("Patient name:")) ?? "Missing name line"
    )
  ];

  console.group("SignalCare patient name validation suite");
  console.table(
    results.map((result) => ({
      Case: result.name,
      Passed: result.passed ? "PASS" : "FAIL",
      Details: result.details
    }))
  );
  console.log(`${results.filter((result) => result.passed).length}/${results.length} patient-name tests passed`);
  console.groupEnd();

  return results;
}

export async function runAIIntegrationTestSuite(): Promise<PatientContextTestResult[]> {
  const emergencyInput = "I have chest tightness for 30 minutes and it is spreading to my left arm. I feel sweaty.";
  const lowHeadacheInput = "I have a mild headache like ones I have had before. No weakness, no vision changes, no fever.";
  const fallbackInput = "I have chest pain and feel sweaty.";

  const emergencyExtracted = await extractSymptomsFromText(emergencyInput);
  const emergencySession = mergeExtractedSession(createEmptySession(), emergencyExtracted, emergencyInput);
  const lowHeadacheExtracted = await extractSymptomsFromText(lowHeadacheInput);
  const lowHeadacheSession = mergeExtractedSession(createEmptySession(), lowHeadacheExtracted, lowHeadacheInput);
  const fallbackExtracted = await extractSymptomsFromText(fallbackInput);
  const fallbackSession = mergeExtractedSession(createEmptySession(), fallbackExtracted, fallbackInput);

  const results = [
    patientContextResult(
      "ai_extraction_populates_symptoms",
      "AI extraction path can populate symptom fields",
      Boolean(emergencySession.presentingComplaint.primarySymptom) &&
        emergencySession.presentingComplaint.duration === "30 minutes" &&
        emergencySession.associatedSymptoms.painRadiation.includes("Left arm") &&
        emergencySession.associatedSymptoms.sweating === true,
      `Symptom: ${emergencySession.presentingComplaint.primarySymptom}, duration: ${emergencySession.presentingComplaint.duration}, radiation: ${emergencySession.associatedSymptoms.painRadiation.join(", ")}`
    ),
    patientContextResult(
      "denied_vision_not_red_flag",
      "Denied symptoms do not become red flags",
      !lowHeadacheSession.associatedSymptoms.neurologicalSymptoms.includes("Vision change") &&
        lowHeadacheSession.deniedSymptoms.includes("vision change") &&
        lowHeadacheSession.triage.redFlagsDetected.length === 0,
      `Denied: ${lowHeadacheSession.deniedSymptoms.join(", ") || "none"}, red flags: ${lowHeadacheSession.triage.redFlagsDetected.length}`
    ),
    patientContextResult(
      "ai_emergency_chest_pain_escalates",
      "Emergency chest pain still escalates after AI extraction",
      emergencySession.triage.urgencyTier === "Emergency services now",
      `Actual tier: ${emergencySession.triage.urgencyTier}`
    ),
    patientContextResult(
      "ai_low_headache_not_emergency",
      "Low headache does not emergency-escalate after AI extraction",
      lowHeadacheSession.triage.urgencyTier === "Self-care with monitoring" &&
        lowHeadacheSession.triage.redFlagsDetected.length === 0,
      `Actual tier: ${lowHeadacheSession.triage.urgencyTier}, red flags: ${lowHeadacheSession.triage.redFlagsDetected.length}`
    ),
    patientContextResult(
      "ai_keyless_fallback_works",
      "App works without AI key using local fallback extraction",
      Boolean(fallbackSession.presentingComplaint.primarySymptom) &&
        fallbackSession.aiExtraction?.confidenceNotes.some((note) => note.includes("Local simulated extraction")) === true,
      `Symptom: ${fallbackSession.presentingComplaint.primarySymptom}, notes: ${fallbackSession.aiExtraction?.confidenceNotes.join(" | ")}`
    )
  ];

  console.group("SignalCare AI integration validation suite");
  console.table(
    results.map((result) => ({
      Case: result.name,
      Passed: result.passed ? "PASS" : "FAIL",
      Details: result.details
    }))
  );
  console.log(`${results.filter((result) => result.passed).length}/${results.length} AI-integration tests passed`);
  console.groupEnd();

  return results;
}

export function calculateEvaluationMetrics(results: TriageTestResult[]): EvaluationMetrics {
  const expectedEmergency = results.filter((result) => result.expectedEmergency);
  const emergencyHits = expectedEmergency.filter((result) => result.actualTier === "Emergency services now");
  const redFlagCases = results.filter((result) => result.redFlagCase);
  const redFlagEscalated = redFlagCases.filter((result) => result.actualTier === "Emergency services now");

  return {
    totalCases: results.length,
    passedCases: results.filter((result) => result.passed).length,
    emergencySensitivity: expectedEmergency.length ? emergencyHits.length / expectedEmergency.length : 1,
    emergencyMisses: expectedEmergency.length - emergencyHits.length,
    safetyOverridePassRate: redFlagCases.length ? redFlagEscalated.length / redFlagCases.length : 1
  };
}
