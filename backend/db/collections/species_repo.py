import datetime
import uuid

_alerts: list[dict] = []

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
    alert = {
        "id": uuid.uuid4().hex,
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
    _alerts.append(alert)
    return alert["id"]


def get_species_for_tile(tile_id: str):
    records = [alert for alert in _alerts if alert["tile_id"] == tile_id]
    return sorted(records, key=lambda alert: alert["iucn_priority"], reverse=True)


def get_critical_species(min_iucn_priority: int = 3):
    records = [alert for alert in _alerts if alert["iucn_priority"] >= min_iucn_priority]
    return sorted(records, key=lambda alert: alert["iucn_priority"], reverse=True)


def get_species_summary_for_tile(tile_id: str):
    return [
        {
            "species_name": record["species_name"],
            "common_name": record["common_name"],
            "iucn_status": record["iucn_status"],
        }
        for record in get_species_for_tile(tile_id)
    ]


def get_alerts_since(since: datetime.datetime):
    return [alert for alert in _alerts if alert["logged_at"] >= since]


def deduplicate_tile_species(tile_id: str):
    best_by_species: dict[str, dict] = {}
    for alert in get_species_for_tile(tile_id):
        current = best_by_species.get(alert["species_name"])
        if not current or alert["bioclip_confidence"] > current["bioclip_confidence"]:
            best_by_species[alert["species_name"]] = alert

    keep_ids = {alert["id"] for alert in best_by_species.values()}
    _alerts[:] = [
        alert
        for alert in _alerts
        if alert["tile_id"] != tile_id or alert["id"] in keep_ids
    ]
