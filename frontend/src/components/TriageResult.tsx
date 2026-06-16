import { AlertTriangle, Ambulance, CheckCircle2, Clock3, Info, ShieldAlert, ShieldCheck } from "lucide-react";
import type { TriageResult as TriageResultType, UrgencyTier } from "../types";

interface TriageResultProps {
  result: TriageResultType | null;
}

const TIER_META: Record<UrgencyTier, { icon: typeof AlertTriangle; label: string; callout: string }> = {
  EMERGENCY_NOW: {
    icon: Ambulance,
    label: "EMERGENCY ROUTE ACTIVATED",
    callout: "Hard safety guardrail active. This result cannot be downgraded by normal scoring."
  },
  AE_TODAY: {
    icon: AlertTriangle,
    label: "Same-day urgent care",
    callout: "Same-day emergency department or A&E assessment is recommended."
  },
  GP_URGENT: {
    icon: Clock3,
    label: "Prompt primary care",
    callout: "Urgent GP, nurse line, or clinic advice is recommended."
  },
  GP_ROUTINE: {
    icon: Info,
    label: "Routine follow-up",
    callout: "Routine primary care follow-up is appropriate if symptoms persist or recur."
  },
  SELF_CARE: {
    icon: CheckCircle2,
    label: "Monitor at home",
    callout: "Self-care with clear escalation guidance may be reasonable from the information provided."
  }
};

export default function TriageResult({ result }: TriageResultProps) {
  if (!result) {
    return (
      <section className="card result-placeholder">
        <div className="empty-result-icon">
          <ShieldCheck aria-hidden="true" />
        </div>
        <p className="eyebrow">Triage status</p>
        <h2>Assessment pending</h2>
        <p>Complete intake details and run the deterministic triage assessment.</p>
      </section>
    );
  }

  const meta = TIER_META[result.tier];
  const Icon = meta.icon;
  const isEmergency = result.tier === "EMERGENCY_NOW";
  const displayTitle = isEmergency ? "EMERGENCY ROUTE ACTIVATED" : result.title;

  return (
    <section className={`card triage-result tier-${result.tier.toLowerCase()}`} aria-live="polite">
      <div className="result-topline">
        <span className="tier-pill">
          <Icon aria-hidden="true" />
          {result.tier.replace(/_/g, " ")}
        </span>
        <span className="confidence">Confidence: {result.confidence}</span>
      </div>

      <div className="result-title-row">
        <span className={isEmergency ? "result-icon emergency-pulse" : "result-icon"}>
          <Icon aria-hidden="true" />
        </span>
        <div>
          <p className="eyebrow">{meta.label}</p>
          <h2>{displayTitle}</h2>
        </div>
      </div>

      <p className="recommendation">{result.recommendation}</p>
      <div className="urgency-meter" aria-label={`Urgency tier ${result.tier}`}>
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>

      <div className={isEmergency ? "override-callout active" : "override-callout"}>
        <ShieldAlert aria-hidden="true" />
        <span>{meta.callout}</span>
      </div>

      <div className="pathway-block">
        <h3>What to do now</h3>
        <ul>
          {result.care_pathway.what_to_do_now.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="result-grid">
        <div className="reason-card">
          <h3>Why this tier?</h3>
          <ul>
            {result.reasoning.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="reason-card">
          <h3>Matched rules</h3>
          {result.matched_rules.length ? (
            <div className="badge-list">
              {result.matched_rules.map((rule) => (
              <span className="data-chip" key={rule}>
                  {rule}
                </span>
              ))}
            </div>
          ) : (
            <p>No hard emergency rule matched.</p>
          )}
        </div>
      </div>

      {result.red_flags.length > 0 && (
        <div className="red-flag-strip">
          <strong>Red flags found</strong>
          <div className="badge-list">
            {result.red_flags.map((flag) => (
              <span className="data-chip danger-chip" key={flag}>
                {flag}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
