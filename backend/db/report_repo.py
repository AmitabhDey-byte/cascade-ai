# reports.py
# CascadeAI - Reports Collection
# Stores AI-generated impact reports and conservation action plans

import datetime
from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017/")
db = client["cascade_ai"]
collection = db["reports"]


def save_report(
    tile_id: str,
    risk_score: float,
    species_at_risk: list,
    report_text: str,
    action_plan: str,
    metadata: dict = None,
):
    """
    Save a Claude-generated impact report for a high-risk tile.

    Args:
        tile_id: Grid tile identifier
        risk_score: Flood risk score that triggered this report
        species_at_risk: List of species dicts with name + IUCN status
        report_text: Full natural-language impact report from Claude
        action_plan: Specific conservation action plan with ranger instructions
        metadata: Optional additional context (coordinates, forecast horizon, etc.)
    """
    report = {
        "tile_id": tile_id,
        "risk_score": risk_score,
        "species_at_risk": species_at_risk,
        "report_text": report_text,
        "action_plan": action_plan,
        "timestamp": datetime.datetime.utcnow(),
        "metadata": metadata or {},
        "dispatched": False,
    }
    result = collection.insert_one(report)
    return str(result.inserted_id)


def get_report_by_id(report_id: str):
    """Retrieve a single report by its MongoDB ObjectId string."""
    from bson import ObjectId
    return collection.find_one({"_id": ObjectId(report_id)})


def get_reports_by_tile(tile_id: str):
    """Retrieve all reports for a specific tile, most recent first."""
    return list(collection.find({"tile_id": tile_id}).sort("timestamp", -1))


def get_undispatched_reports():
    """Retrieve reports not yet sent via n8n/Telegram/SMS."""
    return list(collection.find({"dispatched": False}))


def mark_dispatched(report_id: str):
    """Mark a report as dispatched after n8n fires the outputs."""
    from bson import ObjectId
    collection.update_one(
        {"_id": ObjectId(report_id)}, {"$set": {"dispatched": True}}
    )


def get_recent_reports(limit: int = 20):
    """Retrieve the most recent N reports."""
    return list(collection.find().sort("timestamp", -1).limit(limit))