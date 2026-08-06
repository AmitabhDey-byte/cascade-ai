"use client";

import { useEffect, useMemo, useState } from "react";
import Nav from "@/components/Nav";
import { getHighRiskSpecies, getRiskTiles } from "@/lib/api";
import type { IUCNStatus, SpeciesAlert } from "@/types";

const FILTERS: Array<"ALL" | IUCNStatus> = ["ALL", "CR", "EN", "VU", "NT", "LC", "DD"];

type SpeciesView = SpeciesAlert & {
  riskScore: number;
};

export default function SpeciesPage() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("ALL");
  const [species, setSpecies] = useState<SpeciesView[]>([]);
  const [selected, setSelected] = useState<SpeciesView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.all([getHighRiskSpecies(), getRiskTiles()])
      .then(([alerts, tiles]) => {
        if (!active) return;
        const riskByTile = new Map(tiles.map((tile) => [tile.tile_id, tile.risk_score]));
        setSpecies(alerts.map((alert) => ({ ...alert, riskScore: riskByTile.get(alert.tile_id) ?? 0 })));
      })
      .catch(() => {
        if (active) setError("Species intelligence could not be loaded. Check the API connection and refresh the page.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(
    () => (filter === "ALL" ? species : species.filter((item) => item.iucn_status === filter)),
    [filter, species],
  );

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

      <main className="relative mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-black tracking-[0.2em]">SPECIES MONITOR</h2>
            <p className="mt-1 text-[9px] tracking-[0.25em] text-white/30">HIGH-RISK FORECAST OVERLAP</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((value) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`rounded-lg border px-3 py-1.5 text-[8px] tracking-[0.2em] transition ${
                  filter === value ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-400" : "border-white/10 text-white/30 hover:text-white/60"
                }`}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="CRITICALLY ENDANGERED" value={species.filter((item) => item.iucn_status === "CR").length} color="text-red-500" />
          <Stat label="ENDANGERED" value={species.filter((item) => item.iucn_status === "EN").length} color="text-red-400" />
          <Stat label="VULNERABLE" value={species.filter((item) => item.iucn_status === "VU").length} color="text-amber-400" />
          <Stat label="HIGH-RISK OBSERVATIONS" value={species.length} color="text-emerald-400" />
        </div>

        {loading ? (
          <div className="glass-panel rounded-xl p-8 text-center text-[9px] tracking-[0.2em] text-white/30">LOADING SPECIES INTELLIGENCE</div>
        ) : error ? (
          <div className="rounded-xl border border-red-400/20 bg-red-400/5 p-6 text-center text-[9px] leading-relaxed tracking-[0.1em] text-red-200">{error}</div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-3 lg:col-span-2">
              {filtered.length ? filtered.map((item) => (
                <SpeciesCard key={`${item.tile_id}-${item.species_name}`} species={item} selected={selected?.species_name === item.species_name} onSelect={() => setSelected((current) => current?.species_name === item.species_name ? null : item)} />
              )) : (
                <div className="glass-panel rounded-xl p-8 text-center text-[9px] tracking-[0.18em] text-white/30">NO OBSERVATIONS FOR THIS STATUS</div>
              )}
            </div>
            <SpeciesDetails species={selected} />
          </div>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return <div className="glass-panel rounded-xl p-4"><div className={`text-xl font-black tracking-widest ${color}`}>{value}</div><div className="mt-1 text-[7px] tracking-[0.15em] text-white/30">{label}</div></div>;
}

function SpeciesCard({ species, selected, onSelect }: { species: SpeciesView; selected: boolean; onSelect: () => void }) {
  const style = speciesStyle(species.iucn_status);
  return (
    <button onClick={onSelect} className={`w-full rounded-xl border p-5 text-left transition ${selected ? `${style.border} ${style.bg}` : "border-white/[0.12] bg-white/[0.06] hover:border-white/[0.18]"}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-3"><span className={`text-[7px] font-black tracking-[0.2em] ${style.color}`}>[{species.iucn_status}]</span><span className="truncate text-xs font-bold tracking-[0.15em] text-white">{species.species_name}</span></div>
          <div className="mb-3 text-[8px] tracking-[0.1em] text-white/30 italic">{species.scientific_name}</div>
          <div className="flex flex-wrap gap-3 text-[8px] tracking-[0.12em] text-white/40"><span>AREA {species.tile_id}</span><span>OBSERVED {formatDate(species.observation_date)}</span></div>
        </div>
        <div className="shrink-0 text-right"><div className={`text-lg font-black tracking-widest ${style.color}`}>{species.riskScore.toFixed(2)}</div><div className="text-[7px] tracking-[0.15em] text-white/25">RISK</div><div className="mt-2 text-[7px] tracking-[0.15em] text-emerald-400/60">{(species.confidence_score * 100).toFixed(0)}% CONF.</div></div>
      </div>
      <div className="mt-4 h-0.5 w-full rounded-full bg-white/5"><div className="h-full rounded-full" style={{ width: `${Math.min(species.riskScore * 100, 100)}%`, background: riskColor(species.riskScore) }} /></div>
    </button>
  );
}

function SpeciesDetails({ species }: { species: SpeciesView | null }) {
  if (!species) return <aside className="glass-panel flex h-48 items-center justify-center rounded-xl p-6 text-center text-[9px] tracking-[0.2em] text-white/20">SELECT A SPECIES TO VIEW ITS FIELD CONTEXT</aside>;
  const style = speciesStyle(species.iucn_status);
  return <aside className="glass-panel rounded-xl p-6"><h3 className="mb-4 text-[10px] font-bold tracking-[0.3em] text-white/40">SPECIES DETAIL</h3><div className={`mb-4 inline-block rounded-lg border px-3 py-1.5 text-[8px] font-black tracking-[0.2em] ${style.border} ${style.bg} ${style.color}`}>{statusLabel(species.iucn_status)}</div><h4 className="mb-1 text-base font-black tracking-[0.1em]">{species.species_name}</h4><p className="mb-5 text-[8px] italic tracking-[0.1em] text-white/30">{species.scientific_name}</p><div className="space-y-3 text-[9px] tracking-[0.1em] text-white/70"><Detail label="AREA" value={species.tile_id} /><Detail label="OBSERVATION CONFIDENCE" value={`${(species.confidence_score * 100).toFixed(0)}%`} /><Detail label="FLOOD RISK SCORE" value={species.riskScore.toFixed(2)} /><Detail label="LAST OBSERVED" value={formatDate(species.observation_date)} /></div></aside>;
}

function Detail({ label, value }: { label: string; value: string }) { return <div className="border-b border-white/[0.05] pb-2"><div className="mb-0.5 text-[7px] tracking-[0.2em] text-white/25">{label}</div><div>{value}</div></div>; }
function speciesStyle(status: IUCNStatus) { if (status === "CR") return { color: "text-red-500", border: "border-red-500/20", bg: "bg-red-500/5" }; if (status === "EN") return { color: "text-red-400", border: "border-red-400/20", bg: "bg-red-400/5" }; if (status === "VU") return { color: "text-amber-400", border: "border-amber-400/20", bg: "bg-amber-400/5" }; return { color: "text-emerald-400", border: "border-emerald-400/20", bg: "bg-emerald-400/5" }; }
function statusLabel(status: IUCNStatus) { return ({ CR: "CRITICALLY ENDANGERED", EN: "ENDANGERED", VU: "VULNERABLE", NT: "NEAR THREATENED", LC: "LEAST CONCERN", DD: "DATA DEFICIENT" })[status]; }
function riskColor(score: number) { return score >= 0.8 ? "rgb(239,68,68)" : score >= 0.65 ? "rgb(245,158,11)" : "rgb(52,211,153)"; }
function formatDate(value: string | null) { return value ? new Date(value).toLocaleDateString() : "Unknown"; }
