# risk_tiles.py
# CascadeAI - Risk Tiles Collection
# Manages 5km x 5km flood risk grid tiles across the Sundarbans

import datetime
from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017/")
db = client["cascade_ai"]
collection = db["risk_tiles"]


def upsert_tile(
    tile_id: str,
    bbox: dict,
    risk_scores: dict,
    soil_moisture: float,
    precipitation_forecast: float,
    elevation: float,
    metadata: dict = None,
):
    """
    Insert or update a risk tile with the latest LSTM model outputs.

    Args:
        tile_id: Unique grid tile identifier (e.g. 'SDB_012_045')
        bbox: Bounding box dict with keys: north, south, east, west
        risk_scores: Dict with keys '24h', '48h', '72h' -> float scores
        soil_moisture: Current NASA SMAP soil moisture value
        precipitation_forecast: NOAA/IMD precipitation forecast (mm)
        elevation: SRTM DEM average elevation for tile (metres)
        metadata: Optional extra fields
    """
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
    collection.update_one({"tile_id": tile_id}, {"$set": tile}, upsert=True)
    return tile_id


def get_tile(tile_id: str):
    """Retrieve the latest state of a single tile."""
    return collection.find_one({"tile_id": tile_id})


def get_high_risk_tiles(horizon: str = "24h"):
    """
    Return all tiles where the risk score for the given horizon >= 0.7.

    Args:
        horizon: One of '24h', '48h', '72h'
    """
    key = f"risk_scores.{horizon}"
    return list(collection.find({key: {"$gte": 0.7}}))


def get_all_tiles():
    """Return all tiles sorted by max risk descending."""
    return list(collection.find().sort("max_risk", -1))


def get_tiles_in_bbox(north: float, south: float, east: float, west: float):
    """Return tiles whose bounding boxes overlap with the given coordinates."""
    return list(
        collection.find(
            {
                "bbox.south": {"$lte": north},
                "bbox.north": {"$gte": south},
                "bbox.west": {"$lte": east},
                "bbox.east": {"$gte": west},
            }
        )
    )


def reset_tile_risks():
    """Reset all tiles to non-high-risk state (used after a cycle completes)."""
    collection.update_many({}, {"$set": {"high_risk": False, "max_risk": 0.0}})