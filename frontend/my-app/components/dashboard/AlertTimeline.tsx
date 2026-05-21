"use client";

const ALERTS = [
  {
    time: "06:42",
    severity: "HIGH",
    tile: "T-023",
    msg: "Flood risk 0.91 — Royal Bengal Tiger habitat breached threshold",
    dispatched: true,
  },
  {
    time: "06:42",
    severity: "HIGH",
    tile: "T-024",
    msg: "Ganges River Shark zone — risk 0.84, species displacement likely",
    dispatched: true,
  },
  {
    time: "05:18",
    severity: "MED",
    tile: "T-033",
    msg: "Soil moisture saturation — Fishing Cat den zone at risk",
    dispatched: false,
  },
  {
    time: "04:01",
    severity: "HIGH",
    tile: "T-009",
    msg: "IMD cyclone precursor webhook fired — model rerun triggered",
    dispatched: true,
  },
  {
    time: "02:30",
    severity: "LOW",
    tile: "T-031",
    msg: "Olive Ridley nesting zone flagged — passive monitoring active",
    dispatched: false,
  },
  {
    time: "00:15",
    severity: "LOW",
    tile: "T-044",
    msg: "Routine scan — Estuarine Crocodile population stable",
    dispatched: false,
  },
];

const SEV: Record<string, { color: string; dot: string; badge: string }> = {
  HIGH: { color: "text-red-400",    dot: "bg-red-400",    badge: "bg-red-400/10 text-red-400 border-red-400/20" },
  MED:  { color: "text-amber-400",  dot: "bg-amber-400",  badge: "bg-amber-400/10 text-amber-400 border-amber-400/20" },
  LOW:  { color: "text-blue-400",   dot: "bg-blue-400/60", badge: "bg-blue-400/10 text-blue-400 border-blue-400/20" },
};

export default function AlertTimeline() {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5 backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[10px] font-bold tracking-[0.3em] text-white/50">ALERT TIMELINE</h3>
        <span className="text-[8px] tracking-[0.2em] text-white/25">LAST 12H</span>
      </div>

      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[18px] top-0 bottom-0 w-px bg-white/[0.06]" />

        <div className="space-y-1">
          {ALERTS.map((a, i) => {
            const s = SEV[a.severity];
            return (
              <div key={i} className="flex gap-4 items-start py-2 pl-1">
                {/* Dot on timeline */}
                <div className="relative z-10 mt-1.5 shrink-0">
                  <div className={`w-2.5 h-2.5 rounded-full ${s.dot} ring-2 ring-black`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="text-[7px] tracking-widest text-white/25">{a.time}</span>
                    <span className={`rounded border px-1.5 py-0.5 text-[6px] font-bold tracking-[0.2em] ${s.badge}`}>
                      {a.severity}
                    </span>
                    <span className="text-[7px] tracking-[0.1em] text-white/30">{a.tile}</span>
                    {a.dispatched && (
                      <span className="text-[6px] tracking-[0.1em] text-emerald-400/50">DISPATCHED</span>
                    )}
                  </div>
                  <p className="text-[8px] leading-relaxed tracking-[0.08em] text-white/55">{a.msg}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}