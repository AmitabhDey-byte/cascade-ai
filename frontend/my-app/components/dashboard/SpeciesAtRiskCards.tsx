"use client";
import { getSpeciesForTile, SpeciesObservation } from "@/lib/api";
import { useEffect, useState } from "react";

const SPECIES = [
  {
    name: "Royal Bengal Tiger",
    latin: "Panthera tigris tigris",
    status: "EN",
    statusLabel: "ENDANGERED",
    tile: "T-023",
    confidence: 0.97,
    color: "text-red-400",
    border: "border-red-400/20",
    bg: "bg-red-400/5",
  },
  {
    name: "Ganges River Shark",
    latin: "Glyphis gangeticus",
    status: "CR",
    statusLabel: "CRITICALLY ENDANGERED",
    tile: "T-024",
    confidence: 0.89,
    color: "text-red-500",
    border: "border-red-500/25",
    bg: "bg-red-500/5",
  },
  {
    name: "Irrawaddy Dolphin",
    latin: "Orcaella brevirostris",
    status: "EN",
    statusLabel: "ENDANGERED",
    tile: "T-023",
    confidence: 0.94,
    color: "text-red-400",
    border: "border-red-400/20",
    bg: "bg-red-400/5",
  },
  {
    name: "Fishing Cat",
    latin: "Prionailurus viverrinus",
    status: "VU",
    statusLabel: "VULNERABLE",
    tile: "T-024",
    confidence: 0.91,
    color: "text-amber-400",
    border: "border-amber-400/20",
    bg: "bg-amber-400/5",
  },
];

const TILES_TO_LOAD = ["T-023", "T-024", "T-033", "T-044"];

function speciesStyle(status: string) {
  if (status === "CR") return { color: "text-red-500", border: "border-red-500/25", bg: "bg-red-500/5", statusLabel: "CRITICALLY ENDANGERED" };
  if (status === "EN") return { color: "text-red-400", border: "border-red-400/20", bg: "bg-red-400/5", statusLabel: "ENDANGERED" };
  if (status === "VU") return { color: "text-amber-400", border: "border-amber-400/20", bg: "bg-amber-400/5", statusLabel: "VULNERABLE" };
  return { color: "text-emerald-400", border: "border-emerald-400/20", bg: "bg-emerald-400/5", statusLabel: "MONITORED" };
}

export default function SpeciesAtRiskCards() {
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
          confidence: sp.bioclip_confidence,
          ...speciesStyle(sp.iucn_status),
        }))
        .slice(0, 4);
      if (nextSpecies.length > 0) setSpecies(nextSpecies);
    });
  }, []);

  return (
    <div className="glass-panel rounded-xl p-5 h-full">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[10px] font-bold tracking-[0.3em] text-white/50">SPECIES AT RISK</h3>
        <span className="text-[8px] tracking-[0.2em] text-white/25">BIOCLIP · IUCN</span>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {species.map((sp) => (
          <div key={sp.name} className={`rounded-lg border ${sp.border} ${sp.bg} p-3`}>
            <div className="flex items-start justify-between gap-2 mb-1">
              <span className={`text-[7px] font-black tracking-[0.2em] ${sp.color}`}>[{sp.status}]</span>
              <span className="text-[7px] tracking-[0.1em] text-white/25">{sp.tile}</span>
            </div>
            <div className="text-[9px] font-bold tracking-[0.1em] text-white/80 mb-0.5">{sp.name}</div>
            <div className="text-[7px] italic tracking-[0.08em] text-white/30 mb-2">{sp.latin}</div>
            <div className="flex items-center justify-between">
              <span className={`text-[7px] tracking-[0.1em] ${sp.color} opacity-70`}>{sp.statusLabel}</span>
              <span className="text-[7px] tracking-[0.1em] text-emerald-400/50">{(sp.confidence * 100).toFixed(0)}%</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 text-center">
        <span className="text-[7px] tracking-[0.15em] text-white/20">
          {species.length} SPECIES CONFIRMED · 6 MONTH OBSERVATION WINDOW
        </span>
      </div>
    </div>
  );
}
