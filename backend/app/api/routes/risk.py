import asyncio
import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from app.core.config import settings
from app.db import risk_repo

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/tiles")
async def get_all_tiles():
    """Return the latest Assam and West Bengal risk state for each monitored area."""
    return await risk_repo.get_all_tiles()


@router.get("/status")
async def get_risk_status():
    """Expose data provenance and freshness for the active risk forecast."""
    from app.db import neon

    run = await risk_repo.get_latest_run()
    if not neon.is_configured():
        return {
            "storage": "local_demo",
            "data_mode": "demo",
            "run": None,
            "message": "DATABASE_URL is not configured; local demo data is displayed.",
        }
    if not run:
        return {
            "storage": "neon",
            "data_mode": "awaiting_first_run",
            "run": None,
            "message": "Neon is connected. Run a prediction to populate the live forecast.",
        }
    return {
        "storage": "neon",
        "data_mode": "live" if run["status"] == "completed" else run["status"],
        "run": run,
    }


@router.get("/tiles/{tile_id}")
async def get_tile(tile_id: str):
    """Return one monitored area by ID."""
    tile = await risk_repo.get_tile_by_id(tile_id)
    if not tile:
        raise HTTPException(status_code=404, detail=f"Tile {tile_id} not found.")
    return tile


@router.post("/run")
async def run_pipeline():
    """
    Run the full flood prediction loop:
    NASA soil moisture -> Open-Meteo forecast -> local ML model -> Neon -> n8n alert.
    """
    run_id = f"RUN-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:4].upper()}"

    try:
        from app.ml.flood.feature import DEFAULT_ELEVATION_M
        from app.ml.flood.predict import predict_flood_risk
        from app.services.nasa import fetch_soil_moisture_with_source, get_tile_grid
        from app.services.weather import fetch_precipitation_forecast

        logger.info("Pipeline %s started.", run_id)
        tile_grid = get_tile_grid()
        tile_meta = {tile["tile_id"]: tile for tile in tile_grid}
        await risk_repo.begin_run(run_id)

        (smap_data, soil_moisture_source), meteo_data = await asyncio.gather(
            fetch_soil_moisture_with_source(),
            fetch_precipitation_forecast(tile_grid),
        )
        risk_scores = predict_flood_risk(smap_data, meteo_data)
        weather_sources = {str(item.get("source", "unknown")) for item in meteo_data.values()}
        weather_source = next(iter(weather_sources)) if len(weather_sources) == 1 else "mixed"

        high_risk_tiles: list[str] = []
        for tile_id, scores in risk_scores.items():
            meta = tile_meta.get(tile_id, {})
            lat_min = meta.get("lat_min", 0.0)
            lat_max = meta.get("lat_max", lat_min)
            lon_min = meta.get("lon_min", 0.0)
            lon_max = meta.get("lon_max", lon_min)
            meteo = meteo_data.get(tile_id, {})
            score = scores["risk_score"]

            await risk_repo.upsert_risk_tile(
                {
                    "tile_id": tile_id,
                    "run_id": run_id,
                    "lat": (lat_min + lat_max) / 2,
                    "lng": (lon_min + lon_max) / 2,
                    "lat_min": lat_min,
                    "lat_max": lat_max,
                    "lon_min": lon_min,
                    "lon_max": lon_max,
                    "score": score,
                    "risk_score": score,
                    "flood_probability_24h": scores["flood_probability_24h"],
                    "flood_probability_48h": scores["flood_probability_48h"],
                    "flood_probability_72h": scores["flood_probability_72h"],
                    "is_high_risk": scores["is_high_risk"],
                    "soil_moisture": smap_data.get(tile_id),
                    "precipitation_mm": meteo.get("precip_72h"),
                    "elevation_m": meteo.get("elevation_m") or DEFAULT_ELEVATION_M,
                    "region": meta.get("region"),
                    "weather_source": meteo.get("source", "unknown"),
                    "soil_moisture_source": soil_moisture_source,
                    "horizon_hours": 72,
                    "timestamp": datetime.utcnow(),
                }
            )

            if scores["is_high_risk"]:
                high_risk_tiles.append(tile_id)

        await risk_repo.complete_run(
            run_id,
            tiles_processed=len(risk_scores),
            high_risk_count=len(high_risk_tiles),
            weather_source=weather_source,
            soil_moisture_source=soil_moisture_source,
            source_details={
                "weather_sources": sorted(weather_sources),
                "soil_moisture_source": soil_moisture_source,
                "model": "local-flood-model",
            },
        )

        n8n_triggered = False
        n8n_response = None
        if high_risk_tiles:
            from app.services.n8n_trigger import trigger_n8n

            n8n_response = await trigger_n8n(
                high_risk_tiles=high_risk_tiles,
                risk_scores={tile_id: data["risk_score"] for tile_id, data in risk_scores.items()},
                run_id=run_id,
            )
            n8n_triggered = n8n_response.get("triggered", True) is not False

        return {
            "status": "ok",
            "run_id": run_id,
            "tiles_processed": len(risk_scores),
            "high_risk_tiles": high_risk_tiles,
            "n8n_triggered": n8n_triggered,
            "n8n_response": n8n_response,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    except FileNotFoundError as exc:
        await risk_repo.fail_run(run_id, str(exc))
        raise HTTPException(status_code=500, detail=str(exc))
    except Exception as exc:
        logger.exception("Pipeline %s failed.", run_id)
        await risk_repo.fail_run(run_id, str(exc))
        return {
            "status": "error",
            "run_id": run_id,
            "tiles_processed": 0,
            "high_risk_tiles": [],
            "n8n_triggered": False,
            "error": str(exc),
            "threshold": settings.RISK_THRESHOLD,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
