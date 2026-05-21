"use client";

const TILES = [
  { id: "T-023", score: 0.91, label: "CRITICAL", color: "text-red-400", bar: "bg-red-400", border: "border-red-400/20", bg: "bg-red-400/5" },
  { id: "T-024", score: 0.84, label: "CRITICAL", color: "text-red-400", bar: "bg-red-400", border: "border-red-400/20", bg: "bg-red-400/5" },
  { id: "T-033", score: 0.75, label: "HIGH",     color: "text-amber-400", bar: "bg-amber-400", border: "border-amber-400/20", bg: "bg-amber-400/5" },
  { id: "T-044", score: 0.61, label: "HIGH",     color: "text-amber-400", bar: "bg-amber-400", border: "border-amber-400/20", bg: "bg-amber-400/5" },
  { id: "T-017", score: 0.48, label: "MODERATE", color: "text-yellow-400", bar: "bg-yellow-400", border: "border-yellow-400/20", bg: "bg-yellow-400/5" },
  { id: "T-031", score: 0.29, label: "LOW",      color: "text-emerald-400", bar: "bg-emerald-400", border: "border-emerald-400/20", bg: "bg-emerald-400/5" },
];

export default function RiskScorePanel() {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5 backdrop-blur-sm h-full">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[10px] font-bold tracking-[0.3em] text-white/50">RISK SCORES</h3>
        <span className="text-[8px] tracking-[0.2em] text-white/25">PER TILE · 24H</span>
      </div>

      <div className="space-y-2.5">
        {TILES.map((tile) => (
          <div key={tile.id} className={`rounded-lg border ${tile.border} ${tile.bg} px-4 py-3`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-bold tracking-[0.2em] text-white/70">{tile.id}</span>
              <div className="flex items-center gap-2">
                <span className={`text-[7px] tracking-[0.2em] ${tile.color}`}>{tile.label}</span>
                <span className={`text-sm font-black tracking-widest ${tile.color}`}>{tile.score.toFixed(2)}</span>
              </div>
            </div>
            <div className="h-0.5 w-full rounded-full bg-white/5">
              <div
                className={`h-full rounded-full ${tile.bar} transition-all`}
                style={{ width: `${tile.score * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2 border-t border-white/[0.05] pt-4">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-[7px] tracking-[0.2em] text-white/25">LSTM MODEL · LAST RUN 06:42 UTC</span>
      </div>
    </div>
  );
}