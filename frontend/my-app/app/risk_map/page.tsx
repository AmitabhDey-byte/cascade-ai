"use client";
import Nav from "@/components/Nav";
import { useState } from "react";

// 10x8 grid of risk tiles (simplified Sundarbans map)
const GRID_W = 10;
const GRID_H = 8;

const RISK_DATA: Record<string, number> = {
  "2-3": 0.91, "2-4": 0.84, "3-3": 0.78, "3-4": 0.82,
  "4-4": 0.75, "4-5": 0.69, "5-3": 0.61, "5-4": 0.73,
  "6-4": 0.55, "6-5": 0.48, "7-5": 0.38, "7-6": 0.29,
  "1-4": 0.65, "1-5": 0.44, "2-5": 0.71, "3-5": 0.66,
  "4-3": 0.52, "5-2": 0.33, "6-3": 0.41, "8-6": 0.19,
};

const SPECIES_IN_TILE: Record<string, string[]> = {
  "2-3": ["Royal Bengal Tiger", "Irrawaddy Dolphin"],
  "2-4": ["Ganges River Shark", "Fishing Cat"],
  "3-3": ["Olive Ridley Turtle"],
  "4-4": ["Estuarine Crocodile"],
};

function riskColor(score: number): string {
  if (score >= 0.8) return "rgba(239,68,68,0.7)";
  if (score >= 0.65) return "rgba(245,158,11,0.7)";
  if (score >= 0.45) return "rgba(234,179,8,0.5)";
  if (score >= 0.25) return "rgba(16,185,129,0.35)";
  return "rgba(16,185,129,0.12)";
}

function riskLabel(score: number): string {
  if (score >= 0.8) return "CRITICAL";
  if (score >= 0.65) return "HIGH";
  if (score >= 0.45) return "MODERATE";
  if (score >= 0.25) return "LOW";
  return "MINIMAL";
}

const HORIZONS = ["24H", "48H", "72H"];

export default function RiskMap() {
  const [selected, setSelected] = useState<string | null>(null);
  const [horizon, setHorizon] = useState("24H");

  const selectedRisk = selected ? (RISK_DATA[selected] ?? 0.05) : null;
  const selectedSpecies = selected ? (SPECIES_IN_TILE[selected] ?? []) : [];

  return (
    <div className="min-h-screen bg-black font-['Orbitron'] text-white">
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(0,255,140,0.02) 1px, transparent 1px),linear-gradient(90deg, rgba(0,255,140,0.02) 1px, transparent 1px)`,
          backgroundSize: "50px 50px",
        }}
      />
      <Nav />

      <main className="relative mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-black tracking-[0.2em]">FLOOD RISK MAP</h2>
            <p className="mt-1 text-[9px] tracking-[0.25em] text-white/30">LSTM MODEL · 5KM × 5KM GRID CELLS</p>
          </div>
          {/* Horizon selector */}
          <div className="flex rounded-lg border border-white/[0.08] overflow-hidden">
            {HORIZONS.map((h) => (
              <button
                key={h}
                onClick={() => setHorizon(h)}
                className={`px-4 py-2 text-[9px] tracking-[0.2em] transition ${
                  horizon === h
                    ? "bg-emerald-400/15 text-emerald-400"
                    : "text-white/30 hover:text-white/60"
                }`}
              >
                {h}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Map */}
          <div className="lg:col-span-2 rounded-xl border border-white/[0.07] bg-white/[0.02] p-6 backdrop-blur-sm">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-[9px] tracking-[0.25em] text-white/40">SUNDARBANS DELTA BASIN</span>
              <span className="text-[8px] tracking-[0.2em] text-emerald-400/60">FORECAST: {horizon}</span>
            </div>

            {/* SVG grid map */}
            <svg
              viewBox={`0 0 ${GRID_W * 52} ${GRID_H * 52}`}
              className="w-full rounded-lg"
              style={{ background: "rgba(0,20,10,0.5)" }}
            >
              {Array.from({ length: GRID_H }, (_, row) =>
                Array.from({ length: GRID_W }, (_, col) => {
                  const key = `${col}-${row}`;
                  const score = RISK_DATA[key] ?? 0;
                  const isSelected = selected === key;

                  return (
                    <g key={key} onClick={() => setSelected(isSelected ? null : key)} style={{ cursor: "pointer" }}>
                      <rect
                        x={col * 52 + 2}
                        y={row * 52 + 2}
                        width={48}
                        height={48}
                        rx={4}
                        fill={score > 0 ? riskColor(score) : "rgba(255,255,255,0.02)"}
                        stroke={isSelected ? "rgba(0,255,140,0.8)" : "rgba(255,255,255,0.04)"}
                        strokeWidth={isSelected ? 2 : 1}
                      />
                      {score > 0 && (
                        <text
                          x={col * 52 + 26}
                          y={row * 52 + 30}
                          textAnchor="middle"
                          fill="rgba(255,255,255,0.8)"
                          fontSize="9"
                          fontFamily="'Orbitron', monospace"
                          fontWeight="bold"
                        >
                          {score.toFixed(2)}
                        </text>
                      )}
                      {SPECIES_IN_TILE[key] && (
                        <circle
                          cx={col * 52 + 44}
                          cy={row * 52 + 10}
                          r={4}
                          fill="rgba(0,255,140,0.9)"
                        />
                      )}
                    </g>
                  );
                })
              )}
            </svg>

            {/* Legend */}
            <div className="mt-4 flex gap-4 flex-wrap">
              {[
                { label: "CRITICAL ≥0.8", color: "bg-red-400/70" },
                { label: "HIGH ≥0.65", color: "bg-amber-500/70" },
                { label: "MODERATE ≥0.45", color: "bg-yellow-500/50" },
                { label: "LOW", color: "bg-emerald-400/35" },
                { label: "SPECIES PRESENT", dot: true },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-2">
                  {l.dot ? (
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  ) : (
                    <div className={`w-3 h-3 rounded-sm ${l.color}`} />
                  )}
                  <span className="text-[7px] tracking-[0.15em] text-white/30">{l.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tile detail panel */}
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-6 backdrop-blur-sm">
            <h3 className="mb-4 text-[10px] font-bold tracking-[0.3em] text-white/50">TILE DETAIL</h3>

            {selected && selectedRisk !== null ? (
              <div>
                <div className="mb-4 rounded-lg border border-white/[0.07] bg-white/[0.03] p-4">
                  <div className="text-[8px] tracking-[0.2em] text-white/30 mb-1">TILE ID</div>
                  <div className="text-base font-black tracking-widest">T-{selected.replace("-", "")}</div>
                </div>

                <div className="mb-4 rounded-lg border border-white/[0.07] bg-white/[0.03] p-4">
                  <div className="text-[8px] tracking-[0.2em] text-white/30 mb-1">FLOOD RISK SCORE</div>
                  <div
                    className={`text-3xl font-black tracking-widest ${
                      selectedRisk >= 0.8 ? "text-red-400" : selectedRisk >= 0.65 ? "text-amber-400" : "text-emerald-400"
                    }`}
                  >
                    {selectedRisk.toFixed(2)}
                  </div>
                  <div className={`mt-1 text-[8px] tracking-[0.2em] ${selectedRisk >= 0.8 ? "text-red-400/60" : "text-white/30"}`}>
                    {riskLabel(selectedRisk)}
                  </div>
                  {/* Risk bar */}
                  <div className="mt-3 h-1 w-full rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${selectedRisk * 100}%`,
                        background: selectedRisk >= 0.8 ? "rgb(239,68,68)" : selectedRisk >= 0.65 ? "rgb(245,158,11)" : "rgb(52,211,153)",
                      }}
                    />
                  </div>
                </div>

                {selectedSpecies.length > 0 && (
                  <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/5 p-4">
                    <div className="text-[8px] tracking-[0.2em] text-emerald-400/60 mb-3">SPECIES AT RISK</div>
                    {selectedSpecies.map((sp) => (
                      <div key={sp} className="flex items-center gap-2 mb-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                        <div className="text-[9px] tracking-[0.1em] text-white/70">{sp}</div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-[8px] tracking-[0.15em]">
                    <span className="text-white/30">SOIL MOISTURE</span>
                    <span className="text-white/60">0.43 m³/m³</span>
                  </div>
                  <div className="flex justify-between text-[8px] tracking-[0.15em]">
                    <span className="text-white/30">PRECIPITATION</span>
                    <span className="text-white/60">187mm / 72H</span>
                  </div>
                  <div className="flex justify-between text-[8px] tracking-[0.15em]">
                    <span className="text-white/30">ELEVATION</span>
                    <span className="text-white/60">2.1m ASL</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-48 items-center justify-center">
                <div className="text-center">
                  <div className="text-[9px] tracking-[0.2em] text-white/25">SELECT A TILE</div>
                  <div className="mt-2 text-[7px] tracking-[0.15em] text-white/15">CLICK ANY CELL TO INSPECT</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}