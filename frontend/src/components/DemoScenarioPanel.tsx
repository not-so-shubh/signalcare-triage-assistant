import { Activity, Brain, CircleDot, Flame, HeartPulse, Loader2, Zap } from "lucide-react";

interface DemoScenarioPanelProps {
  onLoadScenario: (id: string) => Promise<void>;
  loadingScenario: string | null;
}

const SCENARIOS = [
  {
    id: "emergency_chest",
    label: "Emergency Chest Pain",
    description: "Chest pain with left arm pain and shortness of breath",
    expected: "EMERGENCY_NOW",
    icon: HeartPulse,
    tone: "danger"
  },
  {
    id: "mild_chest",
    label: "Mild Chest Burning",
    description: "Food-triggered burning with key red flags denied",
    expected: "SELF_CARE",
    icon: Flame,
    tone: "success"
  },
  {
    id: "stroke",
    label: "Stroke Symptoms",
    description: "FAST warning signs with sudden onset",
    expected: "EMERGENCY_NOW",
    icon: Brain,
    tone: "danger"
  },
  {
    id: "abdominal",
    label: "Abdominal Pain + Vomiting",
    description: "Persistent vomiting and worsening pain",
    expected: "AE_TODAY",
    icon: CircleDot,
    tone: "warning"
  },
  {
    id: "headache",
    label: "Mild Headache",
    description: "Gradual screen-related headache",
    expected: "SELF_CARE",
    icon: Activity,
    tone: "info"
  }
];

export default function DemoScenarioPanel({ onLoadScenario, loadingScenario }: DemoScenarioPanelProps) {
  return (
    <section className="demo-scenario-panel section-block" aria-labelledby="demo-mode-title">
      <div className="section-heading split-heading">
        <div>
          <p className="eyebrow">Presentation demo mode</p>
          <h2 id="demo-mode-title">One-click demo flows for live review</h2>
          <p>Load a realistic case, run deterministic triage, generate a handoff, and jump straight to the result.</p>
        </div>
        <span className="status-pill neutral">
          <Zap aria-hidden="true" />
          Live demo ready
        </span>
      </div>
      <div className="scenario-grid">
        {SCENARIOS.map((scenario) => {
          const Icon = scenario.icon;
          const isLoading = loadingScenario === scenario.id;
          return (
            <button
              className={`scenario-card tone-${scenario.tone}`}
              key={scenario.id}
              type="button"
              onClick={() => void onLoadScenario(scenario.id)}
              disabled={Boolean(loadingScenario)}
            >
              <span className="scenario-icon">
                {isLoading ? <Loader2 aria-hidden="true" className="spin" /> : <Icon aria-hidden="true" />}
              </span>
              <span>
                <span className={`expected-tier tone-${scenario.tone}`}>{scenario.expected}</span>
                <strong>{scenario.label}</strong>
                <small>{scenario.description}</small>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
