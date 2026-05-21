from typing import Any

from app.db.model import RiskTile


def _serialize_tile(tile: RiskTile) -> dict[str, Any]:
    data = tile.model_dump(mode="json")
    data.pop("id", None)
    return data


async def get_all_tiles() -> list[dict[str, Any]]:
    try:
        tiles = await RiskTile.find_all().sort(-RiskTile.timestamp).to_list()
    except Exception:
        return []
    latest_by_tile: dict[str, RiskTile] = {}
    for tile in tiles:
        latest_by_tile.setdefault(tile.tile_id, tile)
    return [_serialize_tile(tile) for tile in latest_by_tile.values()]


async def get_tile_by_id(tile_id: str) -> dict[str, Any] | None:
    try:
        tile = await RiskTile.find(RiskTile.tile_id == tile_id).sort(-RiskTile.timestamp).first_or_none()
    except Exception:
        return None
    return _serialize_tile(tile) if tile else None


async def upsert_risk_tile(payload: dict[str, Any]) -> None:
    tile_id = payload["tile_id"]
    existing = await RiskTile.find(RiskTile.tile_id == tile_id).sort(-RiskTile.timestamp).first_or_none()
    if existing:
        for key, value in payload.items():
            if hasattr(existing, key):
                setattr(existing, key, value)
        await existing.save()
        return
    await RiskTile(**payload).insert()
