from datetime import datetime
from typing import Any

from app.db.model import RiskTile

_memory_tiles: dict[str, dict[str, Any]] = {}


def _serialize_tile(tile: RiskTile) -> dict[str, Any]:
    data = tile.model_dump(mode="json")
    data.pop("id", None)
    data["updated_at"] = data.get("timestamp")
    data["risk_score"] = data.get("risk_score", data.get("score", 0.0))
    return data


async def get_all_tiles() -> list[dict[str, Any]]:
    if _memory_tiles:
        return list(_memory_tiles.values())

    return _demo_tiles()


async def get_tile_by_id(tile_id: str) -> dict[str, Any] | None:
    if tile_id in _memory_tiles:
        return _memory_tiles[tile_id]

    return next((tile for tile in _demo_tiles() if tile["tile_id"] == tile_id), None)


async def upsert_risk_tile(payload: dict[str, Any]) -> None:
    payload = _normalize_payload(payload)
    tile_id = payload["tile_id"]
    _memory_tiles[tile_id] = _json_ready(payload)

async def get_tile_models(tile_ids: list[str] | None = None, run_id: str | None = None) -> list[RiskTile]:
    tiles = await get_all_tiles()
    if tile_ids:
        selected = set(tile_ids)
        tiles = [tile for tile in tiles if tile["tile_id"] in selected]
    if run_id:
        tiles = [tile for tile in tiles if tile.get("run_id") == run_id]

    latest_by_tile: dict[str, dict[str, Any]] = {}
    for tile in sorted(tiles, key=lambda item: item.get("timestamp", ""), reverse=True):
        latest_by_tile.setdefault(tile["tile_id"], tile)
    return [RiskTile(**tile) for tile in latest_by_tile.values()]


def _normalize_payload(payload: dict[str, Any]) -> dict[str, Any]:
    normalized = dict(payload)
    normalized["timestamp"] = normalized.get("timestamp") or datetime.utcnow()
    normalized["score"] = normalized.get("score", normalized.get("risk_score", 0.0))
    normalized["risk_score"] = normalized.get("risk_score", normalized["score"])
    normalized["is_high_risk"] = normalized.get("is_high_risk", normalized["risk_score"] >= 0.7)
    normalized["updated_at"] = normalized["timestamp"]
    return normalized


def _json_ready(payload: dict[str, Any]) -> dict[str, Any]:
    ready = dict(payload)
    for key in ("timestamp", "updated_at"):
        value = ready.get(key)
        if isinstance(value, datetime):
            ready[key] = value.isoformat()
    return ready


def _demo_tiles() -> list[dict[str, Any]]:
    now = datetime.utcnow().isoformat()
    specs = [
        ("sundarbans_tile_01", 21.5, 22.0, 88.0, 88.5, 0.42, 0.49, 0.56),
        ("sundarbans_tile_02", 21.5, 22.0, 88.5, 89.0, 0.58, 0.66, 0.72),
        ("sundarbans_tile_03", 21.5, 22.0, 89.0, 89.5, 0.34, 0.39, 0.45),
        ("sundarbans_tile_04", 22.0, 22.5, 88.0, 88.5, 0.69, 0.77, 0.83),
        ("sundarbans_tile_05", 22.0, 22.5, 88.5, 89.0, 0.81, 0.86, 0.90),
        ("sundarbans_tile_06", 22.0, 22.5, 89.0, 89.5, 0.47, 0.53, 0.60),
    ]
    return [
        {
            "tile_id": tile_id,
            "run_id": "demo",
            "lat": (lat_min + lat_max) / 2,
            "lng": (lon_min + lon_max) / 2,
            "lat_min": lat_min,
            "lat_max": lat_max,
            "lon_min": lon_min,
            "lon_max": lon_max,
            "score": p24,
            "risk_score": p24,
            "flood_probability_24h": p24,
            "flood_probability_48h": p48,
            "flood_probability_72h": p72,
            "is_high_risk": max(p24, p48, p72) >= 0.7,
            "horizon_hours": 72,
            "soil_moisture": 0.5,
            "precipitation_mm": round(p72 * 180, 1),
            "elevation_m": 2.8,
            "timestamp": now,
            "updated_at": now,
        }
        for tile_id, lat_min, lat_max, lon_min, lon_max, p24, p48, p72 in specs
    ]
