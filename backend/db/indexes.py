# indexes.py
# CascadeAI - MongoDB Index Definitions
# Run once at startup to ensure optimal query performance across all collections

from pymongo import MongoClient, ASCENDING, DESCENDING, GEOSPHERE

client = MongoClient("mongodb://localhost:27017/")
db = client["cascade_ai"]


def create_alerts_logs_indexes():
    """Indexes for the alerts_logs collection."""
    col = db["alerts_logs"]

    # Fast lookup by tile
    col.create_index([("tile_id", ASCENDING)], name="idx_tile_id")

    # Filter triggered alerts quickly
    col.create_index([("triggered", ASCENDING)], name="idx_triggered")

    # Time-range queries and TTL-style cleanup
    col.create_index([("timestamp", DESCENDING)], name="idx_timestamp_desc")

    # Compound: tile + time (most common query pattern)
    col.create_index(
        [("tile_id", ASCENDING), ("timestamp", DESCENDING)],
        name="idx_tile_time",
    )

    print("✅ alerts_logs indexes created.")


def create_reports_indexes():
    """Indexes for the reports collection."""
    col = db["reports"]

    # Lookup by tile
    col.create_index([("tile_id", ASCENDING)], name="idx_tile_id")

    # Undispatched reports — polled by n8n
    col.create_index([("dispatched", ASCENDING)], name="idx_dispatched")

    # Most recent reports first
    col.create_index([("timestamp", DESCENDING)], name="idx_timestamp_desc")

    # Compound: undispatched + time
    col.create_index(
        [("dispatched", ASCENDING), ("timestamp", DESCENDING)],
        name="idx_dispatched_time",
    )

    print("✅ reports indexes created.")


def create_risk_tiles_indexes():
    """Indexes for the risk_tiles collection."""
    col = db["risk_tiles"]

    # Primary key pattern — tile_id is unique
    col.create_index([("tile_id", ASCENDING)], name="idx_tile_id", unique=True)

    # High-risk filter used by trigger logic
    col.create_index([("high_risk", ASCENDING)], name="idx_high_risk")

    # Sort by max risk for dashboard
    col.create_index([("max_risk", DESCENDING)], name="idx_max_risk_desc")

    # Last updated — freshness checks
    col.create_index([("last_updated", DESCENDING)], name="idx_last_updated")

    # Horizon-specific risk score queries
    for horizon in ["24h", "48h", "72h"]:
        col.create_index(
            [(f"risk_scores.{horizon}", DESCENDING)],
            name=f"idx_risk_{horizon}",
        )

    # Bounding box spatial queries (bbox stored as GeoJSON if needed later)
    col.create_index(
        [
            ("bbox.south", ASCENDING),
            ("bbox.north", ASCENDING),
            ("bbox.west", ASCENDING),
            ("bbox.east", ASCENDING),
        ],
        name="idx_bbox",
    )

    print("✅ risk_tiles indexes created.")


def create_species_alerts_indexes():
    """Indexes for the species_alerts collection."""
    col = db["species_alerts"]

    # Tile-based species lookup
    col.create_index([("tile_id", ASCENDING)], name="idx_tile_id")

    # IUCN priority sorting — critical species first
    col.create_index([("iucn_priority", DESCENDING)], name="idx_iucn_priority")

    # Species name deduplication
    col.create_index([("species_name", ASCENDING)], name="idx_species_name")

    # GBIF occurrence deduplication
    col.create_index(
        [("gbif_occurrence_id", ASCENDING)],
        name="idx_gbif_occurrence",
        unique=True,
        sparse=True,
    )

    # Compound: tile + IUCN priority (used by RAG prompt builder)
    col.create_index(
        [("tile_id", ASCENDING), ("iucn_priority", DESCENDING)],
        name="idx_tile_iucn",
    )

    # Time-range queries
    col.create_index([("logged_at", DESCENDING)], name="idx_logged_at")

    print("✅ species_alerts indexes created.")


def create_all_indexes():
    """Create all indexes across every CascadeAI collection."""
    print("\n🔧 Creating CascadeAI MongoDB indexes...\n")
    create_alerts_logs_indexes()
    create_reports_indexes()
    create_risk_tiles_indexes()
    create_species_alerts_indexes()
    print("\n✅ All indexes created successfully.\n")


if __name__ == "__main__":
    create_all_indexes()