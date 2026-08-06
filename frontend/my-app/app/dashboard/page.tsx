"use client";

import { useMemo, useState } from "react";

import Nav from "@/components/Nav";
import AIChat from "@/components/dashboard/AIChat";
import AlertTimeline from "@/components/dashboard/AlertTimeline";
import ReportViewer from "@/components/dashboard/ReportViewer";
import RiskScorePanel from "@/components/dashboard/RiskScorePanel";
import SpeciesAtRiskCards from "@/components/dashboard/SpeciesAtRiskCards";
import RiskMap from "@/components/maps/RiskMap";
import { useDashboardSpecies } from "@/hooks/useDashboardSpecies";
import { useRiskData } from "@/hooks/userRiskData";

export default function Dashboard() {
  const [chatOpen, setChatOpen] = useState(false);
  const { tiles, highRiskCount, lastUpdated, loading, status, triggerPipeline } = useRiskData(60_000);
  const { species } = useDashboardSpecies(60_000);

  const overview = useMemo(() => {
    const average = tiles.length ? tiles.reduce((sum, tile) => sum + tile.risk_score, 0) / tiles.length : 0;
    const highest = [...tiles].sort((a, b) => b.risk_score - a.risk_score)[0];
    return { average, highest };
  }, [tiles]);

  const lastRefresh = lastUpdated
    ? new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" }).format(lastUpdated) + " UTC"
    : "WAITING";
  const modeLabel = loading ? "REFRESHING" : status?.data_mode === "live" ? "LIVE FORECAST" : status?.data_mode === "demo" ? "LOCAL DEMO" : "AWAITING FIRST RUN";
  const sourceLabel = status?.run?.weather_source
    ? `${status.run.weather_source.toUpperCase()} + ${status.run.soil_moisture_source?.toUpperCase() ?? "SOIL DATA"}`
    : "OPEN-METEO + NASA SOIL DATA";

  return (
    <div className="ops-canvas min-h-screen text-white">
      <Nav />

      <main className="relative mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:py-8">
        <section className="mb-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-[8px] tracking-[0.18em] ${status?.data_mode === "demo" ? "border border-amber-400/30 bg-amber-400/10 text-amber-200" : "signal-chip"}`}>{modeLabel}</span>
              <span className="signal-label">REGIONAL FLOOD RESPONSE</span>
            </div>
            <h1 className="text-xl font-black tracking-[0.08em] sm:text-2xl">ASSAM + WEST BENGAL OPERATIONS</h1>
            <p className="mt-2 max-w-2xl text-[10px] leading-relaxed tracking-[0.08em] text-white/50">
              Prioritize the next field action from live precipitation, soil-moisture, and model signals. Select a regional signal on the map to inspect its forecast and species context.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="ops-panel rounded-xl px-4 py-3">
              <div className="signal-label">LAST FORECAST</div>
              <div className="mt-1 text-xs font-bold tracking-[0.08em] text-white/80">{lastRefresh}</div>
            </div>
            <button onClick={() => void triggerPipeline()} disabled={loading} className="rounded-xl border border-emerald-300/35 bg-emerald-400 px-4 py-3 text-[9px] font-black tracking-[0.16em] text-[#022017] transition hover:bg-emerald-300 disabled:cursor-wait disabled:opacity-55">
              {loading ? "UPDATING FORECAST" : "UPDATE FORECAST"}
            </button>
          </div>
        </section>

        <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Priority areas" value={String(highRiskCount)} detail="RISK SCORE ≥ 0.70" tone="text-red-300" />
          <Metric label="Regional average" value={overview.average.toFixed(2)} detail="CURRENT MODEL SCORE" tone="text-amber-200" />
          <Metric label="Coverage cells" value={String(tiles.length)} detail="ASSAM + WEST BENGAL" tone="text-sky-200" />
          <Metric label="Highest priority" value={overview.highest ? overview.highest.risk_score.toFixed(2) : "—"} detail={overview.highest ? overview.highest.tile_id.replaceAll("_", " ").toUpperCase() : "RUN A FORECAST"} tone="text-emerald-200" />
        </section>

        <section className="mb-5">
          <RiskMap />
        </section>

        <section className="mb-5 grid gap-5 xl:grid-cols-[0.85fr_1fr_1fr]">
          <RiskScorePanel />
          <SpeciesAtRiskCards />
          <ReportViewer tiles={tiles} />
        </section>

        <section className="mb-14">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="signal-label">DATA PROVENANCE</div>
              <div className="mt-1 text-[10px] tracking-[0.1em] text-white/70">{sourceLabel}</div>
            </div>
            <div className="text-[8px] tracking-[0.12em] text-white/35">STORAGE: {status?.storage === "neon" ? "NEON POSTGRES" : "LOCAL DEMO"}</div>
          </div>
          <AlertTimeline />
        </section>
      </main>

      <div className="fixed bottom-5 right-5 z-50 w-[min(24rem,calc(100vw-2.5rem))]">
        {chatOpen ? (
          <AIChat tiles={tiles} species={species} onClose={() => setChatOpen(false)} />
        ) : (
          <button onClick={() => setChatOpen(true)} className="ml-auto flex items-center gap-3 rounded-full border border-emerald-300/35 bg-[#071412]/95 px-5 py-3 text-[9px] font-black tracking-[0.14em] text-emerald-200 shadow-2xl transition hover:border-emerald-300 hover:bg-[#0a201a]">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400 text-[11px] text-[#052117]">+</span>
            ASK CASCADE AI
          </button>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: string }) {
  return (
    <article className="ops-panel rounded-xl p-4">
      <div className="signal-label">{label.toUpperCase()}</div>
      <div className={`mt-2 text-2xl font-black tracking-[0.08em] ${tone}`}>{value}</div>
      <div className="mt-2 truncate text-[8px] tracking-[0.12em] text-white/42" title={detail}>{detail}</div>
    </article>
  );
}
