import datetime
import random

from db.collections.alert_repo import log_alert
from db.collections.report_repo import save_report
from db.collections.risk_repo import upsert_tile
from db.collections.species_repo import log_species_alert

SUND_LAT_MIN = 21.5
SUND_LAT_MAX = 22.5
SUND_LON_MIN = 88.5
SUND_LON_MAX = 89.5
TILE_SIZE = 0.05

SUNDARBANS_SPECIES = [
    {"species_name": "Panthera tigris tigris", "common_name": "Bengal Tiger", "iucn_status": "Endangered"},
    {"species_name": "Platanista gangetica", "common_name": "Ganges River Dolphin", "iucn_status": "Endangered"},
    {"species_name": "Prionailurus viverrinus", "common_name": "Fishing Cat", "iucn_status": "Vulnerable"},
    {"species_name": "Lutra perspicillata", "common_name": "Smooth-coated Otter", "iucn_status": "Vulnerable"},
    {"species_name": "Batagur baska", "common_name": "Northern River Terrapin", "iucn_status": "Critically Endangered"},
    {"species_name": "Crocodylus porosus", "common_name": "Saltwater Crocodile", "iucn_status": "Least Concern"},
]


def generate_tile_id(lat: float, lon: float) -> str:
    return f"SDB_{lat:.2f}N_{lon:.2f}E".replace(".", "d")


def generate_bbox(lat: float, lon: float) -> dict:
    return {
        "south": round(lat, 4),
        "north": round(lat + TILE_SIZE, 4),
        "west": round(lon, 4),
        "east": round(lon + TILE_SIZE, 4),
    }


def seed_risk_tiles():
    tiles = []
    lat = SUND_LAT_MIN
    while lat < SUND_LAT_MAX:
        lon = SUND_LON_MIN
        while lon < SUND_LON_MAX:
            risk_24h = round(random.uniform(0.2, 0.95), 3)
            risk_48h = round(min(risk_24h + random.uniform(-0.1, 0.15), 1.0), 3)
            risk_72h = round(min(risk_48h + random.uniform(-0.05, 0.1), 1.0), 3)
            risk_scores = {"24h": risk_24h, "48h": risk_48h, "72h": risk_72h}
            tile_id = generate_tile_id(lat, lon)
            tile = {
                "tile_id": tile_id,
                "bbox": generate_bbox(lat, lon),
                "risk_scores": risk_scores,
                "soil_moisture": round(random.uniform(0.3, 0.9), 3),
                "precipitation_forecast": round(random.uniform(10, 180), 1),
                "elevation": round(random.uniform(0.5, 8.0), 2),
                "max_risk": max(risk_scores.values()),
                "high_risk": max(risk_scores.values()) >= 0.7,
            }
            upsert_tile(
                tile_id=tile_id,
                bbox=tile["bbox"],
                risk_scores=risk_scores,
                soil_moisture=tile["soil_moisture"],
                precipitation_forecast=tile["precipitation_forecast"],
                elevation=tile["elevation"],
            )
            tiles.append(tile)
            lon = round(lon + TILE_SIZE, 4)
        lat = round(lat + TILE_SIZE, 4)

    print(f"risk_tiles: {len(tiles)} tiles seeded in memory.")
    return tiles


def seed_alerts_logs(tiles: list):
    count = 0
    for tile in tiles:
        for horizon, score in tile["risk_scores"].items():
            log_alert(tile["tile_id"], score, horizon, {"bbox": tile["bbox"]})
            count += 1
    print(f"alerts_logs: {count} log entries seeded in memory.")


def seed_species_alerts(tiles: list):
    count = 0
    high_risk_tiles = [tile for tile in tiles if tile["high_risk"]]
    for tile in high_risk_tiles:
        for species in random.sample(SUNDARBANS_SPECIES, k=random.randint(2, 5)):
            log_species_alert(
                tile_id=tile["tile_id"],
                species_name=species["species_name"],
                common_name=species["common_name"],
                iucn_status=species["iucn_status"],
                gbif_occurrence_id=f"GBIF_{random.randint(1000000, 9999999)}",
                bioclip_confidence=round(random.uniform(0.75, 0.99), 3),
                observation_date=datetime.datetime.utcnow() - datetime.timedelta(days=random.randint(1, 180)),
            )
            count += 1
    print(f"species_alerts: {count} species alerts seeded in memory.")


def seed_reports(tiles: list):
    count = 0
    for tile in [tile for tile in tiles if tile["high_risk"]][:5]:
        save_report(
            tile_id=tile["tile_id"],
            risk_score=tile["max_risk"],
            species_at_risk=random.sample(SUNDARBANS_SPECIES, k=3),
            report_text=f"[SEED] Tile {tile['tile_id']} shows flood risk {tile['max_risk']:.2f}.",
            action_plan="Deploy ranger patrols and monitor high-risk corridors.",
        )
        count += 1
    print(f"reports: {count} reports seeded in memory.")


def seed_all():
    print("Seeding CascadeAI in-memory demo data...")
    tiles = seed_risk_tiles()
    seed_alerts_logs(tiles)
    seed_species_alerts(tiles)
    seed_reports(tiles)
    print("CascadeAI in-memory demo data ready.")


if __name__ == "__main__":
    seed_all()
