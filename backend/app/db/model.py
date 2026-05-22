from pydantic import BaseModel, Field
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


class RiskTile(BaseModel):
    tile_id: str
    run_id: str = "manual"
    lat: float = 0.0
    lng: float = 0.0
    lat_min: Optional[float] = None
    lat_max: Optional[float] = None
    lon_min: Optional[float] = None
    lon_max: Optional[float] = None
    score: float = 0.0
    risk_score: float = 0.0
    flood_probability_24h: float = 0.0
    flood_probability_48h: float = 0.0
    flood_probability_72h: float = 0.0
    is_high_risk: bool = False
    horizon_hours: int = 24
    soil_moisture: Optional[float] = None
    precipitation_mm: Optional[float] = None
    elevation_m: Optional[float] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class SpeciesAlert(BaseModel):
    gbif_id: Optional[str] = None
    name: str
    latin: str
    iucn_status: IUCNStatus
    tile_id: str
    lat: float
    lng: float
    observed_at: datetime
    bioclip_confidence: float
    photo_url: Optional[str] = None
    flood_risk_score: float
    primary_threat: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ConservationReport(BaseModel):
    report_id: str
    run_id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    trigger: str
    severity: str
    tiles_affected: List[str]
    species_affected: List[str]
    flood_risk_summary: str
    impact_summary: str
    action_plan: List[str]
    dispatched_to: List[str] = Field(default_factory=list)
    model_used: str = "gpt-5.4-mini"

