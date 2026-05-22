"use client";
import { useRiskData } from "@/hooks/userRiskData";
import { riskLabel } from "@/lib/api";

export default function AlertTimeline() {
  const { tiles, loading } = useRiskData();
  const highRisk = tiles.filter(t => t.is_high_risk);

  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[10px] font-bold tracking-[0.3em] text-white/40">ALERT TIMELINE</h3>
        <span className="text-[8px] tracking-[0.2em] text-white/20">{highRisk.length} ACTIVE</span>
      </div>

      {loading ? (
        <div className="flex gap-3">
          {[1,2,3].map(i => <div key={i} className="h-16 flex-1 rounded-lg bg-white/[0.03] animate-pulse" />)}
        </div>
      ) : highRisk.length === 0 ? (
        <div className="text-center py-6">
          <div className="text-[9px] tracking-[0.2em] text-white/20">NO ACTIVE ALERTS</div>
          <div className="text-[7px] text-white/10 mt-1">All monitored areas within safe thresholds</div>
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {highRisk.map(tile => (
            <div key={tile.tile_id}
              className="shrink-0 rounded-lg border border-red-400/20 bg-red-400/5 p-3 min-w-[180px]">
              <div className="flex items-center justify-between mb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                <span className="text-[7px] tracking-widest text-red-400/60">{riskLabel(tile.risk_score)}</span>
              </div>
              <div className="text-[8px] font-mono text-white/50 mb-1">{tile.tile_id}</div>
              <div className="text-lg font-black text-red-400">{tile.risk_score.toFixed(2)}</div>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-[7px]">
                  <span className="text-white/20">24H</span>
                  <span className="text-white/40">{(tile.flood_probability_24h * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between text-[7px]">
                  <span className="text-white/20">72H</span>
                  <span className="text-white/40">{(tile.flood_probability_72h * 100).toFixed(0)}%</span>
                </div>
              </div>
              <div className="mt-2 text-[6px] text-white/15">
                {new Date(tile.updated_at).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
