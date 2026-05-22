from datetime import datetime
import uuid

from fastapi import APIRouter, BackgroundTasks, HTTPException

from app.core.config import settings
from app.db import report_repo, risk_repo, species_repo
from app.db.models import ConservationReport as ReportDoc, RiskTile
from app.schemas.report import ConservationReport, ReportGenerateRequest, ReportGenerateResponse

router = APIRouter(prefix="/report", tags=["report"])


@router.get("/latest", response_model=ConservationReport)
async def get_latest_report():
    """Fetch the most recent OpenAI-generated impact report."""
    try:
        doc = await report_repo.get_latest_report()
    except Exception:
        raise HTTPException(status_code=503, detail="Report storage unavailable.")

    if not doc:
        raise HTTPException(status_code=404, detail="No reports generated yet. POST /report/generate first.")

    return _serialize_report(doc)


@router.post("/generate", response_model=ReportGenerateResponse)
async def generate_report(payload: ReportGenerateRequest, background_tasks: BackgroundTasks):
    """
    Run the RAG -> OpenAI conservation report pipeline.
    Accepts either a run_id or explicit tile_ids, so n8n can call this directly.
    """
    from app.rag.pipeline import build_report
    from app.services.n8n_trigger import dispatch_report

    run_id = payload.run_id
    if run_id and not payload.force:
        existing = await report_repo.get_report_by_run_id(run_id)
        if existing:
            return ReportGenerateResponse(
                report_id=existing.report_id,
                generated=False,
                cached=True,
                report=_serialize_report(existing),
                id=existing.report_id,
                species_affected=existing.species_affected,
                risk_summary=existing.flood_risk_summary,
                ranger_instructions="\n".join(existing.action_plan),
            )

    tiles = await _load_tiles(payload)
    if not tiles:
        raise HTTPException(status_code=404, detail="No risk data found. Run POST /risk/run first.")

    run_id = run_id or tiles[0].run_id or f"manual-{uuid.uuid4().hex[:6]}"
    selected_tile_ids = payload.tile_ids or [tile.tile_id for tile in tiles]
    high_risk_tile_ids = [
        tile.tile_id
        for tile in tiles
        if _tile_score(tile) >= settings.RISK_THRESHOLD or tile.tile_id in selected_tile_ids
    ]

    species_docs = await species_repo.get_species_for_tiles(high_risk_tile_ids)
    report_data = await build_report(run_id=run_id, tiles=tiles, species=species_docs)

    max_score = max((_tile_score(tile) for tile in tiles), default=0.0)
    severity = _severity(max_score)
    report_id = f"RPT-{uuid.uuid4().hex[:4].upper()}"

    doc = ReportDoc(
        report_id=report_id,
        run_id=run_id,
        timestamp=datetime.utcnow(),
        trigger=f"FLOOD RISK >= {settings.RISK_THRESHOLD:.2f} / {len(high_risk_tile_ids)} AREAS",
        severity=severity,
        tiles_affected=high_risk_tile_ids,
        species_affected=report_data.get("species_affected") or [item.name for item in species_docs],
        flood_risk_summary=report_data["flood_summary"],
        impact_summary=report_data["impact_summary"],
        action_plan=report_data["action_plan"],
        dispatched_to=[],
        model_used=report_data.get("model_used", settings.OPENAI_MODEL),
    )
    await report_repo.insert_report(doc)

    background_tasks.add_task(dispatch_report, report_id=report_id, severity=severity)

    return ReportGenerateResponse(
        report_id=report_id,
        generated=True,
        cached=False,
        report=_serialize_report(doc),
        id=report_id,
        species_affected=doc.species_affected,
        risk_summary=doc.flood_risk_summary,
        ranger_instructions=report_data.get("ranger_instructions") or "\n".join(doc.action_plan),
    )


async def _load_tiles(payload: ReportGenerateRequest) -> list[RiskTile]:
    tiles = await risk_repo.get_tile_models(tile_ids=payload.tile_ids, run_id=payload.run_id)

    latest_by_tile: dict[str, RiskTile] = {}
    for tile in tiles:
        latest_by_tile.setdefault(tile.tile_id, tile)
    return list(latest_by_tile.values())


def _serialize_report(doc: ReportDoc) -> ConservationReport:
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


def _tile_score(tile: RiskTile) -> float:
    return float(tile.risk_score or tile.score or 0.0)


def _severity(score: float) -> str:
    if score >= 0.85:
        return "CRITICAL"
    if score >= 0.7:
        return "HIGH"
    if score >= 0.5:
        return "MED"
    return "LOW"
