import { useEffect, useState } from "react";
import { CheckCircle2, Download, Loader2, PlayCircle, ShieldCheck, XCircle } from "lucide-react";
import { runDemoCases } from "../api";
import type { DemoRunResponse, MetricCount } from "../types";

function AnimatedFraction({ metric }: { metric: MetricCount }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let frame = 0;
    const totalFrames = 22;
    const timer = window.setInterval(() => {
      frame += 1;
      setCount(Math.round((metric.passed * frame) / totalFrames));
      if (frame >= totalFrames) {
        window.clearInterval(timer);
        setCount(metric.passed);
      }
    }, 24);

    return () => window.clearInterval(timer);
  }, [metric.passed]);

  return (
    <strong>
      {count}/{metric.total}
    </strong>
  );
}

function MetricCard({ label, metric }: { label: string; metric: MetricCount }) {
  const passed = metric.total > 0 && metric.passed === metric.total;
  return (
    <div className={passed ? "metric-card pass" : "metric-card fail"}>
      <span className="metric-icon">
        {passed ? <CheckCircle2 aria-hidden="true" /> : <XCircle aria-hidden="true" />}
      </span>
      <span>{label}</span>
      <AnimatedFraction metric={metric} />
      <small>{passed ? "All checks passed" : "Review required"}</small>
    </div>
  );
}

export default function TestDashboard() {
  const [data, setData] = useState<DemoRunResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runSuite() {
    setLoading(true);
    setError(null);
    try {
      setData(await runDemoCases());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to run demo cases");
    } finally {
      setLoading(false);
    }
  }

  function exportReport() {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "signalcare-safety-demo-report.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="test-dashboard section-block">
      <div className="section-heading split-heading">
        <div>
          <p className="eyebrow">Safety validation</p>
          <h2>Safety Validation Matrix</h2>
          <p className="panel-subcopy">This simulation verifies that emergency guardrails override standard scoring.</p>
        </div>
        <div className="action-row compact">
          <button className="button ghost" type="button" onClick={exportReport} disabled={!data}>
            <Download aria-hidden="true" />
            Export demo report
          </button>
          <button className="button secondary" type="button" onClick={() => void runSuite()} disabled={loading}>
            {loading ? <Loader2 aria-hidden="true" className="spin" /> : <PlayCircle aria-hidden="true" />}
            {loading ? "Running simulation..." : "Run Safety Test Suite"}
          </button>
        </div>
      </div>

      <div className="dashboard-explainer">
        <ShieldCheck aria-hidden="true" />
        <span>
          Emergency cases must classify as <strong>EMERGENCY_NOW</strong>, and similar mild complaints must avoid
          unsafe overclassification.
        </span>
      </div>

      {error && <div className="error-box">{error}</div>}

      {data ? (
        <>
          <div className="metric-grid">
            <MetricCard label="Emergency cases caught" metric={data.metrics.emergency_cases_caught} />
            <MetricCard label="Guardrail overrides passed" metric={data.metrics.guardrail_overrides_passed} />
            <MetricCard label="Similar cases differentiated" metric={data.metrics.similar_cases_differentiated} />
            <MetricCard label="Provider summaries complete" metric={data.metrics.provider_summaries_complete} />
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Demo case</th>
                  <th>Expected</th>
                  <th>Actual</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.results.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.expected_tier}</td>
                    <td>{item.actual_tier}</td>
                    <td>
                      <span className={item.passed ? "status-pill success" : "status-pill danger"}>
                        {item.passed ? "Pass" : "Review"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="dashboard-empty">
          Run the safety suite to populate metrics and demo-case results.
        </div>
      )}
    </section>
  );
}
