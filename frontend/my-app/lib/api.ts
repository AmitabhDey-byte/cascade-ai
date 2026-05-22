import axios from "axios";
import type {
  RiskTile,
  SpeciesAlert,
  ConservationReport,
  StellarBalance,
  StellarToken,
  StellarTransaction,
  PipelineResponse,
  Horizon,
} from "@/types";

// ── Base client ───────────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000",
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

type BackendRiskTile = Partial<RiskTile> & {
  score?: number;
  lat?: number;
  lng?: number;
  timestamp?: string;
};

type BackendSpeciesTileResponse = {
  tile_id: string;
  species: Array<{
    name: string;
    latin: string;
    iucn_status: SpeciesAlert["iucn_status"];
    tile_id: string;
    observed_at?: string;
    bioclip_confidence: number;
    photo_url?: string | null;
  }>;
};

type BackendReport = {
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

function normalizeRiskTile(tile: BackendRiskTile): RiskTile {
  const score = tile.risk_score ?? tile.score ?? tile.flood_probability_24h ?? 0;
  return {
    tile_id: tile.tile_id ?? "unknown",
    lat_min: tile.lat_min ?? tile.lat ?? 0,
    lat_max: tile.lat_max ?? tile.lat ?? 0,
    lon_min: tile.lon_min ?? tile.lng ?? 0,
    lon_max: tile.lon_max ?? tile.lng ?? 0,
    risk_score: score,
    flood_probability_24h: tile.flood_probability_24h ?? score,
    flood_probability_48h: tile.flood_probability_48h ?? score,
    flood_probability_72h: tile.flood_probability_72h ?? score,
    is_high_risk: tile.is_high_risk ?? score >= 0.7,
    updated_at: tile.updated_at ?? tile.timestamp ?? new Date().toISOString(),
  };
}

function normalizeSpeciesAlert(species: BackendSpeciesTileResponse["species"][number]): SpeciesAlert {
  const priority = species.iucn_status === "CR" || species.iucn_status === "EN";
  return {
    tile_id: species.tile_id,
    species_name: species.name,
    scientific_name: species.latin,
    iucn_status: species.iucn_status,
    confidence_score: species.bioclip_confidence,
    observation_date: species.observed_at ?? null,
    photo_url: species.photo_url ?? null,
    is_priority: priority,
    created_at: species.observed_at ?? new Date().toISOString(),
  };
}

function normalizeReport(report: BackendReport): ConservationReport {
  return {
    id: report.report_id,
    tile_ids: report.tiles_affected,
    risk_summary: report.flood_risk_summary || report.trigger,
    species_affected: report.species_affected,
    priority_species: report.species_affected.join(", "),
    action_plan: report.action_plan.join("\n"),
    ranger_instructions: report.action_plan.join("\n"),
    estimated_impact: report.impact_summary,
    generated_at: report.timestamp,
    flood_horizon_hours: 72,
  };
}


// ── Risk ──────────────────────────────────────────────────────────────────────
export async function getRiskTiles(): Promise<RiskTile[]> {
  const { data } = await api.get<BackendRiskTile[]>("/risk/tiles");
  return data.map(normalizeRiskTile);
}

export async function getRiskTile(tileId: string): Promise<RiskTile> {
  const { data } = await api.get<BackendRiskTile>(`/risk/tiles/${tileId}`);
  return normalizeRiskTile(data);
}

export async function runPipeline(): Promise<PipelineResponse> {
  const { data } = await api.post<PipelineResponse>("/risk/run");
  return data;
}


// ── Species ───────────────────────────────────────────────────────────────────
export async function getSpeciesForTile(tileId: string): Promise<SpeciesAlert[]> {
  const { data } = await api.get<BackendSpeciesTileResponse>(`/species/tile/${tileId}`);
  return data.species.map(normalizeSpeciesAlert);
}

export async function getHighRiskSpecies(): Promise<SpeciesAlert[]> {
  try {
    // Try to get species verified with BioCLIP first
    const { data } = await api.get<{
      species_found: any[];
      total: number;
    }>("/species/high-risk-with-bioclip");
    
    return data.species_found.map((s: any) => ({
      tile_id: s.tile_id,
      species_name: s.name,
      scientific_name: s.latin,
      iucn_status: s.iucn_status,
      confidence_score: s.bioclip_confidence,
      observation_date: s.observed_at ? new Date(s.observed_at).toISOString() : null,
      photo_url: s.photo_url || null,
      is_priority: s.iucn_status === "CR" || s.iucn_status === "EN",
      created_at: s.observed_at || new Date().toISOString(),
    }));
  } catch (error) {
    // Fallback to the old endpoint if bioclip endpoint fails
    const tiles = await getRiskTiles();
    const highRiskTiles = tiles.filter((tile) => tile.is_high_risk).slice(0, 6);
    const settled = await Promise.allSettled(highRiskTiles.map((tile) => getSpeciesForTile(tile.tile_id)));
    return settled.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
  }
}


// ── Report ────────────────────────────────────────────────────────────────────
export async function getLatestReport(): Promise<ConservationReport> {
  const { data } = await api.get<BackendReport>("/report/latest");
  return normalizeReport(data);
}

export async function generateReport(
  tileIds: string[]
): Promise<ConservationReport> {
  const { data } = await api.post<{ report: BackendReport }>("/report/generate", {
    tile_ids: tileIds,
    force: true,
  });
  return normalizeReport(data.report);
}


// ── Blockchain ────────────────────────────────────────────────────────────────
export async function getStellarBalance(): Promise<StellarBalance> {
  const { data } = await api.get<StellarBalance>("/blockchain/balance");
  return data;
}

export async function getMintedTokens(): Promise<StellarToken[]> {
  const { data } = await api.get<StellarToken[]>("/blockchain/tokens");
  return data;
}

export async function getTransactionHistory(): Promise<StellarTransaction[]> {
  const { data } = await api.get<StellarTransaction[]>("/blockchain/transactions");
  return data;
}


// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns the correct risk score for a given forecast horizon */
export function tileScore(tile: RiskTile, horizon: Horizon = "24H"): number {
  switch (horizon) {
    case "24H": return tile.flood_probability_24h;
    case "48H": return tile.flood_probability_48h;
    case "72H": return tile.flood_probability_72h;
    default:    return tile.risk_score;
  }
}

/** Returns a colour string based on risk score */
export function riskColor(score: number): string {
  if (score >= 0.8)  return "rgba(239,68,68,0.7)";
  if (score >= 0.65) return "rgba(245,158,11,0.7)";
  if (score >= 0.45) return "rgba(234,179,8,0.5)";
  if (score >= 0.25) return "rgba(16,185,129,0.35)";
  return "rgba(16,185,129,0.12)";
}

/** Returns a label string based on risk score */
export function riskLabel(score: number): string {
  if (score >= 0.8)  return "CRITICAL";
  if (score >= 0.65) return "HIGH";
  if (score >= 0.45) return "MODERATE";
  if (score >= 0.25) return "LOW";
  return "MINIMAL";
}

/** Returns a colour class for IUCN status badges */
export function iucnColor(status: string): string {
  switch (status) {
    case "CR": return "text-red-400 border-red-400/30 bg-red-400/10";
    case "EN": return "text-orange-400 border-orange-400/30 bg-orange-400/10";
    case "VU": return "text-amber-400 border-amber-400/30 bg-amber-400/10";
    case "NT": return "text-yellow-400 border-yellow-400/30 bg-yellow-400/10";
    case "LC": return "text-emerald-400 border-emerald-400/30 bg-emerald-400/10";
    default:   return "text-white/40 border-white/10 bg-white/5";
  }
}

export type { RiskTile, SpeciesAlert, ConservationReport, StellarBalance, StellarToken };
