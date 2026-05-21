from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from enum import Enum


class IUCNStatus(str, Enum):
    CR = "CR"   # Critically Endangered
    EN = "EN"   # Endangered
    VU = "VU"   # Vulnerable
    NT = "NT"   # Near Threatened
    LC = "LC"   # Least Concern
    DD = "DD"   # Data Deficient


class SpeciesObservation(BaseModel):
    gbif_id: Optional[str] = None
    name: str                           # common name
    latin: str                          # scientific name
    iucn_status: IUCNStatus
    tile_id: str
    lat: float
    lng: float
    observed_at: datetime
    bioclip_confidence: float = Field(ge=0.0, le=1.0)
    photo_url: Optional[str] = None
    flood_risk_score: float = Field(ge=0.0, le=1.0)
    primary_threat: Optional[str] = None


class SpeciesTileResponse(BaseModel):
    tile_id: str
    flood_risk_score: float
    species: List[SpeciesObservation]
    total_count: int
    critical_count: int                 # CR + EN species
    last_updated: datetime