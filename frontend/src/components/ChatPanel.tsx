import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Activity,
  Bandage,
  Brain,
  CheckCircle2,
  CircleDot,
  HeartPulse,
  Loader2,
  MessageCircle,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Thermometer,
  Wind
} from "lucide-react";
import type { AnswerValue, PatientCase, QuestionItem, QuestionResponse } from "../types";

interface ChatPanelProps {
  patientCase: PatientCase;
  questions: QuestionResponse | null;
  questionLoading: boolean;
  busy: boolean;
  hasAssessment: boolean;
  onUpdateCase: (updates: Partial<PatientCase>) => void;
  onRequestQuestions: (nextCase?: PatientCase) => Promise<void>;
  onAnswerQuestion: (question: QuestionItem, answer: AnswerValue) => Promise<void>;
  onAssess: () => Promise<void>;
  onReset: () => void;
}

const CHIPS = [
  "Chest pain",
  "Headache",
  "Breathing difficulty",
  "Fever",
  "Abdominal pain",
  "Injury",
  "Stroke symptoms"
];

function csvToList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function ChatPanel({
  patientCase,
  questions,
  questionLoading,
  busy,
  hasAssessment,
  onUpdateCase,
  onRequestQuestions,
  onAnswerQuestion,
  onAssess,
  onReset
}: ChatPanelProps) {
  const [complaint, setComplaint] = useState(patientCase.primary_complaint);
  const [notes, setNotes] = useState(patientCase.free_text_notes ?? "");
  const [duration, setDuration] = useState(patientCase.duration ?? "");
  const [onset, setOnset] = useState(patientCase.onset ?? "");
  const [severity, setSeverity] = useState(patientCase.severity ?? 0);
  const [age, setAge] = useState(patientCase.age?.toString() ?? "");
  const [sex, setSex] = useState(patientCase.sex ?? "");
  const [pregnancyStatus, setPregnancyStatus] = useState(patientCase.pregnancy_status ?? "");
  const [history, setHistory] = useState(patientCase.medical_history.join(", "));
  const [medications, setMedications] = useState(patientCase.medications.join(", "));
  const [allergies, setAllergies] = useState(patientCase.allergies.join(", "));

  const activeQuestion = questions?.questions[0] ?? null;
  const [textAnswer, setTextAnswer] = useState("");
  const [scaleAnswer, setScaleAnswer] = useState(5);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

  useEffect(() => {
    setComplaint(patientCase.primary_complaint);
    setNotes(patientCase.free_text_notes ?? "");
    setDuration(patientCase.duration ?? "");
    setOnset(patientCase.onset ?? "");
    setSeverity(patientCase.severity ?? 0);
    setAge(patientCase.age?.toString() ?? "");
    setSex(patientCase.sex ?? "");
    setPregnancyStatus(patientCase.pregnancy_status ?? "");
    setHistory(patientCase.medical_history.join(", "));
    setMedications(patientCase.medications.join(", "));
    setAllergies(patientCase.allergies.join(", "));
  }, [patientCase]);

  useEffect(() => {
    setTextAnswer("");
    setScaleAnswer(5);
    setSelectedOptions([]);
  }, [activeQuestion?.id]);

  const answeredCount = patientCase.answers.length;
  const queuedCount = Math.max((questions?.questions.length ?? 0) - 1, 0);

  const questionTone = useMemo(() => {
    if (!questions) return "Start with the main symptom, then SignalCare will choose the next safety check.";
    if (!activeQuestion) return "No additional high-priority questions are queued for the current complaint.";
    return questions.explanation;
  }, [activeQuestion, questions]);

  function buildCaseFromForm(primaryComplaint = complaint): PatientCase {
    return {
      ...patientCase,
      primary_complaint: primaryComplaint.trim(),
      duration: duration.trim() || null,
      onset: onset.trim() || null,
      severity: severity || null,
      age: age ? Number(age) : null,
      sex: sex.trim() || null,
      pregnancy_status: pregnancyStatus.trim() || null,
      medical_history: csvToList(history),
      medications: csvToList(medications),
      allergies: csvToList(allergies),
      free_text_notes: notes.trim() || null
    };
  }

  async function commitIntake() {
    const nextCase = buildCaseFromForm();
    onUpdateCase(nextCase);
    await onRequestQuestions(nextCase);
  }

  async function chooseChip(label: string) {
    setComplaint(label);
    const nextCase = buildCaseFromForm(label);
    onUpdateCase(nextCase);
    await onRequestQuestions(nextCase);
  }

  async function submitAnswer(value: AnswerValue) {
    if (!activeQuestion) return;
    await onAnswerQuestion(activeQuestion, value);
  }

  function toggleOption(option: string) {
    const normalized = option.toLowerCase();
    if (normalized.includes("none") || normalized.startsWith("no ")) {
      setSelectedOptions([]);
      return;
    }
    setSelectedOptions((current) =>
      current.includes(option) ? current.filter((item) => item !== option) : [...current, option]
    );
  }

  const progressSteps = [
    { label: "Intake", done: Boolean(patientCase.primary_complaint || patientCase.free_text_notes), active: !questions },
    { label: "Guardrail scan", done: answeredCount > 0, active: Boolean(activeQuestion) },
    { label: "Care route", done: hasAssessment, active: busy }
  ];

  const chipIcons: Record<string, ReactNode> = {
    "Chest pain": <HeartPulse aria-hidden="true" />,
    Headache: <Brain aria-hidden="true" />,
    "Breathing difficulty": <Wind aria-hidden="true" />,
    Fever: <Thermometer aria-hidden="true" />,
    "Abdominal pain": <CircleDot aria-hidden="true" />,
    Injury: <Bandage aria-hidden="true" />,
    "Stroke symptoms": <ShieldAlert aria-hidden="true" />
  };

  return (
    <section className="card chat-panel" aria-label="Symptom intake">
      <div className="assistant-module-header">
        <span className="assistant-avatar">
          <Sparkles aria-hidden="true" />
        </span>
        <div>
          <p className="eyebrow">AI intake console</p>
          <h2>Clinical assistant uplink</h2>
          <p className="panel-subcopy">Choose a signal or describe what is happening. SignalCare will structure the case.</p>
        </div>
        <span className={questionLoading || busy ? "status-pill analyzing" : "status-pill neutral"}>
          {questionLoading || busy ? "Analyzing" : "Listening"}
        </span>
      </div>

      <div className="progress-steps" aria-label="Triage progress">
        {progressSteps.map((step, index) => (
          <div className={step.done ? "progress-step done" : step.active ? "progress-step active" : "progress-step"} key={step.label}>
            <span>{step.done ? <CheckCircle2 aria-hidden="true" /> : index + 1}</span>
            <strong>Step {index + 1}</strong>
            <small>{step.label}</small>
          </div>
        ))}
      </div>

      <div className="chip-row" aria-label="Common symptoms">
        {CHIPS.map((chip) => (
          <button className="chip" key={chip} type="button" onClick={() => void chooseChip(chip)}>
            {chipIcons[chip]}
            {chip}
          </button>
        ))}
      </div>

      <div className="intake-form">
        <label className="field field-wide">
          <span>Primary complaint</span>
          <input
            value={complaint}
            onChange={(event) => setComplaint(event.target.value)}
            placeholder="Example: chest pain with nausea"
          />
        </label>
        <label className="field field-wide">
          <span>Free-text symptoms</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Add associated symptoms, context, and concerns"
            rows={3}
          />
        </label>
        <label className="field">
          <span>Duration</span>
          <input value={duration} onChange={(event) => setDuration(event.target.value)} placeholder="2 hours" />
        </label>
        <label className="field">
          <span>Onset</span>
          <input value={onset} onChange={(event) => setOnset(event.target.value)} placeholder="sudden or gradual" />
        </label>
        <label className="field">
          <span>Severity: {severity || "not set"}</span>
          <input
            type="range"
            min="0"
            max="10"
            value={severity}
            onChange={(event) => setSeverity(Number(event.target.value))}
          />
        </label>
        <label className="field">
          <span>Age</span>
          <input value={age} onChange={(event) => setAge(event.target.value)} inputMode="numeric" placeholder="42" />
        </label>
        <label className="field">
          <span>Sex</span>
          <select value={sex} onChange={(event) => setSex(event.target.value)}>
            <option value="">Not provided</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="intersex">Intersex</option>
            <option value="prefer not to say">Prefer not to say</option>
          </select>
        </label>
        <label className="field">
          <span>Pregnancy status</span>
          <select value={pregnancyStatus} onChange={(event) => setPregnancyStatus(event.target.value)}>
            <option value="">Not relevant or unknown</option>
            <option value="pregnant">Pregnant</option>
            <option value="possibly pregnant">Possibly pregnant</option>
            <option value="not pregnant">Not pregnant</option>
          </select>
        </label>
        <label className="field field-wide">
          <span>Medical history</span>
          <input value={history} onChange={(event) => setHistory(event.target.value)} placeholder="asthma, diabetes" />
        </label>
        <label className="field">
          <span>Medications</span>
          <input value={medications} onChange={(event) => setMedications(event.target.value)} placeholder="comma separated" />
        </label>
        <label className="field">
          <span>Allergies</span>
          <input value={allergies} onChange={(event) => setAllergies(event.target.value)} placeholder="penicillin" />
        </label>
      </div>

      <div className="intake-actions">
        <button className="button primary" type="button" onClick={() => void commitIntake()} disabled={questionLoading}>
          {questionLoading ? (
            <>
              <Loader2 aria-hidden="true" className="spin" />
              Selecting follow-up...
            </>
          ) : (
            <>
              <MessageCircle aria-hidden="true" />
              Run adaptive intake
            </>
          )}
        </button>
        <button className="button secondary" type="button" onClick={() => void onAssess()} disabled={busy}>
          {busy ? (
            <>
              <Loader2 aria-hidden="true" className="spin" />
              Assessing...
            </>
          ) : (
            <>
              <Activity aria-hidden="true" />
              Route care urgency
            </>
          )}
        </button>
        <button className="button ghost" type="button" onClick={onReset}>
          <RotateCcw aria-hidden="true" />
          Reset case
        </button>
      </div>

      <div className={questionLoading ? "assistant-card loading" : "assistant-card"}>
        <div className="assistant-header">
          <span className="assistant-mini-avatar">
            <Sparkles aria-hidden="true" />
          </span>
          <div>
            <p className="eyebrow">Adaptive question</p>
            <p>{questionTone}</p>
          </div>
        </div>

        {questionLoading && (
          <div className="typing-indicator" aria-label="Assistant is choosing a question">
            <span />
            <span />
            <span />
          </div>
        )}

        {activeQuestion ? (
          <div className="question-box" key={activeQuestion.id}>
            <div className="question-meta">
              <span className={activeQuestion.red_flag_related ? "status-pill danger" : "status-pill neutral"}>
                {activeQuestion.red_flag_related ? "Red-flag screen" : "Context"}
              </span>
              {queuedCount > 0 && <span className="status-pill neutral">{queuedCount} queued</span>}
            </div>
            <h3>{activeQuestion.text}</h3>

            {activeQuestion.answer_type === "yes_no" && (
              <div className="segmented">
                <button type="button" onClick={() => void submitAnswer(true)}>
                  Yes
                </button>
                <button type="button" onClick={() => void submitAnswer(false)}>
                  No
                </button>
              </div>
            )}

            {activeQuestion.answer_type === "scale" && (
              <div className="answer-stack">
                <label className="field">
                  <span>Score: {scaleAnswer}</span>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={scaleAnswer}
                    onChange={(event) => setScaleAnswer(Number(event.target.value))}
                  />
                </label>
                <button className="button primary" type="button" onClick={() => void submitAnswer(scaleAnswer)}>
                  Save answer
                </button>
              </div>
            )}

            {activeQuestion.answer_type === "text" && (
              <div className="answer-stack">
                <textarea
                  value={textAnswer}
                  onChange={(event) => setTextAnswer(event.target.value)}
                  placeholder="Type the answer"
                  rows={3}
                />
                <button
                  className="button primary"
                  type="button"
                  onClick={() => void submitAnswer(textAnswer)}
                  disabled={!textAnswer.trim()}
                >
                  Save answer
                </button>
              </div>
            )}

            {activeQuestion.answer_type === "multi_select" && (
              <div className="answer-stack">
                <div className="option-grid">
                  {(activeQuestion.options ?? []).map((option) => (
                    <button
                      type="button"
                      key={option}
                      className={selectedOptions.includes(option) ? "option selected" : "option"}
                      onClick={() => toggleOption(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                <div className="action-row compact">
                  <button className="button primary" type="button" onClick={() => void submitAnswer(selectedOptions)}>
                    Save selection
                  </button>
                  <button className="button ghost" type="button" onClick={() => void submitAnswer([])}>
                    None
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="empty-question">
            <strong>Ready for intake.</strong>
            <span>Start by choosing a symptom or describing what is happening.</span>
          </div>
        )}
      </div>
    </section>
  );
}
