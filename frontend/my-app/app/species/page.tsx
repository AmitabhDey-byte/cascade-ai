"use client";
import { getSpeciesForTile, SpeciesObservation } from "@/lib/api";
import Nav from "@/components/Nav";
import { useEffect, useState } from "react";

const SPECIES = [
  {
    name: "Royal Bengal Tiger",
    latin: "Panthera tigris tigris",
    status: "EN",
    statusLabel: "ENDANGERED",
    tile: "T-23",
    riskScore: 0.91,
    confidence: 0.97,
    observations: 12,
    lastSeen: "2H AGO",
    threat: "Flood displacement + habitat fragmentation",
    color: "text-red-400",
    border: "border-red-400/20",
    bg: "bg-red-400/5",
  },
  {
    name: "Ganges River Shark",
    latin: "Glyphis gangeticus",
    status: "CR",
    statusLabel: "CRITICALLY ENDANGERED",
    tile: "T-24",
    riskScore: 0.84,
    confidence: 0.89,
    observations: 3,
    lastSeen: "6H AGO",
    threat: "Salinity disruption from storm surge",
    color: "text-red-500",
    border: "border-red-500/20",
    bg: "bg-red-500/5",
  },
  {
    name: "Irrawaddy Dolphin",
    latin: "Orcaella brevirostris",
    status: "EN",
    statusLabel: "ENDANGERED",
    tile: "T-23",
    riskScore: 0.84,
    confidence: 0.94,
    observations: 7,
    lastSeen: "4H AGO",
    threat: "Channel disruption + debris ingestion",
    color: "text-red-400",
    border: "border-red-400/20",
    bg: "bg-red-400/5",
  },
  {
    name: "Fishing Cat",
    latin: "Prionailurus viverrinus",
    status: "VU",
    statusLabel: "VULNERABLE",
    tile: "T-24",
    riskScore: 0.75,
    confidence: 0.91,
    observations: 18,
    lastSeen: "1H AGO",
    threat: "Den flooding, prey displacement",
    color: "text-amber-400",
    border: "border-amber-400/20",
    bg: "bg-amber-400/5",
  },
  {
    name: "Olive Ridley Turtle",
    latin: "Lepidochelys olivacea",
    status: "VU",
    statusLabel: "VULNERABLE",
    tile: "T-33",
    riskScore: 0.61,
    confidence: 0.96,
    observations: 24,
    lastSeen: "3H AGO",
    threat: "Nesting site inundation",
    color: "text-amber-400",
    border: "border-amber-400/20",
    bg: "bg-amber-400/5",
  },
  {
    name: "Estuarine Crocodile",
    latin: "Crocodylus porosus",
    status: "LC",
    statusLabel: "LEAST CONCERN",
    tile: "T-44",
    riskScore: 0.48,
    confidence: 0.98,
    observations: 31,
    lastSeen: "30M AGO",
    threat: "Nest displacement",
    color: "text-emerald-400",
    border: "border-emerald-400/20",
    bg: "bg-emerald-400/5",
  },
];

const FILTERS = ["ALL", "CR", "EN", "VU", "LC"];
const TILES_TO_LOAD = ["T-023", "T-024", "T-033", "T-044"];

function speciesStyle(status: string) {
  if (status === "CR") return { color: "text-red-500", border: "border-red-500/20", bg: "bg-red-500/5", statusLabel: "CRITICALLY ENDANGERED" };
  if (status === "EN") return { color: "text-red-400", border: "border-red-400/20", bg: "bg-red-400/5", statusLabel: "ENDANGERED" };
  if (status === "VU") return { color: "text-amber-400", border: "border-amber-400/20", bg: "bg-amber-400/5", statusLabel: "VULNERABLE" };
  return { color: "text-emerald-400", border: "border-emerald-400/20", bg: "bg-emerald-400/5", statusLabel: "LEAST CONCERN" };
}

export default function Species() {
  const [filter, setFilter] = useState("ALL");
  const [selected, setSelected] = useState<typeof SPECIES[0] | null>(null);
  const [species, setSpecies] = useState(SPECIES);

  useEffect(() => {
    Promise.allSettled(TILES_TO_LOAD.map((tileId) => getSpeciesForTile(tileId))).then((results) => {
      const nextSpecies = results
        .flatMap((result) => (result.status === "fulfilled" ? result.value.species : []))
        .map((sp: SpeciesObservation) => ({
          name: sp.name,
          latin: sp.latin,
          status: sp.iucn_status,
          tile: sp.tile_id,
          riskScore: sp.flood_risk_score,
          confidence: sp.bioclip_confidence,
          observations: 1,
          lastSeen: "LIVE",
          threat: sp.primary_threat ?? "Flood displacement",
          ...speciesStyle(sp.iucn_status),
        }));
      if (nextSpecies.length > 0) setSpecies(nextSpecies);
    });
  }, []);

  const filtered = filter === "ALL" ? species : species.filter((s) => s.status === filter);

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
        <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-lg font-black tracking-[0.2em]">SPECIES MONITOR</h2>
            <p className="mt-1 text-[9px] tracking-[0.25em] text-white/30">BIOCLIP · IUCN RED LIST · GBIF</p>
          </div>

          <div className="flex gap-2">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-lg px-3 py-1.5 text-[8px] tracking-[0.2em] transition ${
                  filter === f
                    ? "bg-emerald-400/15 border border-emerald-400/40 text-emerald-400"
                    : "border border-white/10 text-white/30 hover:text-white/60"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Stats bar */}
        <div className="mb-6 grid grid-cols-4 gap-3">
          {[
            { label: "CRITICALLY ENDANGERED", value: 1, color: "text-red-500" },
            { label: "ENDANGERED", value: 2, color: "text-red-400" },
            { label: "VULNERABLE", value: 2, color: "text-amber-400" },
            { label: "CONFIRMED VIA BIOCLIP", value: 6, color: "text-emerald-400" },
          ].map((s) => (
            <div key={s.label} className="glass-panel rounded-xl p-4">
              <div className={`text-xl font-black tracking-widest ${s.color}`}>{s.value}</div>
              <div className="mt-1 text-[7px] tracking-[0.15em] text-white/30">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Species list */}
          <div className="lg:col-span-2 space-y-3">
            {filtered.map((sp) => (
              <div
                key={sp.name}
                onClick={() => setSelected(selected?.name === sp.name ? null : sp)}
                className={`cursor-pointer rounded-xl border p-5 transition ${
                  selected?.name === sp.name
                    ? `${sp.border} ${sp.bg}`
                    : "border-white/[0.12] bg-white/[0.06] backdrop-blur-xl hover:border-white/[0.18]"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className={`text-[7px] font-black tracking-[0.2em] ${sp.color}`}>
                        [{sp.status}]
                      </span>
                      <span className="text-xs font-bold tracking-[0.15em] text-white">{sp.name}</span>
                    </div>
                    <div className="text-[8px] tracking-[0.1em] text-white/30 italic mb-3">{sp.latin}</div>
                    <div className="flex flex-wrap gap-3">
                      <span className="text-[8px] tracking-[0.15em] text-white/40">TILE {sp.tile}</span>
                      <span className="text-[8px] tracking-[0.15em] text-white/40">{sp.observations} OBS.</span>
                      <span className="text-[8px] tracking-[0.15em] text-white/40">LAST: {sp.lastSeen}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className={`text-lg font-black tracking-widest ${sp.color}`}>
                      {sp.riskScore.toFixed(2)}
                    </div>
                    <div className="text-[7px] tracking-[0.15em] text-white/25 mt-0.5">RISK</div>
                    <div className="text-[7px] tracking-[0.15em] text-emerald-400/50 mt-2">
                      {(sp.confidence * 100).toFixed(0)}% CONF.
                    </div>
                  </div>
                </div>

                {/* Risk bar */}
                <div className="mt-4 h-0.5 w-full rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${sp.riskScore * 100}%`,
                      background: sp.riskScore >= 0.8 ? "rgb(239,68,68)" : sp.riskScore >= 0.65 ? "rgb(245,158,11)" : "rgb(52,211,153)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Detail panel */}
          <div className="glass-panel rounded-xl p-6">
            <h3 className="mb-4 text-[10px] font-bold tracking-[0.3em] text-white/40">SPECIES DETAIL</h3>

            {selected ? (
              <div>
                <div className={`mb-4 inline-block rounded-lg px-3 py-1.5 text-[8px] font-black tracking-[0.2em] border ${selected.border} ${selected.bg} ${selected.color}`}>
                  {selected.statusLabel}
                </div>

                <h4 className="text-base font-black tracking-[0.1em] text-white mb-1">{selected.name}</h4>
                <p className="text-[8px] italic tracking-[0.1em] text-white/30 mb-5">{selected.latin}</p>

                <div className="space-y-3 mb-5">
                  {[
                    { label: "PRIMARY THREAT", value: selected.threat },
                    { label: "TILE", value: selected.tile },
                    { label: "OBSERVATIONS", value: `${selected.observations} (6 MO)` },
                    { label: "BIOCLIP CONFIDENCE", value: `${(selected.confidence * 100).toFixed(0)}%` },
                    { label: "FLOOD RISK SCORE", value: selected.riskScore.toFixed(2) },
                    { label: "LAST OBSERVED", value: selected.lastSeen },
                  ].map((row) => (
                    <div key={row.label} className="border-b border-white/[0.05] pb-2">
                      <div className="text-[7px] tracking-[0.2em] text-white/25 mb-0.5">{row.label}</div>
                      <div className="text-[9px] tracking-[0.1em] text-white/70">{row.value}</div>
                    </div>
                  ))}
                </div>

                <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/5 p-4">
                  <div className="text-[7px] tracking-[0.25em] text-emerald-400/60 mb-2">RANGER ACTION</div>
                  <p className="text-[8px] leading-relaxed tracking-[0.1em] text-white/60">
                    Deploy monitoring team to {selected.tile}. Establish temporary shelter and evacuation corridors. Report sightings via Telegram within 30 min.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex h-48 items-center justify-center">
                <div className="text-center">
                  <div className="text-[9px] tracking-[0.2em] text-white/20">SELECT A SPECIES</div>
                  <div className="mt-2 text-[7px] tracking-[0.1em] text-white/10">TO VIEW FULL PROFILE</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
