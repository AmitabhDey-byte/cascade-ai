from pydantic import BaseModel
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
    impact_summary: str                 # Claude-generated paragraph
    action_plan: List[str]              # Claude-generated ordered steps
    dispatched_to: List[str]            # ["TELEGRAM", "SMS", "GSHEET"]
    model_used: str = "claude-sonnet-4-20250514"


class ReportGenerateRequest(BaseModel):
    run_id: str                         # links to a RiskRunResponse
    force: bool = False                 # regenerate even if recent report exists


class ReportGenerateResponse(BaseModel):
    report_id: str
    generated: bool
    cached: bool                        # True if returned existing report
    report: ConservationReport