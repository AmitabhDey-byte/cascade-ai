from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class ConservationReport(BaseModel):
    report_id: str                      # e.g. "RPT-2847"
    timestamp: datetime
    trigger: str                        # what caused the run
    severity: str                       # HIGH | MED | LOW | CRITICAL
    tiles_affected: List[str]
    species_affected: List[str]
    flood_risk_summary: str
    impact_summary: str                 # OpenAI-generated paragraph
    action_plan: List[str]              # OpenAI-generated ordered steps
    dispatched_to: List[str]            # ["TELEGRAM", "SMS", "GSHEET"]
    model_used: str = "gpt-5.4-mini"


class ReportGenerateRequest(BaseModel):
    run_id: Optional[str] = None        # links to a RiskRunResponse
    tile_ids: List[str] = Field(default_factory=list)  # direct n8n/manual selection path
    force: bool = False                 # regenerate even if recent report exists


class ReportGenerateResponse(BaseModel):
    report_id: str
    generated: bool
    cached: bool                        # True if returned existing report
    report: ConservationReport
    id: Optional[str] = None            # n8n-friendly alias
    species_affected: List[str] = Field(default_factory=list)
    risk_summary: Optional[str] = None
    ranger_instructions: Optional[str] = None
