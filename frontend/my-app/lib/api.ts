export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export type RiskTile = {
  tile_id: string;
  lat?: number;
  lng?: number;
  score?: number;
  risk_score?: number;
  flood_probability_24h?: number;
  flood_probability_48h?: number;
  flood_probability_72h?: number;
  horizon_hours?: number;
  soil_moisture?: number;
  precipitation_mm?: number;
  elevation_m?: number;
  timestamp?: string;
};

export type SpeciesObservation = {
  name: string;
  latin: string;
  iucn_status: string;
  tile_id: string;
  bioclip_confidence: number;
  flood_risk_score: number;
  primary_threat?: string | null;
  observed_at?: string;
};

export type SpeciesTileResponse = {
  tile_id: string;
  flood_risk_score: number;
  species: SpeciesObservation[];
  total_count: number;
  critical_count: number;
  last_updated: string;
};

export type ConservationReport = {
  report_id: string;
  timestamp: string;
  trigger: string;
  severity: string;
  tiles_affected: string[];
  species_affected: string[];
  flood_risk_summary: string;
  impact_summary: string;
  action_plan: string[];
  dispatched_to: string[];
  model_used: string;
};

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`API ${path} failed with ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export function getRiskTiles() {
  return request<RiskTile[]>("/risk/tiles");
}

export function getSpeciesForTile(tileId: string) {
  return request<SpeciesTileResponse>(`/species/tile/${encodeURIComponent(tileId)}`);
}

export function getLatestReport() {
  return request<ConservationReport>("/report/latest");
}

export function tileScore(tile: RiskTile): number {
  return tile.score ?? tile.risk_score ?? tile.flood_probability_24h ?? 0;
}
