from datetime import datetime, timedelta

from app.db.model import IUCNStatus, SpeciesAlert

_memory_species: list[SpeciesAlert] = []


async def get_high_risk_species(tile_ids: list[str], limit: int = 50) -> list[SpeciesAlert]:
    selected = set(tile_ids)
    alerts = [alert for alert in await get_species_models() if alert.tile_id in selected]
    alerts.sort(key=lambda alert: alert.observed_at, reverse=True)
    return alerts[:limit]


async def get_species_for_tile(tile_id: str, since: datetime) -> list[SpeciesAlert]:
    alerts = [
        alert
        for alert in await get_species_models()
        if alert.tile_id == tile_id and alert.observed_at >= since
    ]
    alerts.sort(key=lambda alert: alert.bioclip_confidence, reverse=True)
    return alerts


async def get_species_for_tiles(tile_ids: list[str]) -> list[SpeciesAlert]:
    selected = set(tile_ids)
    return [alert for alert in await get_species_models() if alert.tile_id in selected]


async def get_species_models() -> list[SpeciesAlert]:
    return _memory_species or _demo_species()


def _demo_species() -> list[SpeciesAlert]:
    now = datetime.utcnow()
    return [
        SpeciesAlert(
            gbif_id="demo-panthera-tigris",
            name="Bengal Tiger",
            latin="Panthera tigris tigris",
            iucn_status=IUCNStatus.EN,
            tile_id="sundarbans_tile_05",
            lat=22.17,
            lng=88.72,
            observed_at=now - timedelta(days=9),
            bioclip_confidence=0.91,
            flood_risk_score=0.86,
            primary_threat="Flooded movement corridor",
        ),
        SpeciesAlert(
            gbif_id="demo-batagus-baska",
            name="Northern River Terrapin",
            latin="Batagur baska",
            iucn_status=IUCNStatus.CR,
            tile_id="sundarbans_tile_04",
            lat=22.24,
            lng=88.31,
            observed_at=now - timedelta(days=17),
            bioclip_confidence=0.84,
            flood_risk_score=0.77,
            primary_threat="Nest inundation",
        ),
        SpeciesAlert(
            gbif_id="demo-aonyx-cinereus",
            name="Asian Small-clawed Otter",
            latin="Aonyx cinereus",
            iucn_status=IUCNStatus.VU,
            tile_id="sundarbans_tile_02",
            lat=21.83,
            lng=88.64,
            observed_at=now - timedelta(days=31),
            bioclip_confidence=0.79,
            flood_risk_score=0.72,
            primary_threat="Den flooding",
        ),
    ]
