"use client";
import Nav from "@/components/Nav";
import RiskScorePanel from "@/components/dashboard/RiskScorePanel";
import SpeciesAtRiskCards from "@/components/dashboard/SpeciesAtRiskCards";
import ReportViewer from "@/components/dashboard/ReportViewer";
import AlertTimeline from "@/components/dashboard/AlertTimeline";
import RiskMap from "@/components/maps/RiskMap";
import { useEffect, useState } from "react";
import { useRiskData } from "@/hooks/userRiskData";

export default function Dashboard() {
  const [time, setTime] = useState("");
  const [nowMs, setNowMs] = useState(0);
  const { tiles, highRiskCount, lastUpdated } = useRiskData(60000);

  const avgRisk = tiles.length ? tiles.reduce((sum, tile) => sum + tile.risk_score, 0) / tiles.length : 0;
  const nextCycle = lastUpdated
    ? `${Math.max(0, 12 - Math.floor((nowMs - lastUpdated.getTime()) / 3600000))}H`
    : "READY";
  const metricCards = [
    { label: "ACTIVE ALERTS", value: String(highRiskCount), unit: "HIGH-RISK AREAS", color: "text-red-400", border: "border-red-400/20", bg: "bg-red-400/5" },
    { label: "AVG FLOOD RISK", value: avgRisk.toFixed(2), unit: "LIVE MODEL SCORE", color: "text-amber-400", border: "border-amber-400/20", bg: "bg-amber-400/5" },
    { label: "AREAS TRACKED", value: String(tiles.length), unit: "SATELLITE BASIN CELLS", color: "text-emerald-400", border: "border-emerald-400/20", bg: "bg-emerald-400/5" },
    { label: "NEXT CYCLE", value: nextCycle, unit: "AUTO REFRESH WINDOW", color: "text-sky-400", border: "border-sky-400/20", bg: "bg-sky-400/5" },
  ];

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toUTCString().slice(17, 25) + " UTC");
      setNowMs(now.getTime());
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen bg-transparent font-['Orbitron'] text-white">
      {/* Background grid */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,255,140,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,255,140,0.025) 1px, transparent 1px)
          `,
          backgroundSize: "50px 50px",
        }}
      />

      <Nav />

      <main className="relative mx-auto max-w-7xl px-6 py-8">

        {/* Page header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-black tracking-[0.2em]">COMMAND DASHBOARD</h2>
              <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[8px] tracking-[0.25em] text-emerald-400">
                LIVE
              </span>
            </div>
            <p className="mt-1 text-[9px] tracking-[0.25em] text-white/30">
              SUNDARBANS DELTA · INDIA / BANGLADESH
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs tracking-[0.2em] text-white/40">{time}</div>
            <div className="mt-1 text-[8px] tracking-[0.2em] text-white/20">CYCLE 48 OF 72H FORECAST</div>
          </div>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-2 gap-4 mb-8 lg:grid-cols-4">
          {metricCards.map((c) => (
            <div key={c.label} className={`rounded-xl border ${c.border} ${c.bg} p-5 backdrop-blur-sm`}>
              <div className={`text-2xl font-black tracking-widest ${c.color}`}>{c.value}</div>
              <div className="mt-2 text-[8px] tracking-[0.25em] text-white/60">{c.label}</div>
              <div className="mt-1 text-[7px] tracking-[0.15em] text-white/25">{c.unit}</div>
            </div>
          ))}
        </div>

        {/* Map + Risk Panel row */}
        <div className="grid grid-cols-1 gap-6 mb-6 lg:grid-cols-3">
          <div className="lg:col-span-2 min-h-[360px]">
            <RiskMap />
          </div>
          <div>
            <RiskScorePanel />
          </div>
        </div>

        {/* Species + Report row */}
        <div className="grid grid-cols-1 gap-6 mb-6 lg:grid-cols-2">
          <SpeciesAtRiskCards />
          <ReportViewer />
        </div>

        {/* Alert timeline full width */}
        <AlertTimeline />

      </main>
    </div>
  );
}
