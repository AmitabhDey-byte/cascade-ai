from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class GridCell(BaseModel):
    tile_id: str                        # e.g. "T-023"
    lat: float
    lng: float
    score: float = Field(ge=0.0, le=1.0)
    horizon_hours: int = Field(default=24)  # 24 | 48 | 72


class FloodForecast(BaseModel):
    run_id: str
    timestamp: datetime
    tiles: List[GridCell]
    high_risk_count: int                # tiles with score >= 0.7
    model_version: str = "lstm-v1"


class RiskRunRequest(BaseModel):
    force: bool = False                 # bypass 12h cooldown
    horizon: int = Field(default=72, ge=24, le=72)


class RiskRunResponse(BaseModel):
    run_id: str
    tiles_processed: int
    high_risk_tiles: List[str]          # tile IDs above threshold
    triggered_pipeline: bool
    timestamp: datetime