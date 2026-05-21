from fastapi import APIRouter, HTTPException, BackgroundTasks
from datetime import datetime
import uuid

from app.schemas.report import ConservationReport, ReportGenerateRequest, ReportGenerateResponse
from app.db.models import ConservationReport as ReportDoc, RiskTile, SpeciesAlert

router = APIRouter(prefix="/report", tags=["report"])


# ── GET /report/latest ────────────────────────────────────────────────────────
# Returns the most recently generated Claude conservation report.
# Used by ReportViewer.tsx on the dashboard.

@router.get("/latest", response_model=ConservationReport)
async def get_latest_report():
    """
    Fetch the most recent Claude-generated impact report from MongoDB.
    """
    doc = await ReportDoc.find_all().sort(-ReportDoc.timestamp).first_or_none()

    if not doc:
        raise HTTPException(status_code=404, detail="No reports generated yet. POST /report/generate first.")

    return ConservationReport(
        report_id=doc.report_id,
        timestamp=doc.timestamp,
        trigger=doc.trigger,
        severity=doc.severity,
        tiles_affected=doc.tiles_affected,
        species_affected=doc.species_affected,
        flood_risk_summary=doc.flood_risk_summary,
        impact_summary=doc.impact_summary,
        action_plan=doc.action_plan,
        dispatched_to=doc.dispatched_to,
        model_used=doc.model_used,
    )


# ── POST /report/generate ─────────────────────────────────────────────────────
# Full RAG + Claude pipeline.
# 1. Loads high-risk tiles + species for run_id
# 2. RAG retrieves IUCN context from ChromaDB
# 3. Builds structured prompt
# 4. Calls Claude Sonnet for impact summary + action plan
# 5. Saves report to MongoDB
# 6. Triggers n8n dispatch (Telegram, SMS, GSheet)

@router.post("/generate", response_model=ReportGenerateResponse)
async def generate_report(payload: ReportGenerateRequest, background_tasks: BackgroundTasks):
    """
    Run the full RAG → Claude pipeline to generate a conservation report.
    Returns immediately with the generated report.
    Dispatches notifications via n8n in the background.
    """
    from app.rag.pipeline import build_report
    from app.services.n8n_trigger import dispatch_report

    # Return cached report if one exists for this run and force=False
    if not payload.force:
        existing = await ReportDoc.find_one(ReportDoc.run_id == payload.run_id)
        if existing:
            return ReportGenerateResponse(
                report_id=existing.report_id,
                generated=False,
                cached=True,
                report=ConservationReport(
                    report_id=existing.report_id,
                    timestamp=existing.timestamp,
                    trigger=existing.trigger,
                    severity=existing.severity,
                    tiles_affected=existing.tiles_affected,
                    species_affected=existing.species_affected,
                    flood_risk_summary=existing.flood_risk_summary,
                    impact_summary=existing.impact_summary,
                    action_plan=existing.action_plan,
                    dispatched_to=existing.dispatched_to,
                    model_used=existing.model_used,
                ),
            )

    # Fetch tiles + species for this run
    tiles = await RiskTile.find(RiskTile.run_id == payload.run_id).to_list()
    high_risk_tile_ids = [t.tile_id for t in tiles if t.score >= 0.7]

    if not high_risk_tile_ids:
        raise HTTPException(
            status_code=400,
            detail=f"No high-risk tiles for run {payload.run_id}. Nothing to report."
        )

    species_docs = await SpeciesAlert.find(
        {"tile_id": {"$in": high_risk_tile_ids}}
    ).to_list()

    # RAG + Claude call
    report_data = await build_report(
        run_id=payload.run_id,
        tiles=tiles,
        species=species_docs,
    )

    # Determine severity
    max_score = max((t.score for t in tiles), default=0.0)
    if max_score >= 0.85:
        severity = "CRITICAL"
    elif max_score >= 0.7:
        severity = "HIGH"
    elif max_score >= 0.5:
        severity = "MED"
    else:
        severity = "LOW"

    report_id = f"RPT-{uuid.uuid4().hex[:4].upper()}"

    doc = ReportDoc(
        report_id=report_id,
        run_id=payload.run_id,
        timestamp=datetime.utcnow(),
        trigger=f"FLOOD RISK ≥ 0.70 · {len(high_risk_tile_ids)} TILES",
        severity=severity,
        tiles_affected=high_risk_tile_ids,
        species_affected=[s.name for s in species_docs],
        flood_risk_summary=report_data["flood_summary"],
        impact_summary=report_data["impact_summary"],
        action_plan=report_data["action_plan"],
        dispatched_to=[],
    )
    await doc.insert()

    # Fire n8n dispatch in background
    background_tasks.add_task(dispatch_report, report_id=report_id, severity=severity)

    return ReportGenerateResponse(
        report_id=report_id,
        generated=True,
        cached=False,
        report=ConservationReport(
            report_id=doc.report_id,
            timestamp=doc.timestamp,
            trigger=doc.trigger,
            severity=doc.severity,
            tiles_affected=doc.tiles_affected,
            species_affected=doc.species_affected,
            flood_risk_summary=doc.flood_risk_summary,
            impact_summary=doc.impact_summary,
            action_plan=doc.action_plan,
            dispatched_to=doc.dispatched_to,
            model_used=doc.model_used,
        ),
    )