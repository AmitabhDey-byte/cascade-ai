// ── Risk Tiles ────────────────────────────────────────────────────────────────
export interface RiskTile {
  tile_id:                string;
  region?:                string | null;
  lat_min:                number;
  lat_max:                number;
  lon_min:                number;
  lon_max:                number;
  risk_score:             number;
  flood_probability_24h:  number;
  flood_probability_48h:  number;
  flood_probability_72h:  number;
  is_high_risk:           boolean;
  soil_moisture?:         number | null;
  precipitation_mm?:      number | null;
  elevation_m?:           number | null;
  weather_source?:        string | null;
  soil_moisture_source?:  string | null;
  updated_at:             string;
}

// ── Species ───────────────────────────────────────────────────────────────────
export interface SpeciesAlert {
  tile_id:          string;
  species_name:     string;
  scientific_name:  string;
  iucn_status:      "CR" | "EN" | "VU" | "NT" | "LC" | "DD";
  confidence_score: number;
  observation_date: string | null;
  photo_url:        string | null;
  is_priority:      boolean;
  created_at:       string;
}

// ── Conservation Report ───────────────────────────────────────────────────────
export interface ConservationReport {
  id:                   string;
  severity?:            string;
  tile_ids:             string[];
  risk_summary:         string;
  species_affected:     string[];
  priority_species:     string;
  action_plan:          string;
  ranger_instructions:  string;
  estimated_impact:     string;
  generated_at:         string;
  flood_horizon_hours:  number;
}

// ── Stellar ───────────────────────────────────────────────────────────────────
export interface StellarBalance {
  public_key:   string;
  xlm_balance:  string;
  cvt_balance:  string;
  explorer_url: string;
  network:      string;
}

export interface StellarToken {
  tx_hash:      string;
  token_id:     string;
  asset_code:   string;
  minted_at:    string;
  report_id:    string;
  explorer_url: string;
}

export interface StellarTransaction {
  tx_hash:      string;
  created_at:   string;
  explorer_url: string;
}

// ── Pipeline ──────────────────────────────────────────────────────────────────
export interface PipelineResponse {
  status:           string;
  run_id?:           string;
  tiles_processed:  number;
  high_risk_tiles:  string[];
  n8n_triggered:    boolean;
}

export interface ForecastRunStatus {
  run_id: string;
  status: "running" | "completed" | "failed";
  started_at: string;
  completed_at: string | null;
  weather_source: string | null;
  soil_moisture_source: string | null;
  source_details: Record<string, unknown>;
  tiles_processed: number;
  high_risk_count: number;
  error_message: string | null;
}

export interface RiskDataStatus {
  storage: "neon" | "local_demo";
  data_mode: "live" | "demo" | "awaiting_first_run" | "running" | "failed";
  run: ForecastRunStatus | null;
  message?: string;
}

// ── UI Helpers ────────────────────────────────────────────────────────────────
export type IUCNStatus = "CR" | "EN" | "VU" | "NT" | "LC" | "DD";
export type RiskLevel  = "CRITICAL" | "HIGH" | "MODERATE" | "LOW" | "MINIMAL";
export type Horizon    = "24H" | "48H" | "72H";
