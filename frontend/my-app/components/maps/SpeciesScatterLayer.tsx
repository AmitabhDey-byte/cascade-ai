// components/map/SpeciesScatterLayer.tsx
// Deck.gl ScatterplotLayer — renders species sighting locations
// Install: npm install deck.gl @deck.gl/layers

import { ScatterplotLayer } from "@deck.gl/layers";

type SpeciesPoint = {
  position: [number, number];
  name: string;
  status: "CR" | "EN" | "VU" | "LC";
  confidence: number;
};

type HoverInfo = {
  object?: SpeciesPoint;
};

const STATUS_COLOR: Record<string, [number, number, number, number]> = {
  CR: [239, 68,  68,  220],  // red
  EN: [245, 158, 11,  200],  // amber
  VU: [234, 179, 8,   180],  // yellow
  LC: [52,  211, 153, 160],  // emerald
};

export function buildSpeciesScatterLayer(data: SpeciesPoint[]) {
  return new ScatterplotLayer({
    id: "species-scatter-layer",
    data,
    getPosition: (d: SpeciesPoint) => d.position,
    getColor: (d: SpeciesPoint) => STATUS_COLOR[d.status] ?? [255, 255, 255, 150],
    getRadius: (d: SpeciesPoint) => 800 + d.confidence * 400,
    radiusMinPixels: 6,
    radiusMaxPixels: 18,
    pickable: true,
    stroked: true,
    lineWidthMinPixels: 1,
    getLineColor: [255, 255, 255, 40],
    onHover: (info: HoverInfo) => {
      if (info.object) {
        console.log("Species:", info.object.name, "Status:", info.object.status);
      }
    },
  });
}

// Sample data — replace with live GBIF data
export const SAMPLE_SPECIES_DATA: SpeciesPoint[] = [
  { position: [88.92, 21.98], name: "Royal Bengal Tiger",  status: "EN", confidence: 0.97 },
  { position: [88.87, 21.93], name: "Ganges River Shark",  status: "CR", confidence: 0.89 },
  { position: [88.97, 22.03], name: "Irrawaddy Dolphin",   status: "EN", confidence: 0.94 },
  { position: [89.02, 21.88], name: "Fishing Cat",         status: "VU", confidence: 0.91 },
  { position: [88.82, 22.08], name: "Olive Ridley Turtle", status: "VU", confidence: 0.96 },
  { position: [89.07, 21.83], name: "Estuarine Crocodile", status: "LC", confidence: 0.98 },
];

// Usage inside RiskMap.tsx:
// import { buildSpeciesScatterLayer, SAMPLE_SPECIES_DATA } from "./SpeciesScatterLayer";
// const layers = [buildSpeciesScatterLayer(SAMPLE_SPECIES_DATA)];
