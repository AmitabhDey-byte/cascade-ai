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
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080",
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});


// ── Risk ──────────────────────────────────────────────────────────────────────
export async function getRiskTiles(): Promise<RiskTile[]> {
  const { data } = await api.get<RiskTile[]>("/risk/tiles");
  return data;
}

export async function getRiskTile(tileId: string): Promise<RiskTile> {
  const { data } = await api.get<RiskTile>(`/risk/tiles/${tileId}`);
  return data;
}

export async function runPipeline(): Promise<PipelineResponse> {
  const { data } = await api.post<PipelineResponse>("/risk/run");
  return data;
}


// ── Species ───────────────────────────────────────────────────────────────────
export async function getSpeciesForTile(tileId: string): Promise<SpeciesAlert[]> {
  const { data } = await api.get<SpeciesAlert[]>(`/species/tile/${tileId}`);
  return data;
}

export async function getHighRiskSpecies(): Promise<SpeciesAlert[]> {
  const { data } = await api.get<SpeciesAlert[]>("/species/high-risk");
  return data;
}


// ── Report ────────────────────────────────────────────────────────────────────
export async function getLatestReport(): Promise<ConservationReport> {
  const { data } = await api.get<ConservationReport>("/report/latest");
  return data;
}

export async function generateReport(
  tileIds: string[]
): Promise<ConservationReport> {
  const { data } = await api.post<ConservationReport>("/report/generate", {
    tile_ids: tileIds,
    force:    true,
  });
  return data;
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