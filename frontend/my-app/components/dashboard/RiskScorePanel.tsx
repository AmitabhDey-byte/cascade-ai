"use client";
import { useRiskData } from "@/hooks/userRiskData";
import { riskLabel } from "@/lib/api";

export default function RiskScorePanel() {
  const { tiles, loading, highRiskCount, triggerPipeline } = useRiskData();

  const avgRisk = tiles.length
    ? tiles.reduce((s, t) => s + t.risk_score, 0) / tiles.length
    : 0;

  const highest = tiles.reduce(
    (max, t) => (t.risk_score > max.risk_score ? t : max),
    tiles[0] ?? { tile_id: "-", risk_score: 0 }
  );

  return (
    <div className="h-full rounded-xl border border-white/[0.07] bg-white/[0.02] p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-bold tracking-[0.3em] text-white/40">RISK OVERVIEW</h3>
        {loading && <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
      </div>

      <div className="rounded-lg border border-white/[0.06] bg-black/20 p-4">
        <div className="text-[8px] tracking-[0.2em] text-white/30 mb-1">AVG FLOOD RISK</div>
        <div className="text-3xl font-black tracking-widest"
          style={{ color: avgRisk >= 0.65 ? "#f87171" : avgRisk >= 0.45 ? "#fbbf24" : "#34d399" }}>
          {avgRisk.toFixed(2)}
        </div>
        <div className="mt-2 h-1 w-full rounded-full bg-white/10">
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${avgRisk * 100}%`, background: avgRisk >= 0.65 ? "#f87171" : avgRisk >= 0.45 ? "#fbbf24" : "#34d399" }} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-red-400/20 bg-red-400/5 p-3">
          <div className="text-[7px] tracking-[0.2em] text-white/30 mb-1">HIGH RISK</div>
          <div className="text-xl font-black text-red-400">{highRiskCount}</div>
          <div className="text-[7px] text-white/20">TILES</div>
        </div>
        <div className="rounded-lg border border-white/[0.06] bg-black/20 p-3">
          <div className="text-[7px] tracking-[0.2em] text-white/30 mb-1">MONITORED</div>
          <div className="text-xl font-black text-white">{tiles.length}</div>
          <div className="text-[7px] text-white/20">TILES</div>
        </div>
      </div>

      {highest && highest.risk_score > 0 && (
        <div className="rounded-lg border border-white/[0.06] bg-black/20 p-3 space-y-2">
          <div className="text-[7px] tracking-[0.2em] text-white/30">HIGHEST RISK TILE</div>
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono text-white/60">{highest.tile_id}</span>
            <span className="text-[9px] font-black" style={{ color: highest.risk_score >= 0.65 ? "#f87171" : "#34d399" }}>
              {highest.risk_score.toFixed(2)} — {riskLabel(highest.risk_score)}
            </span>
          </div>
        </div>
      )}

      <button onClick={() => triggerPipeline()} disabled={loading}
        className="w-full py-2.5 rounded-lg border border-emerald-400/30 bg-emerald-400/10 text-[9px] tracking-[0.25em] text-emerald-400 hover:bg-emerald-400/20 transition disabled:opacity-40 disabled:cursor-not-allowed">
        {loading ? "RUNNING..." : "▶  RUN PIPELINE"}
      </button>
    </div>
  );
}