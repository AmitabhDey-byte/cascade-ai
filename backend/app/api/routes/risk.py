import logging
from typing import List
from fastapi import APIRouter, HTTPException, BackgroundTasks
from app.db import risk_repo
from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/tiles")
async def get_all_tiles():
    """Returns all Sundarbans tiles with their current risk scores."""
    tiles = await risk_repo.get_all_tiles()
    return tiles


@router.get("/tiles/{tile_id}")
async def get_tile(tile_id: str):
    """Returns a single tile by ID."""
    tile = await risk_repo.get_tile_by_id(tile_id)
    if not tile:
        raise HTTPException(status_code=404, detail=f"Tile {tile_id} not found.")
    return tile


@router.post("/run")
async def run_pipeline():
    """
    Triggers the full flood prediction pipeline:
    1. Fetch NASA SMAP soil moisture
    2. Fetch Open-Meteo precipitation forecast
    3. Build feature tensor
    4. Run Random Forest prediction
    5. Upsert risk scores to MongoDB
    6. Trigger n8n if any tile is high risk
    """
    try:
        # ── Data fetching ───────────────────────────────────────────
        from app.services.nasa_smap import fetch_soil_moisture
        from app.services.open_meteo import fetch_precipitation_forecast

        logger.info("Pipeline started — fetching data...")
        smap_data  = await fetch_soil_moisture()
        meteo_data = await fetch_precipitation_forecast()

        # ── ML inference ────────────────────────────────────────────
        from app.ml.flood.predict import predict_flood_risk

        logger.info("Running flood risk model...")
        risk_scores = predict_flood_risk(smap_data, meteo_data)

        # ── Persist to MongoDB ──────────────────────────────────────
        from app.ml.flood.features import TILE_ELEVATION

        high_risk_tiles = []
        for tile_id, scores in risk_scores.items():
            await risk_repo.upsert_risk_tile({
                "tile_id":                tile_id,
                "risk_score":             scores["risk_score"],
                "flood_probability_24h":  scores["flood_probability_24h"],
                "flood_probability_48h":  scores["flood_probability_48h"],
                "flood_probability_72h":  scores["flood_probability_72h"],
                "is_high_risk":           scores["is_high_risk"],
            })
            if scores["is_high_risk"]:
                high_risk_tiles.append(tile_id)

        logger.info(f"Risk scores saved. High risk: {high_risk_tiles}")

        # ── Trigger n8n if needed ───────────────────────────────────
        n8n_triggered = False
        if high_risk_tiles:
            from app.services.n8n_trigger import trigger_n8n
            await trigger_n8n(
                high_risk_tiles=high_risk_tiles,
                risk_scores={tid: risk_scores[tid]["risk_score"] for tid in risk_scores},
            )
            n8n_triggered = True

        return {
            "status":           "ok",
            "tiles_processed":  len(risk_scores),
            "high_risk_tiles":  high_risk_tiles,
            "n8n_triggered":    n8n_triggered,
        }

    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"Pipeline error: {e}")
        raise HTTPException(status_code=500, detail=str(e))