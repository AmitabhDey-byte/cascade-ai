# species_alerts.py
# CascadeAI - Species Alerts Collection
# Tracks species at risk per flood tile, with IUCN status and BioCLIP confirmations

import datetime
from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017/")
db = client["cascade_ai"]
collection = db["species_alerts"]


# IUCN threat status priority order (higher index = higher urgency)
IUCN_PRIORITY = {
    "Least Concern": 0,
    "Near Threatened": 1,
    "Vulnerable": 2,
    "Endangered": 3,
    "Critically Endangered": 4,
    "Extinct in the Wild": 5,
    "Extinct": 6,
}


def log_species_alert(
    tile_id: str,
    species_name: str,
    common_name: str,
    iucn_status: str,
    gbif_occurrence_id: str,
    bioclip_confidence: float,
    observation_date: datetime.datetime,
    photo_url: str = None,
    metadata: dict = None,
):
    """
    Log a confirmed at-risk species observation for a high-risk flood tile.

    Args:
        tile_id: Grid tile where this species was observed
        species_name: Scientific name (e.g. 'Panthera tigris')
        common_name: Common name (e.g. 'Bengal Tiger')
        iucn_status: IUCN Red List category
        gbif_occurrence_id: GBIF occurrence record ID
        bioclip_confidence: BioCLIP species ID confidence score (0.0 - 1.0)
        observation_date: Date of the GBIF observation
        photo_url: URL to observation photo (optional)
        metadata: Any additional fields
    """
    alert = {
        "tile_id": tile_id,
        "species_name": species_name,
        "common_name": common_name,
        "iucn_status": iucn_status,
        "iucn_priority": IUCN_PRIORITY.get(iucn_status, -1),
        "gbif_occurrence_id": gbif_occurrence_id,
        "bioclip_confidence": bioclip_confidence,
        "observation_date": observation_date,
        "photo_url": photo_url,
        "logged_at": datetime.datetime.utcnow(),
        "metadata": metadata or {},
    }
    result = collection.insert_one(alert)
    return str(result.inserted_id)


def get_species_for_tile(tile_id: str):
    """Return all confirmed species alerts for a tile, sorted by IUCN priority."""
    return list(
        collection.find({"tile_id": tile_id}).sort("iucn_priority", -1)
    )


def get_critical_species(min_iucn_priority: int = 3):
    """
    Return all species alerts at or above a given IUCN priority level.
    Default: Endangered (3) and above.
    """
    return list(
        collection.find({"iucn_priority": {"$gte": min_iucn_priority}}).sort(
            "iucn_priority", -1
        )
    )


def get_species_summary_for_tile(tile_id: str):
    """
    Return a concise summary list of species for prompt packaging.
    Each entry: { species_name, common_name, iucn_status }
    """
    records = get_species_for_tile(tile_id)
    return [
        {
            "species_name": r["species_name"],
            "common_name": r["common_name"],
            "iucn_status": r["iucn_status"],
        }
        for r in records
    ]


def get_alerts_since(since: datetime.datetime):
    """Retrieve all species alerts logged after a given datetime."""
    return list(collection.find({"logged_at": {"$gte": since}}))


def deduplicate_tile_species(tile_id: str):
    """
    Remove duplicate species entries for the same tile
    (keeps the highest BioCLIP confidence record per species).
    """
    pipeline = [
        {"$match": {"tile_id": tile_id}},
        {"$sort": {"bioclip_confidence": -1}},
        {
            "$group": {
                "_id": "$species_name",
                "doc_id": {"$first": "$_id"},
            }
        },
    ]
    keep_ids = {r["doc_id"] for r in collection.aggregate(pipeline)}
    collection.delete_many({"tile_id": tile_id, "_id": {"$nin": list(keep_ids)}})