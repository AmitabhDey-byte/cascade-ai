"use client";
import Nav from "@/components/Nav";
import { useState, useEffect } from "react";

const ALERTS = [
  { time: "06:42", severity: "HIGH", tile: "T-017", msg: "Flood risk 0.84 — Royal Bengal Tiger habitat" },
  { time: "05:18", severity: "MED", tile: "T-023", msg: "Soil moisture saturation — 3 Endangered species detected" },
  { time: "04:01", severity: "HIGH", tile: "T-009", msg: "Cyclone precursor signal — IMD webhook triggered" },
  { time: "02:30", severity: "LOW", tile: "T-031", msg: "Olive Ridley nesting zone flagged for monitoring" },
];

const PIPELINE = [
  { id: "01", name: "NASA SMAP INGEST", status: "COMPLETE", time: "06:40" },
  { id: "02", name: "NOAA WEATHER FETCH", status: "COMPLETE", time: "06:41" },
  { id: "03", name: "LSTM FLOOD MODEL", status: "COMPLETE", time: "06:42" },
  { id: "04", name: "GBIF SPECIES QUERY", status: "RUNNING", time: "06:43" },
  { id: "05", name: "BIOCLIP INFERENCE", status: "PENDING", time: "—" },
  { id: "06", name: "RAG SYNTHESIS", status: "PENDING", time: "—" },
  { id: "07", name: "CLAUDE REPORT GEN", status: "PENDING", time: "—" },
  { id: "08", name: "N8N DISPATCH", status: "PENDING", time: "—" },
];

const METRIC_CARDS = [
  { label: "ACTIVE ALERTS", value: "3", unit: "HIGH RISK TILES", color: "text-red-400", border: "border-red-400/20", bg: "bg-red-400/5" },
  { label: "AVG FLOOD RISK", value: "0.71", unit: "SCORE / GRID CELL", color: "text-amber-400", border: "border-amber-400/20", bg: "bg-amber-400/5" },
  { label: "SPECIES AT RISK", value: "14", unit: "CONFIRMED VIA BIOCLIP", color: "text-emerald-400", border: "border-emerald-400/20", bg: "bg-emerald-400/5" },
  { label: "NEXT CYCLE IN", value: "09:14", unit: "HH:MM", color: "text-blue-400", border: "border-blue-400/20", bg: "bg-blue-400/5" },
];

function StatusDot({ status }: { status: string }) {
  if (status === "COMPLETE") return <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />;
  if (status === "RUNNING") return <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />;
  return <span className="inline-block w-2 h-2 rounded-full bg-white/20" />;
}

export default function Dashboard() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const tick = () => setTime(new Date().toUTCString().slice(17, 25) + " UTC");
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen bg-black font-['Orbitron'] text-white">
      {/* Background grid */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(0,255,140,0.025) 1px, transparent 1px),linear-gradient(90deg, rgba(0,255,140,0.025) 1px, transparent 1px)`,
          backgroundSize: "50px 50px",
        }}
      />

      <Nav />

      <main className="relative mx-auto max-w-7xl px-6 py-8">
        {/* Header row */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-black tracking-[0.2em]">COMMAND DASHBOARD</h2>
              <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[8px] tracking-[0.25em] text-emerald-400">LIVE</span>
            </div>
            <p className="mt-1 text-[9px] tracking-[0.25em] text-white/30">SUNDARBANS DELTA · INDIA/BANGLADESH</p>
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

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Pipeline status — left col */}
          <div className="lg:col-span-2 rounded-xl border border-white/[0.07] bg-white/[0.02] p-6 backdrop-blur-sm">
            <h3 className="mb-5 text-[10px] font-bold tracking-[0.3em] text-white/60">PIPELINE STATUS</h3>
            <div className="space-y-3">
              {PIPELINE.map((step) => (
                <div key={step.id} className="flex items-center gap-4">
                  <StatusDot status={step.status} />
                  <div className="flex-1">
                    <div className="text-[9px] tracking-[0.15em] text-white/80">{step.id} · {step.name}</div>
                  </div>
                  <div className={`text-[8px] tracking-widest ${step.status === "RUNNING" ? "text-amber-400" : step.status === "COMPLETE" ? "text-emerald-400/60" : "text-white/20"}`}>
                    {step.time}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
              <div className="h-full w-[37.5%] rounded-full bg-emerald-400 transition-all" />
            </div>
            <div className="mt-2 text-[8px] tracking-[0.2em] text-white/25">3 / 8 STAGES COMPLETE</div>
          </div>

          {/* Alert feed — right col */}
          <div className="lg:col-span-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-6 backdrop-blur-sm">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-[10px] font-bold tracking-[0.3em] text-white/60">ACTIVE ALERTS</h3>
              <span className="text-[8px] tracking-[0.2em] text-white/25">LAST 12H</span>
            </div>
            <div className="space-y-3">
              {ALERTS.map((a, i) => (
                <div
                  key={i}
                  className="flex gap-4 rounded-lg border border-white/[0.05] bg-white/[0.02] p-4"
                >
                  <div className="shrink-0 text-[8px] tracking-widest text-white/30 pt-0.5">{a.time}</div>
                  <div
                    className={`shrink-0 self-start rounded px-2 py-0.5 text-[7px] font-bold tracking-[0.2em] ${
                      a.severity === "HIGH"
                        ? "bg-red-400/10 text-red-400 border border-red-400/20"
                        : a.severity === "MED"
                        ? "bg-amber-400/10 text-amber-400 border border-amber-400/20"
                        : "bg-blue-400/10 text-blue-400 border border-blue-400/20"
                    }`}
                  >
                    {a.severity}
                  </div>
                  <div>
                    <div className="text-[8px] tracking-[0.15em] text-white/30 mb-0.5">TILE {a.tile}</div>
                    <div className="text-[9px] leading-relaxed tracking-[0.1em] text-white/70">{a.msg}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom row — data sources status */}
        <div className="mt-6 rounded-xl border border-white/[0.07] bg-white/[0.02] p-5 backdrop-blur-sm">
          <h3 className="mb-4 text-[10px] font-bold tracking-[0.3em] text-white/40">DATA SOURCE HEALTH</h3>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
            {[
              { name: "NASA SMAP", lat: "12 HR", ok: true },
              { name: "NOAA", lat: "1 HR", ok: true },
              { name: "IMD", lat: "6 HR", ok: true },
              { name: "GBIF", lat: "LIVE", ok: true },
              { name: "IUCN RL", lat: "STATIC", ok: true },
              { name: "SRTM DEM", lat: "STATIC", ok: true },
            ].map((src) => (
              <div key={src.name} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <div>
                  <div className="text-[9px] tracking-[0.15em] text-white/70">{src.name}</div>
                  <div className="text-[7px] tracking-[0.1em] text-white/25">{src.lat}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}