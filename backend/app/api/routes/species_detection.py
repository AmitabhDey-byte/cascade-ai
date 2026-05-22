"""Species detection pipeline endpoint that uses BioCLIP verification."""
import logging
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel

from app.db import species_repo, risk_repo
from app.ml.species.bioclip import verify_species, load_bioclip
from app.schemas.species import SpeciesObservation

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/species", tags=["species"])


class SpeciesVerificationRequest(BaseModel):
    observations: list[dict]
    tile_id: Optional[str] = None


class SpeciesVerificationResponse(BaseModel):
    verified_count: int
    total_count: int
    species: list[SpeciesObservation]
    timestamp: datetime


@router.on_event("startup")
async def startup_bioclip():
    """Load BioCLIP model at server startup."""
    try:
        load_bioclip()
        logger.info("BioCLIP loaded successfully at startup")
    except Exception as e:
        logger.warning(f"BioCLIP failed to load: {e}. Will load on first use.")


@router.post("/verify", response_model=SpeciesVerificationResponse)
async def verify_species_observations(request: SpeciesVerificationRequest) -> SpeciesVerificationResponse:
    """
    Verify species observations using BioCLIP.
    Returns only observations that pass confidence threshold.
    """
    try:
        logger.info(f"Verifying {len(request.observations)} observations with BioCLIP")
        
        # Run BioCLIP verification
        verified_obs = verify_species(request.observations)
        
        # Convert to SpeciesObservation schema
        species_list = [
            SpeciesObservation(
                gbif_id=obs.get("gbif_id", f"obs-{i}"),
                name=obs.get("name", "Unknown"),
                latin=obs.get("latin", "Unknown sp."),
                iucn_status=obs.get("iucn_status", "DD"),
                tile_id=request.tile_id or obs.get("tile_id", "unknown"),
                lat=obs.get("lat", 0.0),
                lng=obs.get("lng", 0.0),
                observed_at=obs.get("observed_at", datetime.utcnow()),
                bioclip_confidence=obs.get("bioclip_confidence", 0.0),
                photo_url=obs.get("photo_url"),
                flood_risk_score=obs.get("flood_risk_score", 0.0),
                primary_threat=obs.get("primary_threat", "Habitat disruption"),
            )
            for i, obs in enumerate(verified_obs)
        ]
        
        logger.info(f"BioCLIP verified {len(species_list)}/{len(request.observations)} observations")
        
        return SpeciesVerificationResponse(
            verified_count=len(species_list),
            total_count=len(request.observations),
            species=species_list,
            timestamp=datetime.utcnow(),
        )
    
    except Exception as e:
        logger.error(f"Species verification failed: {e}")
        raise HTTPException(status_code=500, detail=f"Verification failed: {str(e)}")


@router.get("/high-risk-with-bioclip")
async def get_high_risk_species_verified(limit: int = 50):
    """
    Get high-risk species across all tiles, verified with BioCLIP.
    Returns species with high confidence scores.
    """
    try:
        # Get high-risk tiles
        tiles = await risk_repo.get_tile_models()
        high_risk_tile_ids = [tile.tile_id for tile in tiles if tile.is_high_risk]
        
        if not high_risk_tile_ids:
            logger.info("No high-risk tiles found")
            return {
                "tiles_checked": 0,
                "species_found": [],
                "total": 0,
                "timestamp": datetime.utcnow().isoformat(),
            }
        
        logger.info(f"Checking {len(high_risk_tile_ids)} high-risk tiles for species")
        
        # Get species for high-risk tiles
        species_data = await species_repo.get_species_for_tiles(high_risk_tile_ids)
        
        # Sort by BioCLIP confidence (highest first)
        species_data.sort(key=lambda s: s.bioclip_confidence or 0.0, reverse=True)
        
        # Filter to high confidence and limit
        high_confidence_species = [
            s for s in species_data 
            if (s.bioclip_confidence or 0.0) >= 0.7
        ][:limit]
        
        # Convert to response format
        species_list = [
            {
                "gbif_id": s.gbif_id,
                "name": s.name,
                "latin": s.latin,
                "iucn_status": s.iucn_status,
                "tile_id": s.tile_id,
                "lat": s.lat,
                "lng": s.lng,
                "observed_at": s.observed_at.isoformat() if s.observed_at else None,
                "bioclip_confidence": s.bioclip_confidence,
                "photo_url": s.photo_url,
                "flood_risk_score": s.flood_risk_score,
                "primary_threat": s.primary_threat,
            }
            for s in high_confidence_species
        ]
        
        logger.info(f"Found {len(species_list)} high-confidence species in high-risk areas")
        
        return {
            "tiles_checked": len(high_risk_tile_ids),
            "species_found": species_list,
            "total": len(species_list),
            "timestamp": datetime.utcnow().isoformat(),
        }
    
    except Exception as e:
        logger.error(f"Failed to get high-risk species: {e}")
        raise HTTPException(status_code=503, detail="Species data unavailable")
