"use client";

import { useMemo, useState } from "react";
import Image from "next/image";

import { useRiskData } from "@/hooks/userRiskData";
import { useSpeciesData } from "@/hooks/userSpeciesData";
import { riskLabel, tileScore } from "@/lib/api";
import { DEFAULT_VIEW, MAPBOX_TOKEN, OPERATIONS_BOUNDS } from "@/lib/mapbox";
import type { Horizon, RiskTile, SpeciesAlert } from "@/types";

const HORIZONS: Horizon[] = ["24H", "48H", "72H"];
const REGIONS = ["ALL", "West Bengal", "Assam"] as const;

export default function RiskMap() {
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [horizon, setHorizon] = useState<Horizon>("24H");
  const [region, setRegion] = useState<(typeof REGIONS)[number]>("ALL");
  const [mapError, setMapError] = useState(false);
  const { tiles, loading, error, triggerPipeline, lastUpdated, status } = useRiskData();
  const { species } = useSpeciesData(selectedAreaId);

  const visibleTiles = useMemo(() => region === "ALL" ? tiles : tiles.filter((tile) => tile.region === region), [region, tiles]);
  const selectedArea = visibleTiles.find((tile) => tile.tile_id === selectedAreaId) ?? null;
  const avgRisk = visibleTiles.length ? visibleTiles.reduce((total, tile) => total + tileScore(tile, horizon), 0) / visibleTiles.length : 0;
  const highest = [...visibleTiles].sort((a, b) => tileScore(b, horizon) - tileScore(a, horizon))[0];

  return (
    <div className="ops-panel h-full min-h-[560px] overflow-hidden rounded-2xl">
      <div className="flex flex-col gap-4 border-b border-white/[0.08] bg-[#07110e]/72 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="signal-label">OPERATIONAL COVERAGE · ASSAM + WEST BENGAL</div>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <span className="text-sm font-black tracking-[0.14em] text-white">FLOOD INTELLIGENCE MAP</span>
            <span className={`rounded-full px-2.5 py-1 text-[8px] tracking-[0.16em] ${status?.data_mode === "demo" ? "border border-amber-400/30 bg-amber-400/10 text-amber-200" : "signal-chip"}`}>
              {loading ? "UPDATING" : status?.data_mode === "live" ? "LIVE FORECAST" : status?.data_mode === "demo" ? "LOCAL DEMO" : "AWAITING RUN"}
            </span>
          </div>
          <p className="mt-1 text-[8px] tracking-[0.08em] text-white/40">{status?.run?.weather_source ? `${status.run.weather_source.toUpperCase()} · ${status.run.soil_moisture_source?.toUpperCase() ?? "SOIL DATA"}` : "Run the pipeline to fetch the latest regional forecast."}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex overflow-hidden rounded-md border border-white/[0.1]">{REGIONS.map((item) => <button key={item} onClick={() => { setRegion(item); setSelectedAreaId(null); }} className={`h-8 px-2.5 text-[8px] tracking-[0.12em] transition ${region === item ? "bg-white/10 text-white" : "bg-black/20 text-white/38 hover:text-white/70"}`}>{item === "ALL" ? "ALL" : item === "West Bengal" ? "WB" : "AS"}</button>)}</div>
          <div className="flex overflow-hidden rounded-md border border-white/[0.1]">{HORIZONS.map((item) => <button key={item} onClick={() => setHorizon(item)} className={`h-8 px-3 text-[9px] tracking-[0.18em] transition ${horizon === item ? "bg-emerald-400/20 text-emerald-300" : "bg-black/20 text-white/38 hover:text-white/70"}`}>{item}</button>)}</div>
          <button onClick={() => void triggerPipeline()} disabled={loading} className="h-8 rounded-md border border-emerald-400/30 bg-emerald-400/10 px-3 text-[9px] tracking-[0.16em] text-emerald-200 transition hover:bg-emerald-400/18 disabled:cursor-not-allowed disabled:opacity-45">{loading ? "RUNNING" : "RUN PREDICTION"}</button>
        </div>
      </div>

      <div className="grid h-[calc(100%-69px)] min-h-[450px] grid-cols-1 lg:grid-cols-[1fr_300px]">
        <div className="relative min-h-[390px] overflow-hidden bg-[#b8cbb8]">
          {MAPBOX_TOKEN ? (
            <>
              <Image src={mapImageUrl()} alt="Regional basemap of Assam and West Bengal" fill priority unoptimized sizes="(max-width: 1024px) 100vw, 75vw" className="object-cover" onError={() => setMapError(true)} />
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(4,22,16,0.06),rgba(4,22,16,0.28)),radial-gradient(ellipse_at_center,transparent_42%,rgba(2,10,7,0.3))]" />
              {!mapError && visibleTiles.map((tile) => <RiskSignal key={tile.tile_id} tile={tile} horizon={horizon} selected={tile.tile_id === selectedAreaId} onSelect={() => setSelectedAreaId((current) => current === tile.tile_id ? null : tile.tile_id)} />)}
            </>
          ) : <MapTokenNotice />}
          {mapError && <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#0b1711] p-6 text-center"><div><div className="text-[10px] tracking-[0.22em] text-amber-200">MAP BACKGROUND UNAVAILABLE</div><p className="mt-2 max-w-sm text-[8px] leading-relaxed tracking-[0.08em] text-white/50">Mapbox did not return a regional image. Confirm that the public token allows this domain, then refresh the page.</p></div></div>}

          <div className="pointer-events-none absolute left-4 top-4 z-10 grid gap-2 sm:grid-cols-3">{[
            { label: "AVG RISK", value: avgRisk.toFixed(2), color: colorForScore(avgRisk) },
            { label: "HIGH-RISK AREAS", value: String(visibleTiles.filter((tile) => tile.is_high_risk).length), color: "#f97316" },
            { label: "AREAS TRACKED", value: String(visibleTiles.length), color: "#38bdf8" },
          ].map((item) => <div key={item.label} className="rounded-md border border-white/[0.16] bg-[#04100c]/76 px-3 py-2 shadow-xl backdrop-blur-md"><div className="text-base font-black" style={{ color: item.color }}>{item.value}</div><div className="mt-0.5 text-[7px] tracking-[0.18em] text-white/45">{item.label}</div></div>)}</div>
          <div className="pointer-events-none absolute bottom-4 left-4 z-10 flex flex-wrap gap-2">{["LOW", "MODERATE", "HIGH", "CRITICAL"].map((label, index) => <div key={label} className="flex items-center gap-2 rounded-md border border-white/[0.14] bg-[#04100c]/76 px-2.5 py-1.5 backdrop-blur-md"><span className="h-2 w-4 rounded-full" style={{ background: `linear-gradient(90deg, ${riskGradientStop(index)}, ${riskGradientStop(index + 1)})` }} /><span className="text-[7px] tracking-[0.16em] text-white/55">{label}</span></div>)}<div className="hidden items-center rounded-md border border-white/[0.14] bg-[#04100c]/76 px-2.5 py-1.5 text-[7px] tracking-[0.13em] text-white/48 backdrop-blur-md sm:flex">SMOOTH SURFACE · CLICK A SIGNAL</div></div>
        </div>
        <aside className="border-t border-white/[0.07] bg-[#030a08]/68 p-4 backdrop-blur-md lg:border-l lg:border-t-0"><div className="text-[9px] font-bold tracking-[0.25em] text-white/35">AREA INTEL</div>{selectedArea ? <SelectedArea area={selectedArea} horizon={horizon} species={species} /> : <EmptyArea highest={highest} horizon={horizon} />}{error && <div className="mt-4 rounded-md border border-red-400/20 bg-red-400/10 p-3 text-[8px] leading-relaxed text-red-200">{error}</div>}{lastUpdated && <div className="mt-4 text-[7px] tracking-[0.16em] text-white/18">LAST SYNC {lastUpdated.toLocaleTimeString()}</div>}</aside>
      </div>
    </div>
  );
}

function RiskSignal({ tile, horizon, selected, onSelect }: { tile: RiskTile; horizon: Horizon; selected: boolean; onSelect: () => void }) {
  const [left, top] = signalPosition(tile);
  const color = colorForScore(tileScore(tile, horizon));
  return <><span className="pointer-events-none absolute z-[1] h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl transition-colors duration-500" style={{ left: `${left}%`, top: `${top}%`, backgroundColor: color, opacity: selected ? 0.58 : 0.24 }} /><button aria-label={`Inspect ${areaName(tile)}`} title={`${areaName(tile)} · ${tileScore(tile, horizon).toFixed(2)}`} onClick={onSelect} className={`absolute z-[3] h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition duration-200 hover:scale-150 focus:outline-none focus:ring-4 focus:ring-white/45 ${selected ? "scale-150 border-white shadow-[0_0_0_6px_rgba(255,255,255,0.32)]" : "border-white/85 shadow-lg"}`} style={{ left: `${left}%`, top: `${top}%`, backgroundColor: color }} /></>;
}

function SelectedArea({ area, horizon, species }: { area: RiskTile; horizon: Horizon; species: SpeciesAlert[] }) {
  return <div className="mt-4 space-y-4"><div><div className="text-[8px] tracking-[0.2em] text-white/28">SELECTED AREA</div><div className="mt-1 break-all text-sm font-black tracking-[0.08em] text-white/80">{areaName(area)}</div></div><RiskGauge score={tileScore(area, horizon)} horizon={horizon} /><div className="grid grid-cols-3 gap-2">{HORIZONS.map((item) => <div key={item} className="rounded-md border border-white/[0.06] bg-white/[0.03] p-2"><div className="text-[7px] tracking-[0.18em] text-white/25">{item}</div><div className="mt-1 text-sm font-black text-white/70">{tileScore(area, item).toFixed(2)}</div></div>)}</div><div className="space-y-2 text-[8px] tracking-[0.12em] text-white/45"><InfoRow label="SOIL MOISTURE" value={area.soil_moisture_source?.toUpperCase() ?? "AWAITING DATA"} /><InfoRow label="WEATHER" value={area.weather_source?.toUpperCase() ?? "AWAITING DATA"} /><InfoRow label="FORECAST" value={riskLabel(tileScore(area, horizon))} /><InfoRow label="UPDATED" value={new Date(area.updated_at).toLocaleTimeString()} /></div><div className="rounded-md border border-emerald-400/16 bg-emerald-400/[0.04] p-3"><div className="text-[8px] tracking-[0.2em] text-emerald-300/70">SPECIES SIGNALS</div><div className="mt-2 space-y-2">{species.length > 0 ? species.map((item) => <div key={`${item.species_name}-${item.tile_id}`} className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /><span className="min-w-0 flex-1 truncate text-[8px] text-white/62">{item.species_name}</span><span className={`rounded border px-1.5 py-0.5 text-[7px] ${item.iucn_status === "CR" || item.iucn_status === "EN" ? "border-red-400/35 text-red-300" : "border-white/10 text-white/35"}`}>{item.iucn_status}</span></div>) : <div className="text-[8px] leading-relaxed text-white/30">No confirmed species observations are attached to this area yet.</div>}</div></div></div>;
}

function EmptyArea({ highest, horizon }: { highest: RiskTile | undefined; horizon: Horizon }) { return <div className="mt-10 space-y-4"><div><div className="text-2xl font-black" style={{ color: highest ? colorForScore(tileScore(highest, horizon)) : "#34d399" }}>{highest ? tileScore(highest, horizon).toFixed(2) : "0.00"}</div><div className="mt-1 text-[8px] tracking-[0.18em] text-white/35">HIGHEST CURRENT FORECAST</div><div className="mt-2 break-words text-[9px] font-mono text-white/55">{highest ? areaName(highest) : "Run prediction to load monitored areas"}</div></div><div className="rounded-md border border-white/[0.07] bg-white/[0.03] p-3"><div className="text-[8px] tracking-[0.18em] text-white/35">INTERACTION</div><div className="mt-2 text-[8px] leading-relaxed text-white/42">Follow the smooth risk surface to the strongest signals, then select a marker to inspect forecast probability, species overlap, and field response context.</div></div></div>; }

function RiskGauge({ score, horizon }: { score: number; horizon: Horizon }) { return <div><div className="flex items-end justify-between"><div><div className="text-[8px] tracking-[0.18em] text-white/28">{horizon} FLOOD PROBABILITY</div><div className="mt-1 text-4xl font-black tracking-[0.08em]" style={{ color: colorForScore(score) }}>{score.toFixed(2)}</div></div><div className="mb-1 text-[9px] tracking-[0.16em]" style={{ color: colorForScore(score) }}>{riskLabel(score)}</div></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(score * 100, 100)}%`, backgroundColor: colorForScore(score) }} /></div></div>; }

function InfoRow({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-3"><span className="text-white/25">{label}</span><span className="min-w-0 truncate text-right text-white/58">{value}</span></div>; }
function MapTokenNotice() { return <div className="absolute inset-0 flex items-center justify-center bg-slate-950 text-center"><div><div className="text-[10px] tracking-[0.25em] text-amber-300">MAPBOX TOKEN MISSING</div><div className="mt-2 text-[9px] tracking-[0.12em] text-white/35">Set NEXT_PUBLIC_MAPBOX_TOKEN in .env.local</div></div></div>; }
function mapImageUrl() { return `https://api.mapbox.com/styles/v1/mapbox/light-v11/static/${DEFAULT_VIEW.longitude},${DEFAULT_VIEW.latitude},${DEFAULT_VIEW.zoom},0/1280x800?access_token=${encodeURIComponent(MAPBOX_TOKEN)}`; }
function signalPosition(tile: RiskTile): [number, number] { const lon = (finiteOr(tile.lon_min, OPERATIONS_BOUNDS[0][0]) + finiteOr(tile.lon_max, OPERATIONS_BOUNDS[1][0])) / 2; const lat = (finiteOr(tile.lat_min, OPERATIONS_BOUNDS[0][1]) + finiteOr(tile.lat_max, OPERATIONS_BOUNDS[1][1])) / 2; return [((lon - OPERATIONS_BOUNDS[0][0]) / (OPERATIONS_BOUNDS[1][0] - OPERATIONS_BOUNDS[0][0])) * 100, (1 - (lat - OPERATIONS_BOUNDS[0][1]) / (OPERATIONS_BOUNDS[1][1] - OPERATIONS_BOUNDS[0][1])) * 100]; }
function finiteOr(value: number, fallback: number): number { return Number.isFinite(value) && value !== 0 ? value : fallback; }
function colorForScore(score: number): string { if (score >= 0.8) return "#ef4444"; if (score >= 0.65) return "#f59e0b"; if (score >= 0.45) return "#eab308"; if (score >= 0.25) return "#10b981"; return "#22c55e"; }
function riskGradientStop(index: number): string { return ["#10b981", "#eab308", "#f59e0b", "#ef4444", "#ef4444"][Math.min(index, 4)]; }
function areaName(tile: RiskTile): string { const match = tile.tile_id.match(/(\d+)$/); const state = tile.region === "West Bengal" ? "WB" : tile.region === "Assam" ? "AS" : "AREA"; return `${state} SIGNAL ${match?.[1] ?? tile.tile_id.replaceAll("_", "-").toUpperCase()}`; }
