"use client";

import Nav from "@/components/Nav";
import RiskMap from "@/components/maps/RiskMap";

export default function RiskMapPage() {
  return (
    <div className="min-h-screen bg-transparent font-['Orbitron'] text-white">
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,255,140,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,140,0.018) 1px, transparent 1px)",
          backgroundSize: "50px 50px",
        }}
      />
      <Nav />

      <main className="relative mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-lg font-black tracking-[0.2em]">FLOOD RISK MAP</h2>
            <p className="mt-1 text-[9px] tracking-[0.25em] text-white/30">NASA SMAP · OPEN-METEO · LOCAL ML FORECAST</p>
          </div>
          <div className="text-[8px] tracking-[0.2em] text-white/25">MAPBOX SATELLITE VIEW</div>
        </div>

        <RiskMap />
      </main>
    </div>
  );
}
