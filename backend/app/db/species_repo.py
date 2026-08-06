"""Species observations persisted in Neon Postgres."""

from datetime import datetime, timedelta, timezone

from app.db import neon
from app.db.model import IUCNStatus, SpeciesAlert


async def get_high_risk_species(tile_ids: list[str], limit: int = 50) -> list[SpeciesAlert]:
    if not tile_ids:
        return []
    if not neon.is_configured():
        selected = set(tile_ids)
        return [alert for alert in _demo_species() if alert.tile_id in selected][:limit]
    rows = await neon.fetch_all(
        """
        SELECT * FROM species_alerts
        WHERE tile_id = ANY(%s)
        ORDER BY CASE iucn_status WHEN 'CR' THEN 1 WHEN 'EN' THEN 2 WHEN 'VU' THEN 3 ELSE 4 END,
                 bioclip_confidence DESC, observed_at DESC
        LIMIT %s
        """,
        (tile_ids, limit),
    )
    return [_model_from_row(row) for row in rows]


async def get_species_for_tile(tile_id: str, since: datetime) -> list[SpeciesAlert]:
    if not neon.is_configured():
        return [alert for alert in _demo_species() if alert.tile_id == tile_id and alert.observed_at >= since]
    rows = await neon.fetch_all(
        """
        SELECT * FROM species_alerts
        WHERE tile_id = %s AND observed_at >= %s
        ORDER BY bioclip_confidence DESC, observed_at DESC
        """,
        (tile_id, since),
    )
    return [_model_from_row(row) for row in rows]


async def get_species_for_tiles(tile_ids: list[str]) -> list[SpeciesAlert]:
    if not tile_ids:
        return []
    if not neon.is_configured():
        selected = set(tile_ids)
        return [alert for alert in _demo_species() if alert.tile_id in selected]
    rows = await neon.fetch_all(
        "SELECT * FROM species_alerts WHERE tile_id = ANY(%s) ORDER BY observed_at DESC",
        (tile_ids,),
    )
    return [_model_from_row(row) for row in rows]


async def insert_species_alerts(alerts: list[SpeciesAlert]) -> None:
    if not alerts or not neon.is_configured():
        return
    await neon.execute_many(
        """
        INSERT INTO species_alerts (
          gbif_id, name, latin, iucn_status, tile_id, lat, lng, observed_at,
          bioclip_confidence, photo_url, flood_risk_score, primary_threat, created_at
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        [
            (
                alert.gbif_id, alert.name, alert.latin, alert.iucn_status.value, alert.tile_id,
                alert.lat, alert.lng, alert.observed_at, alert.bioclip_confidence, alert.photo_url,
                alert.flood_risk_score, alert.primary_threat, alert.created_at,
            )
            for alert in alerts
        ],
    )


def _model_from_row(row: dict) -> SpeciesAlert:
    return SpeciesAlert(
        gbif_id=row.get("gbif_id"), name=row["name"], latin=row["latin"],
        iucn_status=IUCNStatus(row["iucn_status"]), tile_id=row["tile_id"],
        lat=float(row["lat"]), lng=float(row["lng"]), observed_at=row["observed_at"],
        bioclip_confidence=float(row["bioclip_confidence"]), photo_url=row.get("photo_url"),
        flood_risk_score=float(row["flood_risk_score"]), primary_threat=row.get("primary_threat"),
        created_at=row.get("created_at") or datetime.now(timezone.utc),
    )


def _demo_species() -> list[SpeciesAlert]:
    now = datetime.now(timezone.utc)
    return [
        SpeciesAlert(gbif_id="demo-panthera-tigris", name="Bengal Tiger", latin="Panthera tigris tigris", iucn_status=IUCNStatus.EN, tile_id="west_bengal_04", lat=22.17, lng=88.72, observed_at=now - timedelta(days=9), bioclip_confidence=0.91, flood_risk_score=0.86, primary_threat="Flooded movement corridor"),
        SpeciesAlert(gbif_id="demo-rhinoceros-unicornis", name="Greater One-horned Rhinoceros", latin="Rhinoceros unicornis", iucn_status=IUCNStatus.VU, tile_id="assam_14", lat=26.58, lng=93.17, observed_at=now - timedelta(days=17), bioclip_confidence=0.84, flood_risk_score=0.77, primary_threat="Floodplain displacement"),
        SpeciesAlert(gbif_id="demo-aonyx-cinereus", name="Asian Small-clawed Otter", latin="Aonyx cinereus", iucn_status=IUCNStatus.VU, tile_id="west_bengal_12", lat=23.83, lng=87.64, observed_at=now - timedelta(days=31), bioclip_confidence=0.79, flood_risk_score=0.72, primary_threat="Den flooding"),
    ]
