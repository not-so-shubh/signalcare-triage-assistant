import { Activity, RotateCcw, ShieldCheck, Stethoscope } from "lucide-react";

interface NavigationProps {
  onNavigate: (id: string) => void;
  onReset: () => void;
}

const NAV_ITEMS = [
  { label: "Triage", target: "triage" },
  { label: "Safety Logic", target: "safety-logic" },
  { label: "Demo Dashboard", target: "demo-dashboard" },
  { label: "Provider Summary", target: "provider-summary" }
];

export default function Navigation({ onNavigate, onReset }: NavigationProps) {
  return (
    <nav className="top-nav" aria-label="Primary navigation">
      <div className="nav-inner page-container">
        <button className="brand-mark" type="button" onClick={() => onNavigate("top")}>
          <span className="brand-icon">
            <Stethoscope aria-hidden="true" />
          </span>
          <span>
            <strong>SignalCare</strong>
            <small>Triage</small>
          </span>
        </button>

        <div className="nav-links">
          {NAV_ITEMS.map((item) => (
            <button key={item.target} type="button" onClick={() => onNavigate(item.target)}>
              {item.label}
            </button>
          ))}
        </div>

        <div className="nav-actions">
          <span className="system-status">
            <Activity aria-hidden="true" />
            System online
          </span>
          <span className="disclaimer-badge">
            <ShieldCheck aria-hidden="true" />
            Not medical advice
          </span>
          <button className="button ghost nav-reset" type="button" onClick={onReset}>
            <RotateCcw aria-hidden="true" />
            Reset
          </button>
        </div>
      </div>
    </nav>
  );
}
