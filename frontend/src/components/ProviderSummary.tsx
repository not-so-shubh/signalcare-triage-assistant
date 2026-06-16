import { useState } from "react";
import { CheckCircle2, Clipboard, Download, FileText, Printer } from "lucide-react";
import type { ProviderSummary as ProviderSummaryType } from "../types";

interface ProviderSummaryProps {
  summary: ProviderSummaryType | null;
}

function joinOrEmpty(items: string[]) {
  return items.length ? items.join(", ") : "Not documented";
}

export default function ProviderSummary({ summary }: ProviderSummaryProps) {
  const [copied, setCopied] = useState(false);

  if (!summary) {
    return (
      <section className="card provider-summary">
        <div className="empty-result-icon">
          <FileText aria-hidden="true" />
        </div>
        <p className="eyebrow">Provider summary</p>
        <h2>Provider Handoff Packet will appear after assessment</h2>
        <p className="muted">Run triage to generate a structured provider-ready handoff.</p>
      </section>
    );
  }

  const json = JSON.stringify(summary, null, 2);

  async function copySummary() {
    await navigator.clipboard.writeText(summary?.provider_facing_summary ?? "");
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function downloadJson() {
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "signalcare-provider-summary.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  function printSummary() {
    window.print();
  }

  const gridItems = [
    ["Presenting complaint", summary.presenting_complaint],
    ["Timeline", summary.timeline],
    ["Severity", summary.severity],
    ["Associated symptoms", joinOrEmpty(summary.associated_symptoms)],
    ["Relevant negatives", joinOrEmpty(summary.relevant_negatives)],
    ["Medical history", joinOrEmpty(summary.medical_history)],
    [
      "Medications / allergies",
      `Meds: ${joinOrEmpty(summary.medications_allergies.medications)} | Allergies: ${joinOrEmpty(
        summary.medications_allergies.allergies
      )}`
    ],
    ["AI urgency assessment", summary.ai_urgency_assessment]
  ];

  return (
    <section className="card provider-summary clinical-document">
      <div className="document-header">
        <div>
          <p className="eyebrow">Clinical handoff</p>
          <h2>Provider Handoff Packet</h2>
          <p>Structured for rapid review before the patient reaches the waiting room.</p>
        </div>
        <div className="action-row compact">
          <button className="button ghost" type="button" onClick={() => void copySummary()}>
            {copied ? <CheckCircle2 aria-hidden="true" /> : <Clipboard aria-hidden="true" />}
            {copied ? "Copied" : "Copy Summary"}
          </button>
          <button className="button ghost" type="button" onClick={printSummary}>
            <Printer aria-hidden="true" />
            Print
          </button>
          <button className="button primary" type="button" onClick={downloadJson}>
            <Download aria-hidden="true" />
            Download JSON
          </button>
        </div>
      </div>

      <div className="summary-document-grid">
        {gridItems.map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>

      <div className="summary-section provider-note">
        <h3>Provider-facing summary</h3>
        <p>{summary.provider_facing_summary}</p>
      </div>

      <div className="summary-columns">
        <div>
          <h3>Red flags</h3>
          <p>{joinOrEmpty(summary.red_flags)}</p>
        </div>
        <div>
          <h3>Matched safety rules</h3>
          <p>{joinOrEmpty(summary.matched_safety_rules)}</p>
        </div>
      </div>

      <p className="summary-disclaimer">{summary.safety_disclaimer}</p>
    </section>
  );
}
