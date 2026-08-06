"""Risk persistence backed by Neon Postgres.

The database is the source of truth whenever DATABASE_URL is configured. The
small deterministic demo only exists for local, unconfigured development.
"""

import json
from datetime import datetime, timezone
from typing import Any

from app.db import neon
from app.db.model import RiskTile


async def begin_run(
    run_id: str,
    *,
    weather_source: str | None = None,
    soil_moisture_source: str | None = None,
) -> None:
    if not neon.is_configured():
        return
    await neon.execute(
        """
        INSERT INTO forecast_runs (run_id, status, weather_source, soil_moisture_source)
        VALUES (%s, 'running', %s, %s)
        ON CONFLICT (run_id) DO UPDATE
          SET status = 'running', started_at = now(), completed_at = NULL,
              error_message = NULL, weather_source = EXCLUDED.weather_source,
              soil_moisture_source = EXCLUDED.soil_moisture_source
        """,
        (run_id, weather_source, soil_moisture_source),
    )


async def complete_run(
    run_id: str,
    *,
    tiles_processed: int,
    high_risk_count: int,
    weather_source: str,
    soil_moisture_source: str,
    source_details: dict[str, Any],
) -> None:
    if not neon.is_configured():
        return
    await neon.execute(
        """
        UPDATE forecast_runs
        SET status = 'completed', completed_at = now(), tiles_processed = %s,
            high_risk_count = %s, weather_source = %s, soil_moisture_source = %s,
            source_details = %s::jsonb
        WHERE run_id = %s
        """,
        (tiles_processed, high_risk_count, weather_source, soil_moisture_source, json.dumps(source_details), run_id),
    )


async def fail_run(run_id: str, error_message: str) -> None:
    if not neon.is_configured():
        return
    await neon.execute(
        "UPDATE forecast_runs SET status = 'failed', completed_at = now(), error_message = %s WHERE run_id = %s",
        (error_message[:2000], run_id),
    )


async def get_latest_run() -> dict[str, Any] | None:
    if not neon.is_configured():
        return None
    return await neon.fetch_one(
        """
        SELECT run_id, status, started_at, completed_at, weather_source, soil_moisture_source,
               source_details, tiles_processed, high_risk_count, error_message
        FROM forecast_runs
        ORDER BY started_at DESC
        LIMIT 1
        """
    )


async def get_all_tiles() -> list[dict[str, Any]]:
    if not neon.is_configured():
        return _demo_tiles()
    run = await _latest_completed_run()
    if not run:
        return []
    rows = await neon.fetch_all(
        "SELECT * FROM risk_tiles WHERE run_id = %s ORDER BY risk_score DESC, tile_id",
        (run["run_id"],),
    )
    return [_serialize_db_tile(row) for row in rows]


async def get_tile_by_id(tile_id: str) -> dict[str, Any] | None:
    if not neon.is_configured():
        return next((tile for tile in _demo_tiles() if tile["tile_id"] == tile_id), None)
    run = await _latest_completed_run()
    if not run:
        return None
    row = await neon.fetch_one(
        "SELECT * FROM risk_tiles WHERE run_id = %s AND tile_id = %s",
        (run["run_id"], tile_id),
    )
    return _serialize_db_tile(row) if row else None


async def upsert_risk_tile(payload: dict[str, Any]) -> None:
    if not neon.is_configured():
        return
    normalized = _normalize_payload(payload)
    await neon.execute(
        """
        INSERT INTO risk_tiles (
          run_id, tile_id, lat, lng, lat_min, lat_max, lon_min, lon_max, score, risk_score,
          flood_probability_24h, flood_probability_48h, flood_probability_72h, is_high_risk,
          horizon_hours, soil_moisture, precipitation_mm, elevation_m, region, weather_source,
          soil_moisture_source, created_at
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (run_id, tile_id) DO UPDATE SET
          score = EXCLUDED.score, risk_score = EXCLUDED.risk_score,
          flood_probability_24h = EXCLUDED.flood_probability_24h,
          flood_probability_48h = EXCLUDED.flood_probability_48h,
          flood_probability_72h = EXCLUDED.flood_probability_72h,
          is_high_risk = EXCLUDED.is_high_risk, soil_moisture = EXCLUDED.soil_moisture,
          precipitation_mm = EXCLUDED.precipitation_mm, elevation_m = EXCLUDED.elevation_m,
          region = EXCLUDED.region,
          weather_source = EXCLUDED.weather_source, soil_moisture_source = EXCLUDED.soil_moisture_source,
          created_at = EXCLUDED.created_at
        """,
        (
            normalized["run_id"], normalized["tile_id"], normalized["lat"], normalized["lng"],
            normalized["lat_min"], normalized["lat_max"], normalized["lon_min"], normalized["lon_max"],
            normalized["score"], normalized["risk_score"], normalized["flood_probability_24h"],
            normalized["flood_probability_48h"], normalized["flood_probability_72h"], normalized["is_high_risk"],
            normalized["horizon_hours"], normalized["soil_moisture"], normalized["precipitation_mm"],
            normalized["elevation_m"], normalized.get("region"), normalized.get("weather_source"), normalized.get("soil_moisture_source"),
            normalized["timestamp"],
        ),
    )


async def get_tile_models(tile_ids: list[str] | None = None, run_id: str | None = None) -> list[RiskTile]:
    if not neon.is_configured():
        tiles = _demo_tiles()
        if tile_ids:
            wanted = set(tile_ids)
            tiles = [tile for tile in tiles if tile["tile_id"] in wanted]
        if run_id:
            tiles = [tile for tile in tiles if tile.get("run_id") == run_id]
        return [RiskTile(**tile) for tile in tiles]

    selected_run_id = run_id
    if not selected_run_id:
        latest = await _latest_completed_run()
        selected_run_id = latest["run_id"] if latest else None
    if not selected_run_id:
        return []

    if tile_ids:
        rows = await neon.fetch_all(
            "SELECT * FROM risk_tiles WHERE run_id = %s AND tile_id = ANY(%s) ORDER BY risk_score DESC",
            (selected_run_id, tile_ids),
        )
    else:
        rows = await neon.fetch_all(
            "SELECT * FROM risk_tiles WHERE run_id = %s ORDER BY risk_score DESC, tile_id",
            (selected_run_id,),
        )
    return [RiskTile(**_serialize_db_tile(row)) for row in rows]


async def _latest_completed_run() -> dict[str, Any] | None:
    return await neon.fetch_one(
        "SELECT run_id FROM forecast_runs WHERE status = 'completed' ORDER BY completed_at DESC NULLS LAST LIMIT 1"
    )


def _normalize_payload(payload: dict[str, Any]) -> dict[str, Any]:
    timestamp = payload.get("timestamp") or datetime.now(timezone.utc)
    return {
        "run_id": payload.get("run_id") or "manual",
        "tile_id": payload["tile_id"],
        "lat": float(payload.get("lat", 0.0)),
        "lng": float(payload.get("lng", 0.0)),
        "lat_min": payload.get("lat_min"),
        "lat_max": payload.get("lat_max"),
        "lon_min": payload.get("lon_min"),
        "lon_max": payload.get("lon_max"),
        "score": float(payload.get("score", payload.get("risk_score", 0.0))),
        "risk_score": float(payload.get("risk_score", payload.get("score", 0.0))),
        "flood_probability_24h": float(payload.get("flood_probability_24h", payload.get("risk_score", 0.0))),
        "flood_probability_48h": float(payload.get("flood_probability_48h", payload.get("risk_score", 0.0))),
        "flood_probability_72h": float(payload.get("flood_probability_72h", payload.get("risk_score", 0.0))),
        "is_high_risk": bool(payload.get("is_high_risk", False)),
        "horizon_hours": int(payload.get("horizon_hours", 72)),
        "soil_moisture": payload.get("soil_moisture"),
        "precipitation_mm": payload.get("precipitation_mm"),
        "elevation_m": payload.get("elevation_m"),
        "region": payload.get("region"),
        "weather_source": payload.get("weather_source"),
        "soil_moisture_source": payload.get("soil_moisture_source"),
        "timestamp": timestamp,
    }


def _serialize_db_tile(row: dict[str, Any]) -> dict[str, Any]:
    data = dict(row)
    data["timestamp"] = data.pop("created_at", datetime.now(timezone.utc))
    data["updated_at"] = data["timestamp"]
    return data


def _demo_tiles() -> list[dict[str, Any]]:
    now = datetime.now(timezone.utc).isoformat()
    from app.services.nasa import get_tile_grid

    tiles: list[dict[str, Any]] = []
    for index, cell in enumerate(get_tile_grid()):
        p24 = round(0.22 + ((index * 17) % 58) / 100, 2)
        p48 = round(min(1.0, p24 + 0.08), 2)
        p72 = round(min(1.0, p48 + 0.07), 2)
        tiles.append({
            "tile_id": cell["tile_id"], "region": cell["region"], "run_id": "demo",
            "lat": (cell["lat_min"] + cell["lat_max"]) / 2, "lng": (cell["lon_min"] + cell["lon_max"]) / 2,
            "lat_min": cell["lat_min"], "lat_max": cell["lat_max"], "lon_min": cell["lon_min"], "lon_max": cell["lon_max"],
            "score": p24, "risk_score": p24, "flood_probability_24h": p24, "flood_probability_48h": p48,
            "flood_probability_72h": p72, "is_high_risk": p24 >= 0.7, "horizon_hours": 72,
            "soil_moisture": 0.5, "precipitation_mm": round(p72 * 180, 1), "elevation_m": 3.0,
            "weather_source": "demo", "soil_moisture_source": "demo", "timestamp": now, "updated_at": now,
        })
    return tiles
