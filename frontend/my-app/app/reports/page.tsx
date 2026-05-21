"use client";
import { ConservationReport, getLatestReport } from "@/lib/api";
import Nav from "@/components/Nav";
import { useEffect, useState } from "react";

const REPORTS = [
  {
    id: "RPT-2847",
    timestamp: "21 MAY 2026 · 06:42 UTC",
    trigger: "FLOOD RISK > 0.70 · 4 TILES",
    severity: "HIGH",
    tilesAffected: 4,
    speciesAffected: 6,
    summary:
      "Cycle 48 analysis flags critical flood risk across tiles T-23, T-24, T-33, T-44 following 187mm precipitation forecast for next 72 hours. Royal Bengal Tiger and Ganges River Shark face highest displacement risk. Immediate ranger deployment recommended.",
    actions: [
      "Deploy ranger team to T-23 and T-24 by 08:00 UTC",
      "Set up temporary monitoring stations at grid perimeter",
      "Notify IUCN South Asia desk via secure channel",
      "Activate Twilio SMS for all on-call rangers",
      "Upload updated risk map to command portal",
    ],
    dispatched: ["TELEGRAM", "SMS", "EMAIL", "GSHEET"],
  },
  {
    id: "RPT-2846",
    timestamp: "20 MAY 2026 · 18:30 UTC",
    trigger: "ROUTINE CYCLE · NO THRESHOLD BREACH",
    severity: "LOW",
    tilesAffected: 1,
    speciesAffected: 2,
    summary:
      "Routine 12-hour scan. Risk scores within acceptable bounds. Olive Ridley nesting activity detected in T-33 — logged for seasonal tracking. No immediate action required.",
    actions: [
      "Continue passive monitoring of T-33 nesting zone",
      "Log Olive Ridley observation to GBIF portal",
    ],
    dispatched: ["GSHEET"],
  },
  {
    id: "RPT-2845",
    timestamp: "20 MAY 2026 · 06:28 UTC",
    trigger: "IMD CYCLONE ALERT WEBHOOK",
    severity: "CRITICAL",
    tilesAffected: 7,
    speciesAffected: 11,
    summary:
      "IMD cyclone precursor signal received. LSTM model rerun on fresh SMAP data — 7 tiles now above 0.70 threshold. Estimated landfall T+54H. All species in affected zones face severe displacement. Emergency protocol initiated.",
    actions: [
      "Emergency protocol ALPHA activated",
      "All field teams recalled to base",
      "Coordination call with Bangladesh Forest Dept at 09:00 UTC",
      "IUCN emergency fund application submitted",
      "Satellite phone check-in every 4 hours",
      "Pre-position evacuation boats at T-23 jetty",
    ],
    dispatched: ["TELEGRAM", "SMS", "EMAIL", "GSHEET", "TWILIO"],
  },
];

const SEVERITY_STYLES: Record<string, { label: string; color: string; border: string; bg: string }> = {
  CRITICAL: { label: "CRITICAL", color: "text-red-500", border: "border-red-500/30", bg: "bg-red-500/5" },
  HIGH: { label: "HIGH", color: "text-amber-400", border: "border-amber-400/30", bg: "bg-amber-400/5" },
  LOW: { label: "LOW", color: "text-emerald-400", border: "border-emerald-400/30", bg: "bg-emerald-400/5" },
};

const DISPATCH_COLORS: Record<string, string> = {
  TELEGRAM: "bg-blue-400/10 text-blue-400 border-blue-400/20",
  SMS: "bg-violet-400/10 text-violet-400 border-violet-400/20",
  EMAIL: "bg-white/10 text-white/60 border-white/10",
  GSHEET: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
  TWILIO: "bg-red-400/10 text-red-400 border-red-400/20",
};

export default function Reports() {
  const [reports, setReports] = useState(REPORTS);
  const [activeReport, setActiveReport] = useState(REPORTS[0]);

  useEffect(() => {
    getLatestReport()
      .then((apiReport: ConservationReport) => {
        const latest = {
          id: apiReport.report_id,
          timestamp: new Date(apiReport.timestamp).toUTCString().slice(5, 22).toUpperCase() + " UTC",
          trigger: apiReport.trigger,
          severity: apiReport.severity,
          tilesAffected: apiReport.tiles_affected.length,
          speciesAffected: apiReport.species_affected.length,
          summary: apiReport.impact_summary || apiReport.flood_risk_summary,
          actions: apiReport.action_plan,
          dispatched: apiReport.dispatched_to,
        };
        setReports([latest, ...REPORTS.filter((report) => report.id !== latest.id)]);
        setActiveReport(latest);
      })
      .catch(() => undefined);
  }, []);

  return (
    <div className="min-h-screen bg-transparent font-['Orbitron'] text-white">
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(0,255,140,0.02) 1px, transparent 1px),linear-gradient(90deg, rgba(0,255,140,0.02) 1px, transparent 1px)`,
          backgroundSize: "50px 50px",
        }}
      />
      <Nav />

      <main className="relative mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8">
          <h2 className="text-lg font-black tracking-[0.2em]">IMPACT REPORTS</h2>
          <p className="mt-1 text-[9px] tracking-[0.25em] text-white/30">CLAUDE-GENERATED · RAG SYNTHESIS · N8N DISPATCH</p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Report list */}
          <div className="space-y-3">
            {reports.map((r) => {
              const s = SEVERITY_STYLES[r.severity];
              const isActive = activeReport.id === r.id;
              return (
                <div
                  key={r.id}
                  onClick={() => setActiveReport(r)}
                  className={`cursor-pointer rounded-xl border p-4 transition ${
                    isActive ? `${s.border} ${s.bg}` : "border-white/[0.12] bg-white/[0.06] backdrop-blur-xl hover:border-white/[0.18]"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-[9px] font-black tracking-[0.2em] text-white/60">{r.id}</span>
                    <span className={`text-[7px] font-black tracking-[0.2em] ${s.color}`}>{r.severity}</span>
                  </div>
                  <div className="text-[7px] tracking-[0.1em] text-white/25 mb-1">{r.timestamp}</div>
                  <div className="text-[8px] tracking-[0.1em] text-white/50 leading-relaxed">{r.trigger}</div>
                  <div className="mt-3 flex gap-3">
                    <span className="text-[7px] tracking-[0.1em] text-white/30">{r.tilesAffected} TILES</span>
                    <span className="text-[7px] tracking-[0.1em] text-white/30">{r.speciesAffected} SPECIES</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Report detail */}
          <div className="lg:col-span-2 glass-panel rounded-xl p-6">
            {(() => {
              const s = SEVERITY_STYLES[activeReport.severity];
              return (
                <>
                  <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-base font-black tracking-[0.2em]">{activeReport.id}</span>
                        <span className={`rounded-lg border px-3 py-1 text-[7px] font-black tracking-[0.25em] ${s.color} ${s.border} ${s.bg}`}>
                          {s.label}
                        </span>
                      </div>
                      <div className="text-[8px] tracking-[0.15em] text-white/30">{activeReport.timestamp}</div>
                    </div>
                    <div className="flex gap-2 flex-wrap justify-end">
                      {activeReport.dispatched.map((d) => (
                        <span
                          key={d}
                          className={`rounded-md border px-2.5 py-1 text-[7px] tracking-[0.15em] ${DISPATCH_COLORS[d]}`}
                        >
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Trigger */}
                  <div className="mb-5 rounded-lg border border-white/[0.05] bg-white/[0.02] px-4 py-3">
                    <div className="text-[7px] tracking-[0.2em] text-white/25 mb-1">TRIGGER CONDITION</div>
                    <div className="text-[9px] tracking-[0.15em] text-white/60">{activeReport.trigger}</div>
                  </div>

                  {/* AI summary */}
                  <div className="mb-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <div className="text-[8px] font-bold tracking-[0.25em] text-white/40">CLAUDE IMPACT SUMMARY</div>
                    </div>
                    <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/[0.03] p-5">
                      <p className="text-[10px] leading-relaxed tracking-[0.1em] text-white/70">
                        {activeReport.summary}
                      </p>
                    </div>
                  </div>

                  {/* Action plan */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      <div className="text-[8px] font-bold tracking-[0.25em] text-white/40">CONSERVATION ACTION PLAN</div>
                    </div>
                    <div className="space-y-2">
                      {activeReport.actions.map((action, i) => (
                        <div key={i} className="flex items-start gap-3 rounded-lg border border-white/[0.05] bg-white/[0.02] px-4 py-3">
                          <span className="text-[8px] font-black tracking-[0.1em] text-white/20 shrink-0 pt-0.5">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span className="text-[9px] leading-relaxed tracking-[0.1em] text-white/60">{action}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 flex items-center gap-3 text-[7px] tracking-[0.15em] text-white/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/40" />
                    GENERATED BY CASCADE AI · CLAUDE SONNET · IUCN RED LIST CONTEXT RETRIEVED VIA RAG
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </main>
    </div>
  );
}
