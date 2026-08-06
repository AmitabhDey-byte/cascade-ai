"use client";

import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import { getLatestReport } from "@/lib/api";
import type { ConservationReport } from "@/types";

const SEVERITY_STYLES: Record<string, { color: string; border: string; bg: string }> = {
  CRITICAL: { color: "text-red-500", border: "border-red-500/30", bg: "bg-red-500/5" },
  HIGH: { color: "text-amber-400", border: "border-amber-400/30", bg: "bg-amber-400/5" },
  MED: { color: "text-yellow-300", border: "border-yellow-300/30", bg: "bg-yellow-300/5" },
  LOW: { color: "text-emerald-400", border: "border-emerald-400/30", bg: "bg-emerald-400/5" },
};

export default function Reports() {
  const [report, setReport] = useState<ConservationReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void getLatestReport()
      .then((latest) => {
        if (!controller.signal.aborted) setReport(latest);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError("No report is available yet. Generate one from the dashboard after a forecast is available.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const severity = report?.severity && SEVERITY_STYLES[report.severity]
    ? report.severity
    : report ? severityFromRiskSummary(report.risk_summary) : "LOW";
  const style = SEVERITY_STYLES[severity];

  return (
    <div className="min-h-screen bg-transparent font-['Orbitron'] text-white">
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage: "linear-gradient(rgba(0,255,140,0.02) 1px, transparent 1px),linear-gradient(90deg, rgba(0,255,140,0.02) 1px, transparent 1px)",
          backgroundSize: "50px 50px",
        }}
      />
      <Nav />

      <main className="relative mx-auto max-w-5xl px-6 py-8">
        <div className="mb-8">
          <h2 className="text-lg font-black tracking-[0.2em]">IMPACT REPORTS</h2>
          <p className="mt-1 text-[9px] tracking-[0.25em] text-white/30">FORECAST-DRIVEN CONSERVATION RESPONSE</p>
        </div>

        {loading ? (
          <div className="glass-panel rounded-xl p-8 text-center text-[9px] tracking-[0.2em] text-white/30">LOADING LATEST REPORT</div>
        ) : report ? (
          <article className="glass-panel rounded-xl p-6">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="mb-1 flex items-center gap-3">
                  <span className="text-base font-black tracking-[0.2em]">{report.id}</span>
                  <span className={`rounded-lg border px-3 py-1 text-[7px] font-black tracking-[0.25em] ${style.color} ${style.border} ${style.bg}`}>
                    {severity}
                  </span>
                </div>
                <div className="text-[8px] tracking-[0.15em] text-white/30">
                  {new Date(report.generated_at).toUTCString().slice(5, 22).toUpperCase()} UTC
                </div>
              </div>
              <div className="text-right text-[8px] tracking-[0.12em] text-white/40">
                <div>{report.tile_ids.length} AFFECTED AREAS</div>
                <div className="mt-1">{report.species_affected.length} AFFECTED SPECIES</div>
              </div>
            </div>

            <Section title="FORECAST SUMMARY"><p>{report.risk_summary}</p></Section>
            <Section title="ESTIMATED IMPACT"><p>{report.estimated_impact}</p></Section>
            <Section title="CONSERVATION ACTION PLAN">
              <ol className="space-y-2">
                {report.action_plan.split("\n").filter(Boolean).map((action, index) => (
                  <li key={`${index}-${action}`} className="flex gap-3 rounded-lg border border-white/[0.05] bg-white/[0.02] px-4 py-3">
                    <span className="shrink-0 text-[8px] font-black text-white/20">{String(index + 1).padStart(2, "0")}</span>
                    <span>{action}</span>
                  </li>
                ))}
              </ol>
            </Section>
          </article>
        ) : (
          <div className="glass-panel rounded-xl p-8 text-center">
            <div className="text-[9px] tracking-[0.2em] text-white/35">NO GENERATED REPORTS</div>
            <p className="mx-auto mt-3 max-w-md text-[9px] leading-relaxed tracking-[0.08em] text-white/45">{error}</p>
          </div>
        )}
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <div className="mb-3 flex items-center gap-2">
        <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        <h3 className="text-[8px] font-bold tracking-[0.25em] text-white/40">{title}</h3>
      </div>
      <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/[0.03] p-5 text-[10px] leading-relaxed tracking-[0.08em] text-white/65">{children}</div>
    </section>
  );
}

function severityFromRiskSummary(summary: string): keyof typeof SEVERITY_STYLES {
  const upper = summary.toUpperCase();
  if (upper.includes("CRITICAL")) return "CRITICAL";
  if (upper.includes("HIGH")) return "HIGH";
  if (upper.includes("MED")) return "MED";
  return "LOW";
}
