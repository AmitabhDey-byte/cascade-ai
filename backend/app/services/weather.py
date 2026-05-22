import hashlib
import logging
import math
from datetime import datetime, timezone
from typing import Dict, Iterable, Mapping

import httpx

logger = logging.getLogger(__name__)

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"


async def fetch_precipitation_forecast(tiles: Iterable[Mapping] | None = None) -> Dict[str, Dict]:
    """
    Return precipitation features per monitored area.
    Uses Open-Meteo where available and a deterministic monsoon-aware fallback otherwise.
    """
    if tiles is None:
        from app.services.nasa import get_tile_grid

        tiles = get_tile_grid()

    result: Dict[str, Dict] = {}
    async with httpx.AsyncClient(timeout=20) as client:
        for tile in tiles:
            tile_id = str(tile["tile_id"])
            lat = (float(tile["lat_min"]) + float(tile["lat_max"])) / 2
            lon = (float(tile["lon_min"]) + float(tile["lon_max"])) / 2
            try:
                result[tile_id] = await _fetch_tile_forecast(client, lat, lon)
            except Exception as exc:
                logger.warning("Open-Meteo failed for %s: %s", tile_id, exc)
                result[tile_id] = _fallback_forecast(tile_id, lat, lon)

    return result


async def _fetch_tile_forecast(client: httpx.AsyncClient, lat: float, lon: float) -> Dict:
    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": "precipitation",
        "forecast_days": 3,
        "timezone": "UTC",
    }
    resp = await client.get(OPEN_METEO_URL, params=params)
    resp.raise_for_status()
    values = resp.json().get("hourly", {}).get("precipitation", [])
    if not values:
        raise RuntimeError("Open-Meteo returned no precipitation hours.")

    first_72 = [float(value or 0.0) for value in values[:72]]
    precip_24h = sum(first_72[:24])
    precip_48h = sum(first_72[:48])
    precip_72h = sum(first_72[:72])
    max_hourly = max(first_72, default=0.0)

    return {
        "precip_24h": round(precip_24h, 2),
        "precip_48h": round(precip_48h, 2),
        "precip_72h": round(precip_72h, 2),
        "max_hourly_precip": round(max_hourly, 2),
        "storm_risk": max_hourly >= 12 or precip_24h >= 65,
        "source": "open-meteo",
    }


def _fallback_forecast(tile_id: str, lat: float, lon: float) -> Dict:
    now = datetime.now(timezone.utc)
    day = now.timetuple().tm_yday
    monsoon_weight = 0.5 + 0.5 * math.sin(((day - 152) / 183) * math.pi)
    tile_seed = int(hashlib.sha256(f"{tile_id}:{now.strftime('%Y%m%d')}".encode()).hexdigest()[:8], 16)
    spatial = ((tile_seed % 1000) / 1000) * 0.35
    coastal = max(0.0, 1.0 - abs(lat - 21.95)) * 0.18
    intensity = min(1.0, 0.18 + monsoon_weight * 0.55 + spatial + coastal)

    precip_24h = 12 + intensity * 74
    precip_48h = precip_24h + 10 + intensity * 58
    precip_72h = precip_48h + 8 + intensity * 46
    max_hourly = 2 + intensity * 18

    return {
        "precip_24h": round(precip_24h, 2),
        "precip_48h": round(precip_48h, 2),
        "precip_72h": round(precip_72h, 2),
        "max_hourly_precip": round(max_hourly, 2),
        "storm_risk": intensity >= 0.68,
        "source": "fallback",
        "centroid": {"lat": round(lat, 4), "lon": round(lon, 4)},
    }
