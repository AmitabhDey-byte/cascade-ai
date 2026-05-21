from fastapi import APIRouter, HTTPException
from datetime import datetime, timedelta

from app.schemas.species import SpeciesTileResponse, SpeciesObservation, IUCNStatus
from app.db.models import SpeciesAlert, RiskTile

router = APIRouter(prefix="/species", tags=["species"])


# ── GET /species/tile/{tile_id} ───────────────────────────────────────────────
# Returns all species confirmed (via BioCLIP) in a given tile
# over the last 6 months, with IUCN status attached.
# Called by the frontend when a user clicks a tile on the risk map.

@router.get("/tile/{tile_id}", response_model=SpeciesTileResponse)
async def get_species_for_tile(tile_id: str, days: int = 180):
    """
    Fetch species observations for a specific grid tile.
    - Queries MongoDB for BioCLIP-confirmed sightings in the last `days`
    - Attaches current flood risk score for the tile
    - Returns critical (CR/EN) count separately for UI badges
    """
    since = datetime.utcnow() - timedelta(days=days)

    alerts = await SpeciesAlert.find(
        SpeciesAlert.tile_id == tile_id,
        SpeciesAlert.observed_at >= since,
    ).sort(-SpeciesAlert.bioclip_confidence).to_list()

    # Get latest risk score for this tile
    risk_tile = await RiskTile.find(
        RiskTile.tile_id == tile_id
    ).sort(-RiskTile.timestamp).first_or_none()

    if not alerts:
        raise HTTPException(
            status_code=404,
            detail=f"No species observations found for tile {tile_id} in the last {days} days."
        )

    species_list = [
        SpeciesObservation(
            gbif_id=a.gbif_id,
            name=a.name,
            latin=a.latin,
            iucn_status=IUCNStatus(a.iucn_status),
            tile_id=a.tile_id,
            lat=a.lat,
            lng=a.lng,
            observed_at=a.observed_at,
            bioclip_confidence=a.bioclip_confidence,
            photo_url=a.photo_url,
            flood_risk_score=a.flood_risk_score,
            primary_threat=a.primary_threat,
        )
        for a in alerts
    ]

    critical_statuses = {IUCNStatus.CR, IUCNStatus.EN}
    critical_count = sum(1 for s in species_list if s.iucn_status in critical_statuses)

    return SpeciesTileResponse(
        tile_id=tile_id,
        flood_risk_score=risk_tile.score if risk_tile else 0.0,
        species=species_list,
        total_count=len(species_list),
        critical_count=critical_count,
        last_updated=alerts[0].created_at if alerts else datetime.utcnow(),
    )