import { AlertTriangle } from "lucide-react";

export default function DisclaimerBanner() {
  return (
    <section className="disclaimer-banner" aria-label="Safety disclaimer">
      <AlertTriangle aria-hidden="true" />
      <strong>Emergency symptoms need immediate professional help.</strong>
      <span>
        SignalCare Triage is an educational prototype. It does not diagnose, prescribe, or replace a
        clinician.
      </span>
    </section>
  );
}
