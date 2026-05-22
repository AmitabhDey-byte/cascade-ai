import datetime

_tiles: dict[str, dict] = {}


def upsert_tile(
    tile_id: str,
    bbox: dict,
    risk_scores: dict,
    soil_moisture: float,
    precipitation_forecast: float,
    elevation: float,
    metadata: dict = None,
):
    tile = {
        "tile_id": tile_id,
        "bbox": bbox,
        "risk_scores": risk_scores,
        "soil_moisture": soil_moisture,
        "precipitation_forecast": precipitation_forecast,
        "elevation": elevation,
        "max_risk": max(risk_scores.values()),
        "high_risk": max(risk_scores.values()) >= 0.7,
        "last_updated": datetime.datetime.utcnow(),
        "metadata": metadata or {},
    }
    _tiles[tile_id] = tile
    return tile_id


def get_tile(tile_id: str):
    return _tiles.get(tile_id)


def get_high_risk_tiles(horizon: str = "24h"):
    key = horizon
    return [tile for tile in _tiles.values() if tile["risk_scores"].get(key, 0.0) >= 0.7]


def get_all_tiles():
    return sorted(_tiles.values(), key=lambda tile: tile["max_risk"], reverse=True)


def get_tiles_in_bbox(north: float, south: float, east: float, west: float):
    return [
        tile
        for tile in _tiles.values()
        if tile["bbox"]["south"] <= north
        and tile["bbox"]["north"] >= south
        and tile["bbox"]["west"] <= east
        and tile["bbox"]["east"] >= west
    ]


def reset_tile_risks():
    for tile in _tiles.values():
        tile["high_risk"] = False
        tile["max_risk"] = 0.0
