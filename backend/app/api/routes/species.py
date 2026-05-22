from datetime import datetime, timedelta

from fastapi import APIRouter, HTTPException

from app.db.models import RiskTile, SpeciesAlert
from app.schemas.species import IUCNStatus, SpeciesObservation, SpeciesTileResponse

router = APIRouter(prefix="/species", tags=["species"])


@router.get("/high-risk", response_model=list[SpeciesObservation])
async def get_high_risk_species(limit: int = 50):
    """Return species observations overlapping the latest high-risk forecast."""
    try:
        high_risk_tiles = await RiskTile.find({"is_high_risk": True}).sort(-RiskTile.timestamp).to_list()
        latest_ids = list({tile.tile_id for tile in high_risk_tiles})
        if not latest_ids:
            return []

        alerts = (
            await SpeciesAlert.find({"tile_id": {"$in": latest_ids}})
            .sort(-SpeciesAlert.observed_at)
            .limit(limit)
            .to_list()
        )
    except Exception:
        raise HTTPException(status_code=503, detail="Species database unavailable.")

    return [_serialize_species(alert) for alert in alerts]


@router.get("/tile/{tile_id}", response_model=SpeciesTileResponse)
async def get_species_for_tile(tile_id: str, days: int = 180):
    """Fetch species observations for one monitored area."""
    since = datetime.utcnow() - timedelta(days=days)

    try:
        alerts = (
            await SpeciesAlert.find(
                SpeciesAlert.tile_id == tile_id,
                SpeciesAlert.observed_at >= since,
            )
            .sort(-SpeciesAlert.bioclip_confidence)
            .to_list()
        )
        risk_tile = await RiskTile.find(RiskTile.tile_id == tile_id).sort(-RiskTile.timestamp).first_or_none()
    except Exception:
        raise HTTPException(status_code=503, detail="Species database unavailable.")

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
