# alerts_logs.py
# CascadeAI - Alert Logging Collection
# Handles logging of flood risk alerts and triggered events

import datetime
from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017/")
db = client["cascade_ai"]
collection = db["alerts_logs"]


def log_alert(tile_id: str, risk_score: float, horizon: str, metadata: dict = None):
    """
    Log a flood risk alert for a given grid tile.

    Args:
        tile_id: Unique identifier for the 5km x 5km grid tile
        risk_score: Flood risk score (0.0 - 1.0)
        horizon: Forecast horizon ('24h', '48h', '72h')
        metadata: Optional additional metadata (species count, coordinates, etc.)
    """
    alert = {
        "tile_id": tile_id,
        "risk_score": risk_score,
        "horizon": horizon,
        "triggered": risk_score >= 0.7,
        "timestamp": datetime.datetime.utcnow(),
        "metadata": metadata or {},
    }
    result = collection.insert_one(alert)
    return str(result.inserted_id)


def get_alerts_by_tile(tile_id: str):
    """Retrieve all alerts for a specific tile, sorted by most recent."""
    return list(collection.find({"tile_id": tile_id}).sort("timestamp", -1))


def get_triggered_alerts(limit: int = 50):
    """Retrieve all alerts that crossed the risk threshold."""
    return list(
        collection.find({"triggered": True}).sort("timestamp", -1).limit(limit)
    )


def get_alerts_in_range(start: datetime.datetime, end: datetime.datetime):
    """Retrieve all alerts within a given time range."""
    return list(collection.find({"timestamp": {"$gte": start, "$lte": end}}))


def clear_old_alerts(days: int = 30):
    """Delete alerts older than a given number of days."""
    cutoff = datetime.datetime.utcnow() - datetime.timedelta(days=days)
    result = collection.delete_many({"timestamp": {"$lt": cutoff}})
    return result.deleted_count