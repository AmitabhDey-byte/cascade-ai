from datetime import datetime, timedelta

from fastapi import APIRouter, HTTPException

from app.db import risk_repo, species_repo
from app.db.models import SpeciesAlert
from app.schemas.species import IUCNStatus, SpeciesObservation, SpeciesTileResponse

router = APIRouter(prefix="/species", tags=["species"])


@router.get("/high-risk", response_model=list[SpeciesObservation])
async def get_high_risk_species(limit: int = 50):
    """Return species observations overlapping the latest high-risk forecast."""
    try:
        tiles = await risk_repo.get_tile_models()
        latest_ids = [tile.tile_id for tile in tiles if tile.is_high_risk]
        if not latest_ids:
            return []
        alerts = await species_repo.get_high_risk_species(latest_ids, limit)
    except Exception:
        raise HTTPException(status_code=503, detail="Species data unavailable.")

    return [_serialize_species(alert) for alert in alerts]


@router.get("/tile/{tile_id}", response_model=SpeciesTileResponse)
async def get_species_for_tile(tile_id: str, days: int = 180):
    """Fetch species observations for one monitored area."""
    since = datetime.utcnow() - timedelta(days=days)

    try:
        alerts = await species_repo.get_species_for_tile(tile_id, since)
        risk_tile = next(iter(await risk_repo.get_tile_models(tile_ids=[tile_id])), None)
    except Exception:
        raise HTTPException(status_code=503, detail="Species data unavailable.")

    species_list = [_serialize_species(alert) for alert in alerts]
    critical_statuses = {IUCNStatus.CR, IUCNStatus.EN}
    critical_count = sum(1 for item in species_list if item.iucn_status in critical_statuses)

    return SpeciesTileResponse(
        tile_id=tile_id,
        flood_risk_score=float((risk_tile.risk_score or risk_tile.score) if risk_tile else 0.0),
        species=species_list,
        total_count=len(species_list),
        critical_count=critical_count,
        last_updated=alerts[0].created_at if alerts else datetime.utcnow(),
    )


def _serialize_species(alert: SpeciesAlert) -> SpeciesObservation:
    return SpeciesObservation(
        gbif_id=alert.gbif_id,
        name=alert.name,
        latin=alert.latin,
        iucn_status=IUCNStatus(alert.iucn_status),
        tile_id=alert.tile_id,
        lat=alert.lat,
        lng=alert.lng,
        observed_at=alert.observed_at,
        bioclip_confidence=alert.bioclip_confidence,
        photo_url=alert.photo_url,
        flood_risk_score=alert.flood_risk_score,
        primary_threat=alert.primary_threat,
    )
