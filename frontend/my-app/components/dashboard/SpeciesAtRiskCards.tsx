"use client";
import { useHighRiskSpecies } from "@/hooks/userSpeciesData";
import { iucnColor } from "@/lib/api";

export default function SpeciesAtRiskCards() {
  const { species, loading, priorityCount } = useHighRiskSpecies();

  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[10px] font-bold tracking-[0.3em] text-white/40">SPECIES AT RISK</h3>
        {priorityCount > 0 && (
          <span className="text-[8px] tracking-[0.2em] text-red-400 border border-red-400/20 bg-red-400/10 px-2 py-0.5 rounded-full">
            {priorityCount} PRIORITY
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-14 rounded-lg bg-white/[0.03] animate-pulse" />)}
        </div>
      ) : species.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-32 text-center">
          <div className="text-[9px] tracking-[0.2em] text-white/20">NO SPECIES DATA</div>
          <div className="text-[7px] tracking-[0.15em] text-white/10 mt-1">Run pipeline to detect species</div>
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {species.map((s, i) => (
            <div key={i} className={`flex items-center justify-between rounded-lg border p-3 ${s.is_priority ? "border-red-400/20 bg-red-400/5" : "border-white/[0.05] bg-black/20"}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {s.is_priority && <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0 animate-pulse" />}
                  <div className="text-[9px] font-bold tracking-[0.1em] text-white/80 truncate">{s.species_name}</div>
                </div>
                <div className="text-[7px] italic text-white/30 mt-0.5">{s.scientific_name}</div>
                <div className="text-[7px] text-white/20 mt-0.5">Tile: {s.tile_id} · Confidence: {(s.confidence_score * 100).toFixed(0)}%</div>
              </div>
              <div className={`ml-3 shrink-0 text-[7px] font-bold tracking-widest px-2 py-1 rounded border ${iucnColor(s.iucn_status)}`}>
                {s.iucn_status}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}