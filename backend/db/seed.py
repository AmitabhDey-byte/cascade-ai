# seed.py
# CascadeAI - Database Seeder
# Populates MongoDB with realistic Sundarbans demo data for hackathon testing

import datetime
import random
from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017/")
db = client["cascade_ai"]

# ── Sundarbans bounding box (approximate) ──────────────────────────────────────
# Real coords: 21.5°N – 22.5°N, 88.5°E – 89.5°E
SUND_LAT_MIN = 21.5
SUND_LAT_MAX = 22.5
SUND_LON_MIN = 88.5
SUND_LON_MAX = 89.5
TILE_SIZE = 0.05  # ~5km in degrees

# ── IUCN species representative of Sundarbans ──────────────────────────────────
SUNDARBANS_SPECIES = [
    {"species_name": "Panthera tigris tigris",   "common_name": "Bengal Tiger",          "iucn_status": "Endangered"},
    {"species_name": "Platanista gangetica",      "common_name": "Ganges River Dolphin",  "iucn_status": "Endangered"},
    {"species_name": "Prionailurus viverrinus",   "common_name": "Fishing Cat",           "iucn_status": "Vulnerable"},
    {"species_name": "Lutra perspicillata",       "common_name": "Smooth-coated Otter",   "iucn_status": "Vulnerable"},
    {"species_name": "Batagur baska",             "common_name": "Northern River Terrapin","iucn_status": "Critically Endangered"},
    {"species_name": "Crocodylus porosus",        "common_name": "Saltwater Crocodile",   "iucn_status": "Least Concern"},
    {"species_name": "Cervus unicolor",           "common_name": "Sambar Deer",           "iucn_status": "Vulnerable"},
    {"species_name": "Axis axis",                 "common_name": "Spotted Deer",          "iucn_status": "Least Concern"},
    {"species_name": "Anhinga melanogaster",      "common_name": "Oriental Darter",       "iucn_status": "Near Threatened"},
    {"species_name": "Leptoptilos dubius",        "common_name": "Greater Adjutant",      "iucn_status": "Endangered"},
    {"species_name": "Irrawaddy dolphin",         "common_name": "Irrawaddy Dolphin",     "iucn_status": "Endangered"},
    {"species_name": "Manis crassicaudata",       "common_name": "Indian Pangolin",       "iucn_status": "Endangered"},
]

IUCN_PRIORITY = {
    "Least Concern": 0, "Near Threatened": 1, "Vulnerable": 2,
    "Endangered": 3, "Critically Endangered": 4,
    "Extinct in the Wild": 5, "Extinct": 6,
}


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
    """Generate a grid of risk tiles across the Sundarbans."""
    db["risk_tiles"].drop()
    tiles = []
    lat = SUND_LAT_MIN
    while lat < SUND_LAT_MAX:
        lon = SUND_LON_MIN
        while lon < SUND_LON_MAX:
            risk_24h = round(random.uniform(0.2, 0.95), 3)
            risk_48h = round(min(risk_24h + random.uniform(-0.1, 0.15), 1.0), 3)
            risk_72h = round(min(risk_48h + random.uniform(-0.05, 0.1), 1.0), 3)
            max_risk = max(risk_24h, risk_48h, risk_72h)

            tiles.append({
                "tile_id": generate_tile_id(lat, lon),
                "bbox": generate_bbox(lat, lon),
                "risk_scores": {"24h": risk_24h, "48h": risk_48h, "72h": risk_72h},
                "soil_moisture": round(random.uniform(0.3, 0.9), 3),
                "precipitation_forecast": round(random.uniform(10, 180), 1),
                "elevation": round(random.uniform(0.5, 8.0), 2),
                "max_risk": max_risk,
                "high_risk": max_risk >= 0.7,
                "last_updated": datetime.datetime.utcnow(),
                "metadata": {},
            })
            lon = round(lon + TILE_SIZE, 4)
        lat = round(lat + TILE_SIZE, 4)

    db["risk_tiles"].insert_many(tiles)
    print(f"✅ risk_tiles: {len(tiles)} tiles seeded.")
    return tiles


def seed_alerts_logs(tiles: list):
    """Generate alert log entries for each tile."""
    db["alerts_logs"].drop()
    logs = []
    for tile in tiles:
        for horizon, score in tile["risk_scores"].items():
            logs.append({
                "tile_id": tile["tile_id"],
                "risk_score": score,
                "horizon": horizon,
                "triggered": score >= 0.7,
                "timestamp": datetime.datetime.utcnow()
                    - datetime.timedelta(hours=random.randint(0, 48)),
                "metadata": {"bbox": tile["bbox"]},
            })

    db["alerts_logs"].insert_many(logs)
    print(f"✅ alerts_logs: {len(logs)} log entries seeded.")


def seed_species_alerts(tiles: list):
    """Assign species observations to high-risk tiles."""
    db["species_alerts"].drop()
    alerts = []
    high_risk_tiles = [t for t in tiles if t["high_risk"]]

    for tile in high_risk_tiles:
        # 2–5 species per high-risk tile
        sampled = random.sample(SUNDARBANS_SPECIES, k=random.randint(2, 5))
        for sp in sampled:
            alerts.append({
                "tile_id": tile["tile_id"],
                "species_name": sp["species_name"],
                "common_name": sp["common_name"],
                "iucn_status": sp["iucn_status"],
                "iucn_priority": IUCN_PRIORITY.get(sp["iucn_status"], -1),
                "gbif_occurrence_id": f"GBIF_{random.randint(1000000, 9999999)}",
                "bioclip_confidence": round(random.uniform(0.75, 0.99), 3),
                "observation_date": datetime.datetime.utcnow()
                    - datetime.timedelta(days=random.randint(1, 180)),
                "photo_url": None,
                "logged_at": datetime.datetime.utcnow(),
                "metadata": {},
            })

    db["species_alerts"].insert_many(alerts)
    print(f"✅ species_alerts: {len(alerts)} species alerts seeded.")


def seed_reports(tiles: list):
    """Generate placeholder Claude impact reports for high-risk tiles."""
    db["reports"].drop()
    reports = []
    high_risk_tiles = [t for t in tiles if t["high_risk"]][:5]  # seed 5 reports

    for tile in high_risk_tiles:
        score = tile["max_risk"]
        reports.append({
            "tile_id": tile["tile_id"],
            "risk_score": score,
            "species_at_risk": random.sample(
                [{"species_name": s["species_name"], "common_name": s["common_name"],
                  "iucn_status": s["iucn_status"]} for s in SUNDARBANS_SPECIES],
                k=3,
            ),
            "report_text": (
                f"[SEED] Tile {tile['tile_id']} shows a maximum flood risk score of "
                f"{score:.2f} over a 72-hour horizon. Elevated soil moisture and heavy "
                f"precipitation forecast indicate high inundation probability. "
                f"Immediate species displacement risk identified."
            ),
            "action_plan": (
                "1. Deploy ranger patrol to northern mangrove buffer zone.\n"
                "2. Activate elevated tiger monitoring protocol.\n"
                "3. Alert fisheries department to restrict access to high-risk tidal creeks.\n"
                "4. Prepare wildlife rescue team on standby."
            ),
            "timestamp": datetime.datetime.utcnow(),
            "dispatched": False,
            "metadata": {},
        })

    db["reports"].insert_many(reports)
    print(f"✅ reports: {len(reports)} reports seeded.")


def seed_all():
    """Run the full seed sequence."""
    print("\n🌱 Seeding CascadeAI database...\n")
    tiles = seed_risk_tiles()
    seed_alerts_logs(tiles)
    seed_species_alerts(tiles)
    seed_reports(tiles)
    print("\n🚀 CascadeAI database ready for demo.\n")


if __name__ == "__main__":
    seed_all()