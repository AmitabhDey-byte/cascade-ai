"use client";
import { useRiskData } from "@/hooks/userRiskData";
import { useSpeciesData } from "@/hooks/userSpeciesData";
import { riskColor, riskLabel, tileScore } from "@/lib/api";
import type { Horizon } from "@/types";
import { useState } from "react";

const GRID_W = 10;
const GRID_H = 8;

// Maps tile_id from API → grid position
// Adjust these if your tile IDs change
const TILE_GRID: Record<string, [number, number]> = {
  "sundarbans_tile_01": [2, 3],
  "sundarbans_tile_02": [3, 3],
  "sundarbans_tile_03": [4, 3],
  "sundarbans_tile_04": [2, 4],
  "sundarbans_tile_05": [3, 4],
  "sundarbans_tile_06": [4, 4],
};

const HORIZONS: Horizon[] = ["24H", "48H", "72H"];

export default function RiskMap() {
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [horizon, setHorizon] = useState<Horizon>("24H");

  const { tiles, loading } = useRiskData();
  const { species } = useSpeciesData(selectedTileId);

  // Build a lookup: "col-row" → tile
  const tileByGrid: Record<string, (typeof tiles)[0]> = {};
  tiles.forEach(tile => {
    const pos = TILE_GRID[tile.tile_id];
    if (pos) tileByGrid[`${pos[0]}-${pos[1]}`] = tile;
  });

  const selectedTile = tiles.find(t => t.tile_id === selectedTileId) ?? null;

  return (
    <div className="h-full rounded-xl border border-white/[0.07] bg-white/[0.02] p-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <span className="text-[9px] tracking-[0.25em] text-white/30">SUNDARBANS DELTA BASIN</span>
          {loading && <span className="ml-3 text-[8px] text-amber-400/60 animate-pulse">UPDATING...</span>}
        </div>
        {/* Horizon selector */}
        <div className="flex rounded-lg border border-white/[0.08] overflow-hidden">
          {HORIZONS.map(h => (
            <button key={h} onClick={() => setHorizon(h)}
              className={`px-4 py-1.5 text-[9px] tracking-[0.2em] transition ${horizon === h ? "bg-emerald-400/15 text-emerald-400" : "text-white/30 hover:text-white/60"}`}>
              {h}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* SVG grid map */}
        <div className="lg:col-span-2">
          <svg viewBox={`0 0 ${GRID_W * 52} ${GRID_H * 52}`} className="w-full rounded-lg"
            style={{ background: "rgba(0,20,10,0.5)" }}>
            {Array.from({ length: GRID_H }, (_, row) =>
              Array.from({ length: GRID_W }, (_, col) => {
                const key = `${col}-${row}`;
                const tile = tileByGrid[key];
                const score = tile ? tileScore(tile, horizon) : 0;
                const isSelected = tile?.tile_id === selectedTileId;
                const hasSpecies = tile?.is_high_risk;

                return (
                  <g key={key}
                    onClick={() => tile && setSelectedTileId(isSelected ? null : tile.tile_id)}
                    style={{ cursor: tile ? "pointer" : "default" }}>
                    <rect
                      x={col * 52 + 2} y={row * 52 + 2}
                      width={48} height={48} rx={4}
                      fill={score > 0 ? riskColor(score) : "rgba(255,255,255,0.02)"}
                      stroke={isSelected ? "rgba(0,255,140,0.8)" : "rgba(255,255,255,0.04)"}
                      strokeWidth={isSelected ? 2 : 1}
                    />
                    {score > 0 && (
                      <text x={col * 52 + 26} y={row * 52 + 30}
                        textAnchor="middle" fill="rgba(255,255,255,0.8)"
                        fontSize="9" fontFamily="'Orbitron',monospace" fontWeight="bold">
                        {score.toFixed(2)}
                      </text>
                    )}
                    {hasSpecies && (
                      <circle cx={col * 52 + 44} cy={row * 52 + 10} r={4} fill="rgba(0,255,140,0.9)" />
                    )}
                  </g>
                );
              })
            )}
          </svg>

          {/* Legend */}
          <div className="mt-3 flex gap-4 flex-wrap">
            {[
              { label: "CRITICAL ≥0.8", color: "bg-red-400/70" },
              { label: "HIGH ≥0.65",    color: "bg-amber-500/70" },
              { label: "MODERATE ≥0.45",color: "bg-yellow-500/50" },
              { label: "LOW",           color: "bg-emerald-400/35" },
              { label: "SPECIES",       dot: true },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-2">
                {l.dot
                  ? <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  : <div className={`w-3 h-3 rounded-sm ${l.color}`} />}
                <span className="text-[7px] tracking-[0.15em] text-white/30">{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tile detail panel */}
        <div>
          <div className="text-[9px] font-bold tracking-[0.3em] text-white/30 mb-3">TILE DETAIL</div>
          {selectedTile ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-white/[0.06] bg-black/20 p-3">
                <div className="text-[7px] tracking-[0.2em] text-white/20 mb-1">TILE ID</div>
                <div className="text-[10px] font-mono text-white/70">{selectedTile.tile_id}</div>
              </div>

              <div className="rounded-lg border border-white/[0.06] bg-black/20 p-3">
                <div className="text-[7px] tracking-[0.2em] text-white/20 mb-1">FLOOD RISK</div>
                <div className={`text-2xl font-black ${selectedTile.risk_score >= 0.8 ? "text-red-400" : selectedTile.risk_score >= 0.65 ? "text-amber-400" : "text-emerald-400"}`}>
                  {tileScore(selectedTile, horizon).toFixed(2)}
                </div>
                <div className="text-[7px] text-white/30 mt-1">{riskLabel(selectedTile.risk_score)}</div>
                <div className="mt-2 h-1 w-full rounded-full bg-white/10">
                  <div className="h-full rounded-full"
                    style={{ width: `${tileScore(selectedTile, horizon) * 100}%`, background: selectedTile.risk_score >= 0.65 ? "#f87171" : "#34d399" }} />
                </div>
              </div>

              <div className="space-y-1.5">
                {[
                  { label: "24H PROBABILITY", val: `${(selectedTile.flood_probability_24h * 100).toFixed(0)}%` },
                  { label: "48H PROBABILITY", val: `${(selectedTile.flood_probability_48h * 100).toFixed(0)}%` },
                  { label: "72H PROBABILITY", val: `${(selectedTile.flood_probability_72h * 100).toFixed(0)}%` },
                ].map(r => (
                  <div key={r.label} className="flex justify-between text-[8px] tracking-[0.1em]">
                    <span className="text-white/25">{r.label}</span>
                    <span className="text-white/50">{r.val}</span>
                  </div>
                ))}
              </div>

              {species.length > 0 && (
                <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/5 p-3">
                  <div className="text-[7px] tracking-[0.2em] text-emerald-400/60 mb-2">SPECIES HERE</div>
                  {species.map(s => (
                    <div key={s.species_name} className="flex items-center gap-2 mb-1.5">
                      <div className="w-1 h-1 rounded-full bg-emerald-400 shrink-0" />
                      <div className="text-[8px] text-white/60">{s.species_name}</div>
                      <div className={`ml-auto text-[7px] font-bold px-1.5 py-0.5 rounded border ${s.iucn_status === "CR" || s.iucn_status === "EN" ? "border-red-400/30 text-red-400" : "border-white/10 text-white/30"}`}>
                        {s.iucn_status}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-40 items-center justify-center text-center">
              <div>
                <div className="text-[9px] tracking-[0.2em] text-white/20">SELECT A TILE</div>
                <div className="mt-1 text-[7px] text-white/10">CLICK A CELL TO INSPECT</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}