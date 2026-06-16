import { Activity, ArrowRight, CheckCircle2, ClipboardCheck, FileText, ShieldAlert, ShieldCheck, Sparkles } from "lucide-react";

interface HeroSectionProps {
  onStart: () => void;
  onRunSafetyDemo: () => void;
}

const TRUST_BADGES = [
  "6/6 emergency cases caught",
  "Guardrail override active",
  "Provider handoff ready"
];

export default function HeroSection({ onStart, onRunSafetyDemo }: HeroSectionProps) {
  return (
    <header className="hero-section" id="top">
      <div className="page-container hero-grid">
        <div className="hero-copy">
          <span className="hero-kicker">
            <Sparkles aria-hidden="true" />
            Safety-first triage prototype
          </span>
          <h1>AI triage command center for safer care routing.</h1>
          <p className="hero-description">
            A safety-first assistant that collects symptoms, triggers deterministic emergency guardrails, and
            generates provider-ready handoff summaries.
          </p>

          <div className="hero-actions">
            <button className="button primary hero-cta" type="button" onClick={onStart}>
              Launch Triage Console
              <ArrowRight aria-hidden="true" />
            </button>
            <button className="button ghost hero-cta" type="button" onClick={onRunSafetyDemo}>
              Run Safety Simulation
              <ClipboardCheck aria-hidden="true" />
            </button>
          </div>

          <div className="trust-badges" aria-label="Safety features">
            {TRUST_BADGES.map((badge) => (
              <span className="trust-badge" key={badge}>
                <ShieldCheck aria-hidden="true" />
                {badge}
              </span>
            ))}
          </div>
        </div>

        <div className="hero-visual" aria-label="Mock SignalCare triage workflow">
          <div className="product-mockup">
            <div className="scanner-line" aria-hidden="true" />
            <div className="mockup-topbar">
              <div>
                <span />
                <span />
                <span />
              </div>
              <strong>Live triage session</strong>
              <span className="status-pill danger">Guardrail active</span>
            </div>

            <div className="mockup-body">
              <div className="pulse-wave" aria-hidden="true">
                <svg viewBox="0 0 360 74" role="presentation">
                  <path d="M0 39 H46 L58 39 L68 15 L84 60 L99 39 H142 L154 39 L166 22 L178 52 L190 39 H244 L258 39 L270 18 L285 58 L300 39 H360" />
                </svg>
              </div>
              <div className="mockup-panel intake">
                <div className="mockup-panel-title">
                  <ClipboardCheck aria-hidden="true" />
                  Patient signal
                </div>
                <div className="mock-field">
                  <span>Primary complaint</span>
                  <strong>Chest pain</strong>
                </div>
                <div className="mock-chip-row">
                  <span>left arm pain</span>
                  <span>shortness of breath</span>
                  <span>sweating</span>
                </div>
              </div>

              <div className="mock-flow">
                <div className="mock-step complete">
                  <span><CheckCircle2 aria-hidden="true" /></span>
                  <div>
                    <strong>Symptom intake</strong>
                    <small>Radiation and breathing symptoms detected</small>
                  </div>
                </div>
                <div className="mock-step danger">
                  <span><ShieldAlert aria-hidden="true" /></span>
                  <div>
                    <strong>Guardrail engine</strong>
                    <small>Chest pain + arm pain + shortness of breath</small>
                  </div>
                </div>
                <div className="mock-step">
                  <span><FileText aria-hidden="true" /></span>
                  <div>
                    <strong>Provider handoff</strong>
                    <small>Structured summary ready</small>
                  </div>
                </div>
              </div>

              <div className="mock-recommendation">
                <div className="pulse-dot" aria-hidden="true" />
                <div>
                  <span>Emergency route</span>
                  <strong>Call emergency services now</strong>
                </div>
                <Activity aria-hidden="true" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
