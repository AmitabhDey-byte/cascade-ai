"use client";

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

export default function SpeciesAtRiskCards() {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5 backdrop-blur-sm h-full">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[10px] font-bold tracking-[0.3em] text-white/50">SPECIES AT RISK</h3>
        <span className="text-[8px] tracking-[0.2em] text-white/25">BIOCLIP · IUCN</span>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {SPECIES.map((sp) => (
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
          {SPECIES.length} SPECIES CONFIRMED · 6 MONTH OBSERVATION WINDOW
        </span>
      </div>
    </div>
  );
}