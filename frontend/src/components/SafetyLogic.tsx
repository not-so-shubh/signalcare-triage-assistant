import { Bot, ClipboardCheck, GitBranch, ShieldAlert, ShieldCheck } from "lucide-react";

const FEATURES = [
  {
    icon: ShieldAlert,
    title: "Deterministic Guardrails",
    copy: "Emergency warning patterns immediately select EMERGENCY_NOW and cannot be downgraded by ordinary scoring."
  },
  {
    icon: Bot,
    title: "Adaptive Intake",
    copy: "The assistant asks symptom-specific follow-ups instead of the same generic form for every complaint."
  },
  {
    icon: ClipboardCheck,
    title: "Provider Handoff",
    copy: "Structured summaries include timeline, severity, associated symptoms, relevant negatives, and care pathway."
  },
  {
    icon: GitBranch,
    title: "Explainable Trace",
    copy: "Every result shows how the complaint was categorized, normalized, checked, scored, and routed."
  }
];

export default function SafetyLogic() {
  return (
    <section className="safety-logic-section section-block" id="safety-logic" aria-labelledby="safety-logic-title">
      <div className="section-heading">
        <p className="eyebrow">Safety-first architecture</p>
        <h2 id="safety-logic-title">Command logic, not chatbot guessing</h2>
        <p>
          Conversation collects data; deterministic rules make triage decisions. Emergency guardrails override
          lower-risk scoring, and uncertainty escalates instead of reassuring.
        </p>
      </div>

      <div className="logic-grid">
        {FEATURES.map((feature) => {
          const Icon = feature.icon;
          return (
            <article className="logic-card" key={feature.title}>
              <span className="logic-icon">
                <Icon aria-hidden="true" />
              </span>
              <h3>{feature.title}</h3>
              <p>{feature.copy}</p>
            </article>
          );
        })}
      </div>

      <div className="logic-callout">
        <ShieldCheck aria-hidden="true" />
        <span>
          Educational prototype only. It does not diagnose, replace clinicians, or certify clinical accuracy.
        </span>
      </div>
    </section>
  );
}
