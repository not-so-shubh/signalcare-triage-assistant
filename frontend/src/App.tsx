import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Brain,
  Check,
  CheckCircle2,
  Clipboard,
  Download,
  FileText,
  Globe2,
  HeartPulse,
  Lock,
  PhoneCall,
  Printer,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Thermometer,
  Wind
} from "lucide-react";
import LogoMark from "./components/LogoMark";
import { DEFAULT_CARE_REGION, careTerminology, localizePathway, localizeTierLabel } from "./lib/careTerminology";
import { DEMO_DEFINITIONS } from "./lib/demoCases";
import { getNextQuestion, questionProgress, SYMPTOM_OPTIONS } from "./lib/questions";
import { extractSymptomsFromText } from "./lib/symptomExtraction";
import {
  answerPreview,
  associatedSummary,
  buildProviderSummary,
  CARE_PATHWAYS,
  classifyUrgency,
  cloneSession,
  createEmptySession,
  finalizeTriage,
  generateTellThemScript,
  markAIExtractionReviewed,
  mergeExtractedSession,
  shouldShowResult,
  updatePatientContext,
  applyAnswerToSession
} from "./lib/triageRules";
import { calculateEvaluationMetrics, runPatientContextTestSuite, runTriageTestSuite } from "./lib/triageTests";
import type {
  AnswerValue,
  CarePathway,
  CareRegion,
  Patient,
  Question,
  TriageSession,
  TriageTestResult,
  UrgencyTier
} from "./lib/triageTypes";

type Screen = "landing" | "triage";
type MobileTab = "chat" | "summary" | "safety";
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const SAFETY_DISCLAIMER =
  "I can help you understand what level of care may be appropriate, but I cannot diagnose you. If symptoms feel severe, rapidly worsening, or you think this may be an emergency, call emergency services now.";

const TIER_ORDER: UrgencyTier[] = [
  "Emergency services now",
  "A&E today",
  "GP urgent appointment",
  "GP routine",
  "Self-care with monitoring"
];

const TIER_META: Record<UrgencyTier, { label: string; tone: string; icon: ReactNode }> = {
  "Emergency services now": { label: "Emergency", tone: "danger", icon: <PhoneCall aria-hidden="true" /> },
  "A&E today": { label: "Same day", tone: "amber", icon: <AlertTriangle aria-hidden="true" /> },
  "GP urgent appointment": { label: "24 hours", tone: "blue", icon: <Activity aria-hidden="true" /> },
  "GP routine": { label: "This week", tone: "charcoal", icon: <Stethoscope aria-hidden="true" /> },
  "Self-care with monitoring": { label: "Monitor", tone: "green", icon: <ShieldCheck aria-hidden="true" /> }
};

function buttonClass(variant: ButtonVariant, extra = "") {
  return ["button", variant === "ghost" ? "text-button" : variant, extra].filter(Boolean).join(" ");
}

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function scrollToWorkspaceStart() {
  window.setTimeout(() => window.scrollTo({ top: 0, behavior: "auto" }), 0);
}

function csvToList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseAgeInput(value: string): number | null {
  if (!value.trim()) return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.min(120, Math.max(0, Math.trunc(numeric)));
}

function isMalePatientSex(value: string | null): boolean {
  return value?.toLowerCase() === "male";
}

function buildDraftSummary(session: TriageSession): string {
  const associated = associatedSummary(session);
  return [
    "Provider Summary",
    `Presenting complaint: ${session.presentingComplaint.primarySymptom || "Not documented"}`,
    `Timeline: ${session.presentingComplaint.duration || session.presentingComplaint.onset || "Not documented"}`,
    `Severity: ${
      session.presentingComplaint.severity0To10 === null ? "Not documented" : `${session.presentingComplaint.severity0To10}/10`
    }`,
    `Associated symptoms: ${associated.join(", ") || "None documented"}`,
    `Negative / denied: ${session.deniedSymptoms.join(", ") || "None documented"}`,
    `Red flags detected: ${session.triage.redFlagsDetected.map((flag) => flag.label).join(", ") || "None"}`,
    "AI urgency assessment: Collecting details",
    "Recommended care pathway: Pending completion of the safety questions"
  ].join("\n");
}

function App() {
  const [screen, setScreen] = useState<Screen>("landing");
  const [session, setSession] = useState<TriageSession>(() => createEmptySession());
  const [mobileTab, setMobileTab] = useState<MobileTab>("chat");
  const [region, setRegion] = useState<CareRegion>(DEFAULT_CARE_REGION);
  const [aiInput, setAiInput] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [copied, setCopied] = useState(false);
  const emergencyRef = useRef<HTMLDivElement | null>(null);

  const nextQuestion = useMemo(() => getNextQuestion(session), [session]);
  const resultReady = shouldShowResult(session);
  const activeTier = session.triage.urgencyTier;
  const testResults = useMemo(() => runTriageTestSuite(), []);
  const metrics = useMemo(() => calculateEvaluationMetrics(testResults), [testResults]);
  const summaryText = useMemo(
    () => (session.triage.urgencyTier ? buildProviderSummary(session, region).fullText : buildDraftSummary(session)),
    [session, region]
  );
  const reviewPending = Boolean(session.aiExtraction && !session.aiExtraction.reviewed && activeTier !== "Emergency services now");
  const resultStateVisible =
    activeTier === "Emergency services now" ||
    resultReady ||
    Boolean(session.presentingComplaint.primarySymptom && !nextQuestion && !reviewPending);
  const showAssistantNote = !session.aiExtraction && !resultStateVisible;

  useEffect(() => {
    if (activeTier === "Emergency services now") emergencyRef.current?.focus();
  }, [activeTier]);

  function startFresh() {
    setSession(createEmptySession());
    setAiInput("");
    setMobileTab("chat");
    setScreen("triage");
    scrollToWorkspaceStart();
  }

  async function analyzeText(input: string, baseSession = session) {
    const trimmed = input.trim();
    if (!trimmed) return;
    setAnalyzing(true);
    try {
      const extracted = await extractSymptomsFromText(trimmed);
      const next = mergeExtractedSession(baseSession, extracted, trimmed);
      setSession(next);
      setAiInput(trimmed);
      setScreen("triage");
      setMobileTab("chat");
      scrollToWorkspaceStart();
    } finally {
      setAnalyzing(false);
    }
  }

  async function loadDemo(id: string) {
    const demo = DEMO_DEFINITIONS.find((item) => item.id === id) ?? DEMO_DEFINITIONS[0];
    await analyzeText(demo.input, createEmptySession());
  }

  function resetTriage() {
    setSession(createEmptySession());
    setAiInput("");
    setMobileTab("chat");
    scrollToWorkspaceStart();
  }

  function answerQuestion(question: Question, answer: AnswerValue) {
    let next = applyAnswerToSession(session, question.id, answer);
    const hasEmergencyOverride = next.triage.redFlagsDetected.length > 0;
    if (!hasEmergencyOverride && getNextQuestion(next) === null) next = finalizeTriage(next);
    setSession(next);
    if (hasEmergencyOverride) setMobileTab("chat");
  }

  function updatePatient(updates: Partial<Patient>) {
    setSession((current) => updatePatientContext(current, updates));
  }

  function updateReviewDetails(updates: { primarySymptom?: string; duration?: string; severity?: number | null }) {
    setSession((current) => {
      const next = cloneSession(current);
      if (updates.primarySymptom) next.presentingComplaint.primarySymptom = updates.primarySymptom;
      if (updates.duration !== undefined) next.presentingComplaint.duration = updates.duration || null;
      if (updates.severity !== undefined) next.presentingComplaint.severity0To10 = updates.severity;
      next.triage.redFlagsDetected = [];
      next.triage.urgencyTier = classifyUrgency(next);
      next.triage.reasoningSummary = "Details were edited by the user, then deterministic triage rules were rerun.";
      return markAIExtractionReviewed(next);
    });
  }

  async function copySummary() {
    await navigator.clipboard.writeText(summaryText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function downloadTxt() {
    const blob = new Blob([summaryText], { type: "text/plain" });
    downloadBlob(blob, "signalcare-provider-summary.txt");
  }

  function downloadJson() {
    const payload = {
      exportedAt: new Date().toISOString(),
      careRegion: region,
      summary: session.triage.urgencyTier ? buildProviderSummary(session, region) : null,
      session
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    downloadBlob(blob, "signalcare-provider-summary.json");
  }

  function printSummary() {
    window.print();
  }

  if (screen === "landing") {
    return (
      <LandingPage
        onStart={startFresh}
        onRunDemo={() => void loadDemo("emergency_chest_pain")}
        onLoadDemo={(id) => void loadDemo(id)}
        metrics={metrics}
        testResults={testResults}
      />
    );
  }

  return (
    <div className="app-root triage-page">
      <HeaderNav compact />

      <main className="triage-shell" id="triage-workspace">
        <SafetyBanner emergency={activeTier === "Emergency services now"} region={region} />

        <div className="mobile-tabs" aria-label="Triage views">
          {(["chat", "summary", "safety"] as MobileTab[]).map((tab) => (
            <button
              key={tab}
              className={mobileTab === tab ? "mobile-tab active" : "mobile-tab"}
              type="button"
              onClick={() => setMobileTab(tab)}
            >
              {tab[0].toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div className="clinical-grid">
          <aside className={`left-rail ${mobileTab === "safety" ? "mobile-visible" : ""}`}>
            <ClinicalStatePanel
              session={session}
              region={region}
              onRegionChange={setRegion}
              onUpdatePatient={updatePatient}
              onReset={resetTriage}
            />
          </aside>

          <section className={`question-stage ${mobileTab === "chat" ? "mobile-visible" : ""}`} aria-label="Adaptive triage questions">
            {showAssistantNote && (
              <div className="assistant-note">
                <span className="assistant-icon">
                  <Sparkles aria-hidden="true" />
                </span>
                <div>
                  <p className="eyebrow">Signal Check</p>
                  <h1>Structured triage session</h1>
                  <p>{SAFETY_DISCLAIMER}</p>
                </div>
              </div>
            )}

            {!session.presentingComplaint.primarySymptom && (
              <NaturalLanguageIntake
                value={aiInput}
                analyzing={analyzing}
                onChange={setAiInput}
                onAnalyze={() => void analyzeText(aiInput)}
              />
            )}

            {activeTier === "Emergency services now" ? (
              <EmergencyOverride session={session} region={region} refTarget={emergencyRef} onRestart={startFresh} />
            ) : (
              <>
                <AIUnderstandingReview
                  session={session}
                  onAccept={() => setSession((current) => markAIExtractionReviewed(current))}
                  onEdit={updateReviewDetails}
                />

                {reviewPending ? null : resultReady && activeTier ? (
                  <ResultScreen session={session} tier={activeTier} region={region} onRestart={startFresh} />
                ) : nextQuestion ? (
                  <QuestionCard question={nextQuestion} session={session} onAnswer={answerQuestion} />
                ) : (
                  <ResultScreen
                    session={finalizeTriage(session)}
                    tier={finalizeTriage(session).triage.urgencyTier ?? "GP routine"}
                    region={region}
                    onRestart={startFresh}
                  />
                )}
              </>
            )}

            <RecentAnswers session={session} />
          </section>

          <aside className={`right-rail ${mobileTab === "summary" ? "mobile-visible" : ""}`} id="triage-result">
            <CareLevelPreview activeTier={activeTier} region={region} />
            <ProviderSummaryPanel
              session={session}
              region={region}
              copied={copied}
              onCopy={() => void copySummary()}
              onDownloadTxt={downloadTxt}
              onDownloadJson={downloadJson}
              onPrint={printSummary}
            />
          </aside>
        </div>
      </main>
    </div>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function HeaderNav({ compact = false }: { compact?: boolean }) {
  return (
    <header className="topbar">
      <button className="brand-button" type="button" onClick={() => scrollToId("top")} aria-label="SignalCare home">
        <LogoMark variant="iconOnly" />
        <span className="brand-wordmark">
          <strong>SignalCare</strong>
          <small>Care navigation assistant</small>
        </span>
      </button>
      {!compact && (
        <nav aria-label="Main navigation">
          <button className="nav-link" type="button" onClick={() => scrollToId("how-it-works")}>How it works</button>
          <button className="nav-link" type="button" onClick={() => scrollToId("evaluation")}>Evaluation</button>
          <button className="nav-link" type="button" onClick={() => scrollToId("safety")}>Safety</button>
        </nav>
      )}
    </header>
  );
}

function LandingPage({
  onStart,
  onRunDemo,
  onLoadDemo,
  metrics,
  testResults
}: {
  onStart: () => void;
  onRunDemo: () => void;
  onLoadDemo: (id: string) => void;
  metrics: ReturnType<typeof calculateEvaluationMetrics>;
  testResults: TriageTestResult[];
}) {
  return (
    <div className="app-root" id="top">
      {/* CTA discipline: the hero owns the primary landing action.
          The header avoids repeating "Start triage" while the hero CTA is visible. */}
      <HeaderNav />

      <main>
        <section className="hero-section">
          <div className="hero-copy">
            <p className="kicker">
              <ShieldCheck aria-hidden="true" />
              A calm interface for urgent decisions.
            </p>
            <h1>Reach the right care before the waiting room.</h1>
            <p className="hero-subcopy">
              SignalCare is a safety-first Gen AI triage assistant. AI structures patient language; deterministic
              guardrails own red flags and urgency escalation.
            </p>
            <div className="hero-actions">
              <button className={buttonClass("primary")} type="button" onClick={onStart}>
                Start triage
                <ArrowRight aria-hidden="true" />
              </button>
              <button className={buttonClass("secondary")} type="button" onClick={onRunDemo}>
                Run demo
                <Sparkles aria-hidden="true" />
              </button>
            </div>
          </div>
          <div className="hero-media" aria-label="SignalCare triage interface preview">
            <img src="/signalcare-hero.png" alt="" />
            <div className="hero-stat">
              <span>{metrics.passedCases}/{metrics.totalCases}</span>
              <strong>deterministic triage tests passing locally</strong>
            </div>
          </div>
        </section>

        <section className="trust-strip" aria-label="Trust features">
          {[
            ["AI-assisted intake", "Natural language symptoms become structured triage fields."],
            ["Emergency detection", "Hard-coded red flags override lower urgency paths."],
            ["Provider summary", "Clinician-ready brief with copy, text, JSON, and print export."]
          ].map(([title, copy]) => (
            <article key={title}>
              <CheckCircle2 aria-hidden="true" />
              <div>
                <strong>{title}</strong>
                <p>{copy}</p>
              </div>
            </article>
          ))}
        </section>

        <section className="section-band" id="how-it-works">
          <SectionHeading label="Clinical Thread" title="How it works" />
          <div className="indexed-grid five">
            {[
              ["01", "AI intake", "Extract symptoms, duration, severity, red-flag phrases, and denied symptoms from patient text."],
              ["02", "Safety override", "Run deterministic emergency checks before any lower-acuity care pathway is shown."],
              ["03", "Smart follow-up", "Ask symptom-specific questions and skip details already captured from text."],
              ["04", "Care pathway", "Route to emergency, same-day emergency care, urgent primary care, routine review, or self-care."],
              ["05", "Provider brief", "Generate a structured summary with rationale, red flags, instructions, and exports."]
            ].map(([index, title, copy]) => (
              <article className="indexed-card" key={index}>
                <span>{index}</span>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section-band compact-band" id="demo-cases">
          <SectionHeading label="Signal Check" title="Try a safety demo" />
          <div className="compact-demo-grid">
            {DEMO_DEFINITIONS.map((demo) => (
              <article className="demo-case-card" key={demo.id}>
                <div>
                  <h3>{demo.title}</h3>
                  <p>{demo.description}</p>
                  <code>{demo.input}</code>
                </div>
                <button type="button" onClick={() => onLoadDemo(demo.id)}>
                  Run case
                  <ArrowRight aria-hidden="true" />
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className="section-band symptom-section">
          <SectionHeading label="Care Level" title="Common starting points" />
          <div className="symptom-card-grid">
            {[
              ["01", "Chest pain", "Pressure, tightness, burning, sharp pain, or discomfort in the chest area."],
              ["02", "Headache", "Head pain, migraine-like symptoms, vision changes, or neurological concerns."],
              ["03", "Fever", "High temperature, infection symptoms, rash, neck stiffness, or drowsiness."],
              ["04", "Abdominal pain", "Stomach pain with severity, vomiting, pregnancy concerns, or trauma."],
              ["05", "Breathing difficulty", "Shortness of breath, trouble speaking, blue lips, wheeze, or chest pain."]
            ].map(([index, title, copy]) => (
              <button className="symptom-card clickable" type="button" key={title} onClick={onStart}>
                <span>{index}</span>
                <h3>{title}</h3>
                <p>{copy}</p>
                <em>Select</em>
              </button>
            ))}
          </div>
        </section>

        <section className="safety-section" id="safety">
          <div>
            <p className="eyebrow">Not a diagnosis</p>
            <h2>Built to escalate, not diagnose.</h2>
          </div>
          <div className="safety-copy">
            <p>
              SignalCare supports care navigation and provider handoff. It does not diagnose, prescribe, or replace
              emergency services or clinical judgement.
            </p>
            <ul className="plain-check-list">
              <li>AI helps structure the conversation.</li>
              <li>Deterministic guardrails handle red flags.</li>
              <li>Clinicians remain the final authority.</li>
            </ul>
          </div>
        </section>

        <section className="safety-section privacy-section">
          <div>
            <p className="eyebrow">Privacy by design</p>
            <h2>Privacy by design.</h2>
          </div>
          <div className="safety-copy">
            <p>
              This prototype does not permanently store patient data. The session stays in the browser unless the user
              chooses to copy or export the provider summary.
            </p>
            <ul className="plain-check-list">
              <li>No account required.</li>
              <li>No permanent storage in this MVP.</li>
              <li>User controls copy and export.</li>
            </ul>
          </div>
        </section>

        <EvaluationDashboard results={testResults} metrics={metrics} />

        <section className="cta-section">
          <p className="eyebrow">SignalCare</p>
          <h2>Ready to create a provider-ready summary?</h2>
          <button className={buttonClass("primary")} type="button" onClick={onStart}>
            Open triage workspace
            <ArrowRight aria-hidden="true" />
          </button>
        </section>
      </main>
    </div>
  );
}

function SectionHeading({ label, title }: { label: string; title: string }) {
  return (
    <div className="section-heading">
      <p className="eyebrow">{label}</p>
      <h2>{title}</h2>
    </div>
  );
}

function SafetyBanner({ emergency, region }: { emergency: boolean; region: CareRegion }) {
  return (
    <div className={emergency ? "safety-banner emergency" : "safety-banner"} role={emergency ? "alert" : "note"}>
      <ShieldAlert aria-hidden="true" />
      <span>
        {emergency
          ? `Red flag detected. This may need emergency care now. Call ${careTerminology[region].emergencyNumber} now.`
          : `If symptoms feel severe or rapidly worsening, call ${careTerminology[region].emergencyNumber} now.`}
      </span>
    </div>
  );
}

function NaturalLanguageIntake({
  value,
  analyzing,
  onChange,
  onAnalyze
}: {
  value: string;
  analyzing: boolean;
  onChange: (value: string) => void;
  onAnalyze: () => void;
}) {
  return (
    <section className="nl-intake-card" aria-labelledby="natural-language-title">
      <div>
        <p className="eyebrow">AI-assisted intake</p>
        <h2 id="natural-language-title">Describe what’s happening in your own words</h2>
        <p>
          AI helps extract details for review. Deterministic guardrails still make every red-flag escalation decision.
        </p>
      </div>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Example: I’ve had chest tightness for 30 minutes and it’s spreading to my left arm. I feel sweaty."
        rows={5}
      />
      <button className={buttonClass("primary")} type="button" onClick={onAnalyze} disabled={!value.trim() || analyzing}>
        {analyzing ? "Analyzing..." : "Analyze symptoms"}
        <Sparkles aria-hidden="true" />
      </button>
    </section>
  );
}

function ClinicalStatePanel({
  session,
  region,
  onRegionChange,
  onUpdatePatient,
  onReset
}: {
  session: TriageSession;
  region: CareRegion;
  onRegionChange: (region: CareRegion) => void;
  onUpdatePatient: (updates: Partial<Patient>) => void;
  onReset: () => void;
}) {
  const associated = associatedSummary(session);
  const redFlags = session.triage.redFlagsDetected;
  const pregnancyNotApplicable = isMalePatientSex(session.patient.sex);

  return (
    <div className="rail-stack">
      <section className="panel">
        <div className="panel-header">
          <p className="eyebrow">Current symptom</p>
          <button className="icon-button" type="button" onClick={onReset} aria-label="Reset triage">
            <RotateCcw aria-hidden="true" />
          </button>
        </div>
        <h2>{session.presentingComplaint.primarySymptom || "Not selected"}</h2>
        <dl className="detail-list">
          <div>
            <dt>Urgency status</dt>
            <dd>{session.triage.urgencyTier ? localizeTierLabel(session.triage.urgencyTier, region) : "Collecting details"}</dd>
          </div>
          <div>
            <dt>Severity</dt>
            <dd>
              {session.presentingComplaint.severity0To10 === null
                ? "Not documented"
                : `${session.presentingComplaint.severity0To10}/10`}
            </dd>
          </div>
          <div>
            <dt>Timeline</dt>
            <dd>{session.presentingComplaint.duration || session.presentingComplaint.onset || "Not documented"}</dd>
          </div>
        </dl>
      </section>

      <section className="panel patient-context">
        <p className="eyebrow">Care region</p>
        <label>
          <span>Care region</span>
          <select value={region} onChange={(event) => onRegionChange(event.target.value as CareRegion)}>
            <option value="india">India</option>
            <option value="uk">UK</option>
            <option value="us">US</option>
          </select>
        </label>
      </section>

      <section className="panel">
        <p className="eyebrow">Collected details</p>
        <div className="chip-cloud compact">
          {associated.length ? associated.map((item) => <span key={item}>{item}</span>) : <span>No associated symptoms yet</span>}
          {session.deniedSymptoms.map((item) => (
            <span key={`denied-${item}`}>Denied: {item}</span>
          ))}
        </div>
      </section>

      <section className="panel">
        <p className="eyebrow">Red flags checked</p>
        {redFlags.length ? (
          <ul className="flag-list">
            {redFlags.map((flag) => (
              <li key={flag.id}>
                <AlertTriangle aria-hidden="true" />
                {flag.label}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No hard emergency pattern detected yet.</p>
        )}
      </section>

      <section className="panel patient-context">
        <p className="eyebrow">Patient context</p>
        <label>
          <span>Age</span>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            max="120"
            placeholder="Optional"
            value={session.patient.age ?? ""}
            onChange={(event) => onUpdatePatient({ age: parseAgeInput(event.target.value) })}
          />
        </label>
        <label>
          <span>Sex</span>
          <select value={session.patient.sex ?? ""} onChange={(event) => onUpdatePatient({ sex: event.target.value || null })}>
            <option value="">Not specified</option>
            <option>Female</option>
            <option>Male</option>
            <option>Other</option>
            <option>Prefer not to say</option>
          </select>
        </label>
        {pregnancyNotApplicable ? (
          <div className="context-static" aria-live="polite">
            <span>Pregnancy status</span>
            <strong>Not applicable</strong>
          </div>
        ) : (
          <label>
            <span>Pregnancy status</span>
            <select
              value={session.patient.pregnancyStatus ?? ""}
              onChange={(event) => onUpdatePatient({ pregnancyStatus: event.target.value || null })}
            >
              <option value="">Not specified</option>
              <option>Not pregnant</option>
              <option>Pregnant</option>
              <option>Unsure</option>
            </select>
          </label>
        )}
        <label>
          <span>Known conditions</span>
          <input
            value={session.patient.knownConditions.join(", ")}
            onChange={(event) => onUpdatePatient({ knownConditions: csvToList(event.target.value) })}
            placeholder="Diabetes, asthma"
          />
        </label>
        <label>
          <span>Medications</span>
          <input
            value={session.patient.medications.join(", ")}
            onChange={(event) => onUpdatePatient({ medications: csvToList(event.target.value) })}
            placeholder="Optional"
          />
        </label>
        <label>
          <span>Allergies</span>
          <input
            value={session.patient.allergies.join(", ")}
            onChange={(event) => onUpdatePatient({ allergies: csvToList(event.target.value) })}
            placeholder="Optional"
          />
        </label>
      </section>
    </div>
  );
}

function AIUnderstandingReview({
  session,
  onAccept,
  onEdit
}: {
  session: TriageSession;
  onAccept: () => void;
  onEdit: (updates: { primarySymptom?: string; duration?: string; severity?: number | null }) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [primarySymptom, setPrimarySymptom] = useState(session.presentingComplaint.primarySymptom ?? "");
  const [duration, setDuration] = useState(session.presentingComplaint.duration ?? "");
  const [severity, setSeverity] = useState(session.presentingComplaint.severity0To10?.toString() ?? "");

  useEffect(() => {
    setPrimarySymptom(session.presentingComplaint.primarySymptom ?? "");
    setDuration(session.presentingComplaint.duration ?? "");
    setSeverity(session.presentingComplaint.severity0To10?.toString() ?? "");
  }, [session.presentingComplaint.primarySymptom, session.presentingComplaint.duration, session.presentingComplaint.severity0To10]);

  if (!session.aiExtraction || session.aiExtraction.reviewed || session.triage.urgencyTier === "Emergency services now") return null;

  const fields = [
    ["Main symptom", session.presentingComplaint.primarySymptom || "Not extracted"],
    ["Duration", session.presentingComplaint.duration || "Not extracted"],
    [
      "Severity",
      session.presentingComplaint.severity0To10 === null ? "Not extracted" : `${session.presentingComplaint.severity0To10}/10`
    ],
    ["Associated symptoms", associatedSummary(session).join(", ") || "None extracted"],
    ["Pain radiation", session.associatedSymptoms.painRadiation.join(", ") || "None extracted"],
    ["Neurological symptoms", session.associatedSymptoms.neurologicalSymptoms.join(", ") || "None extracted"],
    ["Red flags detected", session.triage.redFlagsDetected.map((flag) => flag.label).join(", ") || "None"]
  ];

  return (
    <section className="ai-review-card">
      <div>
        <p className="eyebrow">AI understanding</p>
        <h2>AI understanding</h2>
        <p>I extracted these details from your description. You can continue, edit, or answer a few focused questions.</p>
      </div>
      <dl className="review-grid">
        {fields.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {editing && (
        <div className="review-edit-grid">
          <label>
            <span>Main symptom</span>
            <input value={primarySymptom} onChange={(event) => setPrimarySymptom(event.target.value)} />
          </label>
          <label>
            <span>Duration</span>
            <input value={duration} onChange={(event) => setDuration(event.target.value)} />
          </label>
          <label>
            <span>Severity</span>
            <input value={severity} inputMode="numeric" onChange={(event) => setSeverity(event.target.value)} />
          </label>
        </div>
      )}
      <div className="review-actions">
        <button className={buttonClass("primary")} type="button" onClick={onAccept}>
          Looks correct
          <CheckCircle2 aria-hidden="true" />
        </button>
        <button
          className={buttonClass("secondary")}
          type="button"
          onClick={() => {
            if (editing) {
              onEdit({
                primarySymptom: primarySymptom.trim(),
                duration: duration.trim(),
                severity: severity ? Number(severity) : null
              });
            } else {
              setEditing(true);
            }
          }}
        >
          Edit details
        </button>
        <button className={buttonClass("ghost")} type="button" onClick={onAccept}>
          Continue questions
        </button>
      </div>
    </section>
  );
}

function QuestionCard({
  question,
  session,
  onAnswer
}: {
  question: Question;
  session: TriageSession;
  onAnswer: (question: Question, answer: AnswerValue) => void;
}) {
  const progress = questionProgress(session);
  const [textValue, setTextValue] = useState("");
  const [scaleValue, setScaleValue] = useState(5);
  const [multiValue, setMultiValue] = useState<string[]>([]);
  const submitLabel = progress.current >= progress.total ? "See care level" : "Next question";

  useEffect(() => {
    setTextValue("");
    setScaleValue(session.presentingComplaint.severity0To10 ?? 5);
    setMultiValue([]);
  }, [question.id, session.presentingComplaint.severity0To10]);

  function toggleMulti(option: string) {
    const normalized = option.toLowerCase();
    if (["none", "no", "none of these"].includes(normalized)) {
      setMultiValue([option]);
      return;
    }
    setMultiValue((current) => {
      const withoutNone = current.filter((item) => !["none", "no", "none of these"].includes(item.toLowerCase()));
      return withoutNone.includes(option) ? withoutNone.filter((item) => item !== option) : [...withoutNone, option];
    });
  }

  return (
    <article className="question-card">
      <div className="question-topline">
        <span>
          {String(progress.current).padStart(2, "0")} / {String(progress.total).padStart(2, "0")}
        </span>
        <div className="progress-track" aria-hidden="true">
          <i style={{ width: `${Math.min(100, (progress.current / progress.total) * 100)}%` }} />
        </div>
      </div>

      <h2>{question.text}</h2>
      {question.helperText && <p>{question.helperText}</p>}

      {question.id === "primary_symptom" && <SymptomOptionGrid question={question} onAnswer={onAnswer} />}

      {question.id !== "primary_symptom" && question.type === "single" && (
        <div className="answer-grid">
          {question.options?.map((option) => (
            <button className="answer-chip" key={option} type="button" onClick={() => onAnswer(question, option)}>
              {option}
            </button>
          ))}
        </div>
      )}

      {question.type === "multi" && (
        <>
          <div className="answer-grid">
            {question.options?.map((option) => (
              <button
                className={multiValue.includes(option) ? "answer-chip selected" : "answer-chip"}
                key={option}
                type="button"
                onClick={() => toggleMulti(option)}
                aria-pressed={multiValue.includes(option)}
              >
                {multiValue.includes(option) && <Check aria-hidden="true" />}
                {option}
              </button>
            ))}
          </div>
          <button
            className={buttonClass("primary", "submit-answer")}
            type="button"
            disabled={multiValue.length === 0}
            onClick={() => onAnswer(question, multiValue)}
          >
            {submitLabel}
            <ArrowRight aria-hidden="true" />
          </button>
        </>
      )}

      {question.type === "scale" && (
        <div className="scale-answer">
          <output>{scaleValue}/10</output>
          <input
            type="range"
            min="0"
            max="10"
            value={scaleValue}
            onChange={(event) => setScaleValue(Number(event.target.value))}
            aria-label={question.text}
          />
          <div className="scale-labels">
            <span>0</span>
            <span>10</span>
          </div>
          <button className={buttonClass("primary", "submit-answer")} type="button" onClick={() => onAnswer(question, scaleValue)}>
            {submitLabel}
            <ArrowRight aria-hidden="true" />
          </button>
        </div>
      )}

      {question.type === "text" && (
        <form
          className="text-answer"
          onSubmit={(event) => {
            event.preventDefault();
            onAnswer(question, textValue.trim() || "Not sure");
          }}
        >
          <textarea
            value={textValue}
            onChange={(event) => setTextValue(event.target.value)}
            rows={4}
            placeholder="Type a short answer"
          />
          <button className={buttonClass("primary", "submit-answer")} type="submit">
            {submitLabel}
            <ArrowRight aria-hidden="true" />
          </button>
        </form>
      )}

      {!question.required && (
        <button className={buttonClass("ghost", "skip-button")} type="button" onClick={() => onAnswer(question, "Skipped")}>
          Skip
        </button>
      )}
    </article>
  );
}

function SymptomOptionGrid({ question, onAnswer }: { question: Question; onAnswer: (question: Question, answer: AnswerValue) => void }) {
  const icons: Record<string, ReactNode> = {
    "Chest pain": <HeartPulse aria-hidden="true" />,
    "Breathing problem": <Wind aria-hidden="true" />,
    Headache: <Brain aria-hidden="true" />,
    Fever: <Thermometer aria-hidden="true" />,
    "Abdominal pain": <Activity aria-hidden="true" />,
    "Something else": <Sparkles aria-hidden="true" />
  };

  return (
    <div className="symptom-option-grid">
      {SYMPTOM_OPTIONS.map((option, index) => (
        <button key={option} type="button" onClick={() => onAnswer(question, option)}>
          <span>{String(index + 1).padStart(2, "0")}</span>
          {icons[option]}
          <strong>{option}</strong>
        </button>
      ))}
    </div>
  );
}

function EmergencyOverride({
  session,
  region,
  refTarget,
  onRestart
}: {
  session: TriageSession;
  region: CareRegion;
  refTarget: React.RefObject<HTMLDivElement | null>;
  onRestart: () => void;
}) {
  const tellThem = generateTellThemScript(session);
  const pathway = localizePathway(CARE_PATHWAYS["Emergency services now"], region);

  return (
    <article className="emergency-card" tabIndex={-1} ref={refTarget}>
      <div className="emergency-icon">
        <PhoneCall aria-hidden="true" />
      </div>
      <p className="eyebrow">Safety Override</p>
      <h2>{pathway.title}</h2>
      {session.aiExtraction && <p className="emergency-source">Emergency override activated from your description.</p>}
      <p className="emergency-message">{pathway.message}</p>
      <div className="tell-them">
        <span>Tell them</span>
        <strong>“{tellThem}”</strong>
      </div>
      <ExplainabilityPanel session={session} tier="Emergency services now" region={region} />
      <div className="result-actions">
        <button className={buttonClass("secondary")} type="button" onClick={onRestart}>
          Start new triage
          <RotateCcw aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}

function ResultScreen({
  session,
  tier,
  region,
  onRestart
}: {
  session: TriageSession;
  tier: UrgencyTier;
  region: CareRegion;
  onRestart: () => void;
}) {
  const pathway = localizePathway(CARE_PATHWAYS[tier], region);
  const meta = TIER_META[tier];

  return (
    <article className={`result-card ${meta.tone}`}>
      <div className="result-heading">
        <span>{meta.icon}</span>
        <div>
          <p className="eyebrow">Care Level</p>
          <h2>{pathway.title}</h2>
        </div>
      </div>
      <p className="result-message">{pathway.message}</p>
      <ExplainabilityPanel session={session} tier={tier} region={region} />
      <CareGuidance pathway={pathway} />
      <div className="result-actions">
        <button className={buttonClass("secondary")} type="button" onClick={onRestart}>
          Start new triage
          <RotateCcw aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}

function ExplainabilityPanel({ session, tier, region }: { session: TriageSession; tier: UrgencyTier; region: CareRegion }) {
  const redFlags = session.triage.redFlagsDetected;
  const pathway = localizePathway(CARE_PATHWAYS[tier], region);
  const nonEmergencyPoints = [
    "No emergency red flags were detected in the information provided.",
    session.presentingComplaint.severity0To10 !== null
      ? `Severity ${session.presentingComplaint.severity0To10}/10 influenced the care-level preview.`
      : "Missing severity can make the recommendation more conservative.",
    `The recommendation would change if symptoms become severe, rapidly worsening, or any listed red flag appears.`
  ];

  return (
    <section className="explain-panel">
      <h3>Why this care level?</h3>
      {redFlags.length ? (
        <ul>
          {redFlags.map((flag) => (
            <li key={flag.id}>
              Emergency override activated because {flag.label.toLowerCase()} was reported. The deterministic safety
              rule escalated to {pathway.title} instead of continuing normal questioning.
            </li>
          ))}
        </ul>
      ) : (
        <ul>
          {nonEmergencyPoints.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CareGuidance({ pathway }: { pathway: CarePathway }) {
  return (
    <div className="guidance-grid">
      <GuidanceList title="What to do now" items={pathway.whatToDoNow} />
      <GuidanceList title="What to tell the provider" items={pathway.whatToTellProvider} />
      <GuidanceList title="Red flags to watch for" items={pathway.redFlagsToWatch} />
      <div className="guidance-block">
        <h3>When to escalate</h3>
        <p>{pathway.whenToEscalate}</p>
      </div>
    </div>
  );
}

function GuidanceList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="guidance-block">
      <h3>{title}</h3>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function CareLevelPreview({ activeTier, region }: { activeTier: UrgencyTier | null; region: CareRegion }) {
  return (
    <section className="panel care-preview">
      <p className="eyebrow">Care Level</p>
      <h2>Pathway preview</h2>
      <div className="tier-list">
        {TIER_ORDER.map((tier) => {
          const meta = TIER_META[tier];
          return (
            <article className={activeTier === tier ? `tier-card active ${meta.tone}` : `tier-card ${meta.tone}`} key={tier}>
              <span>{meta.icon}</span>
              <div>
                <strong>{localizeTierLabel(tier, region)}</strong>
                <small>{meta.label}</small>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ProviderSummaryPanel({
  session,
  region,
  copied,
  onCopy,
  onDownloadTxt,
  onDownloadJson,
  onPrint
}: {
  session: TriageSession;
  region: CareRegion;
  copied: boolean;
  onCopy: () => void;
  onDownloadTxt: () => void;
  onDownloadJson: () => void;
  onPrint: () => void;
}) {
  const hasAssessment = Boolean(session.triage.urgencyTier);
  const summary = hasAssessment ? buildProviderSummary(session, region) : null;
  const associated = associatedSummary(session);
  const rows = [
    ["Presenting complaint", summary?.presentingComplaint ?? session.presentingComplaint.primarySymptom ?? "Not documented"],
    ["Timeline", summary?.symptomTimeline ?? session.presentingComplaint.duration ?? "Not documented"],
    [
      "Severity",
      summary?.severity ??
        (session.presentingComplaint.severity0To10 === null ? "Not documented" : `${session.presentingComplaint.severity0To10}/10`)
    ],
    ["Associated positives", summary?.associatedSymptoms.join(", ") || associated.join(", ") || "None documented"],
    ["Negative / denied", summary?.negativeSymptoms.join(", ") || session.deniedSymptoms.join(", ") || "None documented"],
    ["Red flags", summary?.redFlagsDetected.join(", ") || session.triage.redFlagsDetected.map((flag) => flag.label).join(", ") || "None"],
    ["AI urgency assessment", summary?.aiUrgencyAssessment ?? "Collecting details"],
    ["Recommended action", summary?.recommendedCarePathway ?? "Pending completion of the safety questions"]
  ];

  return (
    <section className="panel provider-summary print-summary">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Provider Brief</p>
          <h2>Structured patient summary</h2>
        </div>
        <FileText aria-hidden="true" />
      </div>
      <div className="summary-actions">
        <button type="button" onClick={onCopy}>
          {copied ? <CheckCircle2 aria-hidden="true" /> : <Clipboard aria-hidden="true" />}
          {copied ? "Copied" : "Copy summary"}
        </button>
        <button type="button" onClick={onDownloadTxt}>
          <Download aria-hidden="true" />
          Download .txt
        </button>
        <button type="button" onClick={onDownloadJson}>
          <Download aria-hidden="true" />
          Download .json
        </button>
        <button type="button" onClick={onPrint}>
          <Printer aria-hidden="true" />
          Print
        </button>
      </div>
      {summary?.patientFacingSummary && (
        <div className="patient-facing-summary">
          <h3>Patient-facing version</h3>
          <p>{summary.patientFacingSummary}</p>
        </div>
      )}
      <dl className="summary-list">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <div className="patient-instructions">
        <h3>Patient instructions</h3>
        {summary ? (
          <ul>
            {summary.patientInstructions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : (
          <p>Instructions will appear once the triage pathway is ready.</p>
        )}
      </div>
    </section>
  );
}

function EvaluationDashboard({ results, metrics }: { results: TriageTestResult[]; metrics: ReturnType<typeof calculateEvaluationMetrics> }) {
  return (
    <section className="section-band evaluation-section" id="evaluation">
      <SectionHeading label="Evaluation" title="Safety evaluation dashboard" />
      <div className="metric-grid">
        {[
          ["Total test cases", metrics.totalCases.toString()],
          ["Passed cases", metrics.passedCases.toString()],
          ["Emergency sensitivity", `${Math.round(metrics.emergencySensitivity * 100)}%`],
          ["Emergency misses", metrics.emergencyMisses.toString()],
          ["Safety override pass rate", `${Math.round(metrics.safetyOverridePassRate * 100)}%`]
        ].map(([label, value]) => (
          <article className={label === "Emergency misses" ? "metric-card zero-miss" : "metric-card"} key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
      <div className="evaluation-table-wrap">
        <table className="evaluation-table">
          <thead>
            <tr>
              <th>Test case</th>
              <th>Input summary</th>
              <th>Expected</th>
              <th>Actual</th>
              <th>Red flags detected</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {results.map((result) => (
              <tr key={result.id}>
                <td>{result.name}</td>
                <td>{result.inputSummary}</td>
                <td>{localizeTierLabel(result.expectedTier, DEFAULT_CARE_REGION)}</td>
                <td>{localizeTierLabel(result.actualTier, DEFAULT_CARE_REGION)}</td>
                <td>{result.redFlags.join(", ") || "None"}</td>
                <td>
                  <span className={result.passed ? "test-pass" : "test-fail"}>{result.passed ? "Pass" : "Fail"}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RecentAnswers({ session }: { session: TriageSession }) {
  if (!session.answers.length) return null;

  return (
    <section className="answer-history" aria-label="Recent answers">
      <p className="eyebrow">Clinical Thread</p>
      <div>
        {session.answers.slice(-5).map((answer) => {
          const question = answer.questionText;
          return (
            <article key={answer.questionId}>
              <span>{question}</span>
              <strong>{answerPreview({ id: answer.questionId, text: question, symptomGroup: "history", type: "text" }, answer.answer)}</strong>
            </article>
          );
        })}
      </div>
    </section>
  );
}

declare global {
  interface Window {
    runSignalCareTests?: typeof runTriageTestSuite;
    runSignalCarePatientContextTests?: typeof runPatientContextTestSuite;
  }
}

window.runSignalCareTests = runTriageTestSuite;
window.runSignalCarePatientContextTests = runPatientContextTestSuite;

export default App;
