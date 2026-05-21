"use client";
import { getRiskTiles, RiskTile, tileScore } from "@/lib/api";
import type { ComponentType } from "react";
import { useEffect, useState } from "react";

// NOTE: Install these before using:
// npm install deck.gl @deck.gl/react @deck.gl/layers mapbox-gl
// Add your MAPBOX_TOKEN to .env.local as NEXT_PUBLIC_MAPBOX_TOKEN

// Flood risk tile data — replace with live API data
const RISK_TILES = [
  { position: [88.92, 21.98], score: 0.91 },
  { position: [88.87, 21.93], score: 0.84 },
  { position: [88.97, 22.03], score: 0.78 },
  { position: [89.02, 21.88], score: 0.75 },
  { position: [88.82, 22.08], score: 0.61 },
  { position: [89.07, 21.83], score: 0.55 },
  { position: [88.77, 22.13], score: 0.48 },
  { position: [89.12, 21.78], score: 0.38 },
  { position: [88.72, 22.18], score: 0.29 },
];

type MapTile = {
  position: number[];
  score: number;
};

function scoreToColor(score: number): [number, number, number, number] {
  if (score >= 0.8) return [239, 68, 68, 200];
  if (score >= 0.65) return [245, 158, 11, 180];
  if (score >= 0.45) return [234, 179, 8, 150];
  if (score >= 0.25) return [52, 211, 153, 120];
  return [52, 211, 153, 60];
}

// Fallback SVG map used when Deck.gl / Mapbox are not installed yet
function FallbackMap({ tiles = RISK_TILES }: { tiles?: MapTile[] }) {
  return (
    <div className="relative w-full h-full flex items-center justify-center rounded-xl overflow-hidden"
      style={{ background: "radial-gradient(ellipse at 40% 50%, rgba(0,40,20,0.8) 0%, rgba(0,0,0,0.95) 100%)" }}>

      {/* Simulated grid tiles */}
      <svg viewBox="0 0 500 350" className="w-full max-w-2xl opacity-90">
        {tiles.map((tile, i) => {
          const x = ((tile.position[0] - 88.7) / 0.5) * 400 + 40;
          const y = ((22.2 - tile.position[1]) / 0.5) * 300 + 20;
          const [r, g, b, a] = scoreToColor(tile.score);
          return (
            <g key={i}>
              <rect
                x={x - 22} y={y - 22} width={44} height={44} rx={6}
                fill={`rgba(${r},${g},${b},${a / 255})`}
                stroke={`rgba(${r},${g},${b},0.4)`}
                strokeWidth={1}
              />
              <text x={x} y={y + 4} textAnchor="middle"
                fill="rgba(255,255,255,0.85)" fontSize="9"
                fontFamily="'Orbitron', monospace" fontWeight="bold">
                {tile.score.toFixed(2)}
              </text>
            </g>
          );
        })}

        {/* Sundarbans label */}
        <text x="250" y="330" textAnchor="middle"
          fill="rgba(255,255,255,0.15)" fontSize="10"
          fontFamily="'Orbitron', monospace" letterSpacing="4">
          SUNDARBANS DELTA BASIN
        </text>
      </svg>

      <div className="absolute bottom-4 left-4 text-[7px] tracking-[0.2em] text-white/20">
        INSTALL deck.gl + mapbox-gl FOR LIVE MAP
      </div>
    </div>
  );
}

export default function RiskMap() {
  const [deckLoaded, setDeckLoaded] = useState(false);
  const [DeckComponent, setDeckComponent] = useState<ComponentType<Record<string, never>> | null>(null);
  const [riskTiles, setRiskTiles] = useState(RISK_TILES);

  // Dynamically import Deck.gl only if installed
  useEffect(() => {
    import("@deck.gl/react")
      .then((mod) => {
        setDeckComponent(() => mod.DeckGL || mod.default);
        setDeckLoaded(true);
      })
      .catch(() => {
        // deck.gl not installed — use fallback
        setDeckLoaded(false);
      });
  }, []);

  useEffect(() => {
    getRiskTiles()
      .then((apiTiles: RiskTile[]) => {
        const nextTiles = apiTiles
          .filter((tile) => typeof tile.lat === "number" && typeof tile.lng === "number")
          .map((tile) => ({ position: [tile.lng as number, tile.lat as number], score: tileScore(tile) }));
        if (nextTiles.length > 0) setRiskTiles(nextTiles);
      })
      .catch(() => undefined);
  }, []);

  return (
    <div className="relative w-full h-full min-h-[400px] rounded-xl overflow-hidden border border-white/[0.07]">
      {deckLoaded && DeckComponent ? (
        <div className="absolute inset-0">
          {/* Deck.gl renders here — wire up your layers in FloodHexLayer, SpeciesScatterLayer, AlertZoneLayer */}
          <div className="flex h-full items-center justify-center text-[9px] tracking-[0.2em] text-white/30">
            DECK.GL CANVAS — WIRE LAYERS HERE
          </div>
        </div>
      ) : (
          <FallbackMap tiles={riskTiles} />
      )}
    </div>
  );
}
