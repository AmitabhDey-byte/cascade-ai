// components/map/AlertZoneLayer.tsx
// Deck.gl PolygonLayer — renders high-risk tile boundaries as glowing outlines
// Install: npm install deck.gl @deck.gl/layers

import { PolygonLayer } from "@deck.gl/layers";

type AlertZone = {
  id: string;
  score: number;
  // Polygon as array of [lng, lat] pairs
  polygon: [number, number][];
};

function scoreToOutlineColor(score: number): [number, number, number, number] {
  if (score >= 0.8) return [239, 68, 68, 220];
  if (score >= 0.65) return [245, 158, 11, 190];
  return [234, 179, 8, 150];
}

function scoreToBg(score: number): [number, number, number, number] {
  if (score >= 0.8) return [239, 68, 68, 25];
  if (score >= 0.65) return [245, 158, 11, 20];
  return [234, 179, 8, 15];
}

// Pre-built 5km × 5km tile polygons for high-risk zones in the Sundarbans
// Replace with dynamically computed tiles from your LSTM output
export const ALERT_ZONES: AlertZone[] = [
  {
    id: "T-023",
    score: 0.91,
    polygon: [
      [88.88, 21.95], [88.96, 21.95],
      [88.96, 22.01], [88.88, 22.01],
    ],
  },
  {
    id: "T-024",
    score: 0.84,
    polygon: [
      [88.83, 21.90], [88.91, 21.90],
      [88.91, 21.96], [88.83, 21.96],
    ],
  },
  {
    id: "T-033",
    score: 0.75,
    polygon: [
      [88.93, 22.00], [89.01, 22.00],
      [89.01, 22.06], [88.93, 22.06],
    ],
  },
];

export function buildAlertZoneLayer(zones: AlertZone[] = ALERT_ZONES) {
  return new PolygonLayer({
    id: "alert-zone-layer",
    data: zones,
    getPolygon: (d: AlertZone) => d.polygon,
    getFillColor: (d: AlertZone) => scoreToBg(d.score),
    getLineColor: (d: AlertZone) => scoreToOutlineColor(d.score),
    lineWidthMinPixels: 2,
    pickable: true,
    stroked: true,
    filled: true,
    onHover: (info: any) => {
      if (info.object) {
        console.log("Alert zone:", info.object.id, "Score:", info.object.score);
      }
    },
  });
}

// Usage inside RiskMap.tsx:
// import { buildAlertZoneLayer, ALERT_ZONES } from "./AlertZoneLayer";
// const layers = [buildAlertZoneLayer(ALERT_ZONES)];