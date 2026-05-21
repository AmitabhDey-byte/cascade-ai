from beanie import Document, Indexed
from pydantic import Field
from typing import List, Optional
from datetime import datetime
from enum import Enum


class IUCNStatus(str, Enum):
    CR = "CR"
    EN = "EN"
    VU = "VU"
    NT = "NT"
    LC = "LC"
    DD = "DD"


# ── Risk Tiles ────────────────────────────────────────────────────────────────

class RiskTile(Document):
    tile_id: Indexed(str)               # type: ignore  e.g. "T-023"
    run_id: str
    lat: float
    lng: float
    score: float                        # 0.0 – 1.0
    horizon_hours: int = 24
    soil_moisture: Optional[float] = None
    precipitation_mm: Optional[float] = None
    elevation_m: Optional[float] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "risk_tiles"
        indexes = [["tile_id", "timestamp"]]


# ── Species Alerts ────────────────────────────────────────────────────────────

class SpeciesAlert(Document):
    gbif_id: Optional[str] = None
    name: str
    latin: str
    iucn_status: IUCNStatus
    tile_id: Indexed(str)               # type: ignore
    lat: float
    lng: float
    observed_at: datetime
    bioclip_confidence: float
    photo_url: Optional[str] = None
    flood_risk_score: float
    primary_threat: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "species_alerts"
        indexes = [["tile_id", "observed_at"]]


# ── Conservation Reports ──────────────────────────────────────────────────────

class ConservationReport(Document):
    report_id: Indexed(str, unique=True)    # type: ignore  e.g. "RPT-2847"
    run_id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    trigger: str
    severity: str
    tiles_affected: List[str]
    species_affected: List[str]
    flood_risk_summary: str
    impact_summary: str
    action_plan: List[str]
    dispatched_to: List[str] = []
    model_used: str = "claude-sonnet-4-20250514"

    class Settings:
        name = "conservation_reports"

