import logging
import asyncio
import os
import tempfile
import numpy as np
import httpx
from datetime import datetime, timedelta
from typing import Dict, List

logger = logging.getLogger(__name__)
BBOX = {
    "lat_min": 21.5,
    "lat_max": 28.45,
    "lon_min": 85.75,
    "lon_max": 96.0,
}
CMR_URL        = "https://cmr.earthdata.nasa.gov/search/granules.json"
NSIDC_BASE     = "https://n5eil01u.ecs.nsidc.org"
SMAP_PRODUCT   = "SMAP/SPL3SMP_E.006"    
POWER_URL      = "https://power.larc.nasa.gov/api/temporal/daily/point"
GRID_DEGREES = 1.0
REGIONS = (
    ("west_bengal", "West Bengal", 21.5, 27.4, 85.75, 89.95),
    ("assam", "Assam", 24.0, 28.45, 89.6, 96.0),
)


def _build_tiles() -> List[Dict]:
    tiles: List[Dict] = []
    for slug, region, lat_start, lat_end, lon_start, lon_end in REGIONS:
        index = 1
        lat = lat_start
        while lat < lat_end:
            lon = lon_start
            while lon < lon_end:
                tiles.append({
                    "tile_id": f"{slug}_{index:02d}",
                    "region": region,
                    "lat_min": round(lat, 4),
                    "lat_max": round(min(lat + GRID_DEGREES, lat_end), 4),
                    "lon_min": round(lon, 4),
                    "lon_max": round(min(lon + GRID_DEGREES, lon_end), 4),
                })
                index += 1
                lon += GRID_DEGREES
            lat += GRID_DEGREES
    return tiles


TILES: List[Dict] = _build_tiles()
async def fetch_soil_moisture() -> Dict[str, float]:
    data, _ = await fetch_soil_moisture_with_source()
    return data


async def fetch_soil_moisture_with_source() -> tuple[Dict[str, float], str]:
    """
    Returns soil moisture (0.0 – 1.0) per tile.
    Tries SMAP first. Falls back to NASA POWER if SMAP fails.

    Returns:
        {
            "west_bengal_01": 0.42,
            "assam_01": 0.38,
            ...
        }
    """
    try:
        logger.info("Fetching SMAP soil moisture data...")
        data = await _fetch_smap()
        logger.info("SMAP fetch successful.")
        return data, "nasa-smap"
    except Exception as e:
        logger.warning(f"SMAP failed ({e}). Falling back to NASA POWER.")
        return await _fetch_power_fallback(), "nasa-power"
async def _fetch_smap() -> Dict[str, float]:
    """Find latest SMAP granule → download HDF5 → extract moisture per tile."""
    from app.core.config import settings

    token = settings.NASA_EARTHDATA_TOKEN
    if not token:
        raise RuntimeError("NASA_EARTHDATA_TOKEN is not configured.")

    granule_url = await _find_latest_granule(token)
    hdf5_path = await _download_granule(granule_url, token)
    try:
        result = _extract_per_tile(hdf5_path)
    finally:
        os.remove(hdf5_path)

    return result


async def _find_latest_granule(token: str) -> str:
    """
    Queries NASA CMR to find the download URL of the most recent
    SMAP SPL3SMP_E granule that covers the Assam and West Bengal envelope.
    """
    for days_back in range(0, 3):
        target_date = datetime.utcnow() - timedelta(days=days_back)
        date_str = target_date.strftime("%Y-%m-%d")

        params = {
            "short_name":       "SPL3SMP_E",
            "version":          "006",
            "temporal":         f"{date_str}T00:00:00Z,{date_str}T23:59:59Z",
            "bounding_box":     f"{BBOX['lon_min']},{BBOX['lat_min']},{BBOX['lon_max']},{BBOX['lat_max']}",
            "page_size":        1,
            "sort_key":         "-start_date",
        }

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(CMR_URL, params=params)
            resp.raise_for_status()
            items = resp.json().get("feed", {}).get("entry", [])

        if items:
            links = items[0].get("links", [])
            for link in links:
                if link.get("href", "").endswith(".h5"):
                    return link["href"]

    raise RuntimeError("No SMAP granule found for the last 3 days.")


async def _download_granule(url: str, token: str) -> str:
    """
    Downloads the HDF5 granule file to a temp path.
    Uses Bearer token auth for NASA EarthData.
    """
    headers = {"Authorization": f"Bearer {token}"}

    async with httpx.AsyncClient(
        timeout=120,
        follow_redirects=True,
        headers=headers
    ) as client:
        resp = await client.get(url)
        resp.raise_for_status()
    tmp = tempfile.NamedTemporaryFile(suffix=".h5", delete=False)
    tmp.write(resp.content)
    tmp.close()
    return tmp.name


def _extract_per_tile(hdf5_path: str) -> Dict[str, float]:
    """
    Opens the HDF5 file and extracts mean soil moisture for each tile.

    SMAP SPL3SMP_E structure:
        /Soil_Moisture_Retrieval_Data_AM/soil_moisture   — main values
        /Soil_Moisture_Retrieval_Data_AM/latitude
        /Soil_Moisture_Retrieval_Data_AM/longitude
    """
    result = {}

    import h5py

    with h5py.File(hdf5_path, "r") as f:
        group    = f["Soil_Moisture_Retrieval_Data_AM"]
        moisture = np.array(group["soil_moisture"])
        lats     = np.array(group["latitude"])
        lons     = np.array(group["longitude"])
        moisture = np.where(moisture == -9999.0, np.nan, moisture)

        for tile in TILES:
            mask = (
                (lats >= tile["lat_min"]) & (lats <= tile["lat_max"]) &
                (lons >= tile["lon_min"]) & (lons <= tile["lon_max"])
            )
            values = moisture[mask]
            valid  = values[~np.isnan(values)]

            if len(valid) > 0:
                mean_raw = float(np.mean(valid))
                normalised = round(min(max((mean_raw - 0.02) / 0.48, 0.0), 1.0), 4)
                result[tile["tile_id"]] = normalised
            else:
                logger.warning(f"No SMAP pixels for {tile['tile_id']}. Using 0.5 default.")
                result[tile["tile_id"]] = 0.5

    return result

async def _fetch_power_fallback() -> Dict[str, float]:
    """
    Uses NASA POWER API as fallback — no auth needed, returns JSON directly.
    GWETROOT = Root Zone Soil Wetness (0–1 scale, already normalised).
    One API call per tile using tile centroid coordinates.
    """
    date_str = (datetime.utcnow() - timedelta(days=1)).strftime("%Y%m%d")

    # Limit concurrency to remain polite to NASA POWER, while keeping a
    # state-wide 65-cell run inside a practical serverless time budget.
    async with httpx.AsyncClient(timeout=httpx.Timeout(8.0, connect=4.0)) as client:
        semaphore = asyncio.Semaphore(12)

        async def fetch_tile(tile: Dict) -> tuple[str, float]:
            lat_center = (tile["lat_min"] + tile["lat_max"]) / 2
            lon_center = (tile["lon_min"] + tile["lon_max"]) / 2
            params = {
                "parameters": "GWETROOT",
                "community": "AG",
                "longitude": lon_center,
                "latitude": lat_center,
                "start": date_str,
                "end": date_str,
                "format": "JSON",
            }
            try:
                async with semaphore:
                    resp = await client.get(POWER_URL, params=params)
                resp.raise_for_status()
                value = resp.json()["properties"]["parameter"]["GWETROOT"].get(date_str, 0.5)
                return tile["tile_id"], round(min(max(float(value), 0.0), 1.0), 4)
            except Exception as exc:
                logger.error("POWER fallback failed for %s: %s", tile["tile_id"], exc)
                return tile["tile_id"], 0.5

        return dict(await asyncio.gather(*(fetch_tile(tile) for tile in TILES)))
def get_tile_grid() -> List[Dict]:
    """Returns the full tile grid — used by scripts/seed_mongo.py."""
    return TILES
