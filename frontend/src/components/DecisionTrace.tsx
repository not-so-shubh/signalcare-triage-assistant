import { Activity, CheckCircle2, GitBranch, Search, ShieldAlert } from "lucide-react";
import type { DecisionTraceStep } from "../types";

interface DecisionTraceProps {
  steps: DecisionTraceStep[];
}

const STEP_ICONS = [Search, Activity, ShieldAlert, GitBranch, CheckCircle2];

export default function DecisionTrace({ steps }: DecisionTraceProps) {
  return (
    <section className="card decision-trace">
      <div className="card-header">
        <div>
          <p className="eyebrow">Explainability</p>
          <h2>Guardrail Decision Trace</h2>
        </div>
      </div>

      {steps.length === 0 ? (
        <p className="muted">The rule trace will appear after assessment.</p>
      ) : (
        <ol className="timeline">
          {steps.map((step, index) => {
            const Icon = STEP_ICONS[index] ?? GitBranch;
            const emergency = step.label.toLowerCase().includes("emergency");
            return (
              <li className={emergency ? "timeline-item emergency" : "timeline-item"} key={`${step.step}-${step.label}`}>
                <span className="timeline-index">
                  <Icon aria-hidden="true" />
                </span>
                <div className="timeline-content">
                  <span className="timeline-step">Step {step.step}</span>
                  <h3>{step.label}</h3>
                  <p>{step.details}</p>
                  {step.evidence.length > 0 && (
                    <div className="evidence-row">
                      {step.evidence.slice(0, 6).map((item) => (
                        <span className={emergency ? "data-chip danger-chip" : "data-chip"} key={item}>
                          {item}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
