"use client";
import Nav from "@/components/Nav";
import RiskScorePanel from "@/components/dashboard/RiskScorePanel";
import SpeciesAtRiskCards from "@/components/dashboard/SpeciesAtRiskCards";
import ReportViewer from "@/components/dashboard/ReportViewer";
import AlertTimeline from "@/components/dashboard/AlertTimeline";
import RiskMap from "@/components/maps/RiskMap";
import { useEffect, useState } from "react";

const METRIC_CARDS = [
  { label: "ACTIVE ALERTS",   value: "3",     unit: "HIGH RISK TILES",        color: "text-red-400",     border: "border-red-400/20",     bg: "bg-red-400/5" },
  { label: "AVG FLOOD RISK",  value: "0.71",  unit: "SCORE / GRID CELL",      color: "text-amber-400",   border: "border-amber-400/20",   bg: "bg-amber-400/5" },
  { label: "SPECIES AT RISK", value: "14",    unit: "CONFIRMED VIA BIOCLIP",  color: "text-emerald-400", border: "border-emerald-400/20", bg: "bg-emerald-400/5" },
  { label: "NEXT CYCLE IN",   value: "09:14", unit: "HH:MM",                  color: "text-blue-400",    border: "border-blue-400/20",    bg: "bg-blue-400/5" },
];

export default function Dashboard() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const tick = () => setTime(new Date().toUTCString().slice(17, 25) + " UTC");
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
          {METRIC_CARDS.map((c) => (
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
