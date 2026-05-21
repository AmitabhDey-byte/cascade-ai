import os
import tempfile
import logging
import numpy as np
import httpx
import h5py
from datetime import datetime, timedelta
from typing import Dict, List

logger = logging.getLogger(__name__)
BBOX = {
    "lat_min": 21.5,
    "lat_max": 22.5,
    "lon_min": 88.0,
    "lon_max": 89.5,
}
CMR_URL        = "https://cmr.earthdata.nasa.gov/search/granules.json"
NSIDC_BASE     = "https://n5eil01u.ecs.nsidc.org"
SMAP_PRODUCT   = "SMAP/SPL3SMP_E.006"    
POWER_URL      = "https://power.larc.nasa.gov/api/temporal/daily/point"
TILES: List[Dict] = [
    {"tile_id": "sundarbans_tile_01", "lat_min": 21.5, "lat_max": 22.0, "lon_min": 88.0, "lon_max": 88.5},
    {"tile_id": "sundarbans_tile_02", "lat_min": 21.5, "lat_max": 22.0, "lon_min": 88.5, "lon_max": 89.0},
    {"tile_id": "sundarbans_tile_03", "lat_min": 21.5, "lat_max": 22.0, "lon_min": 89.0, "lon_max": 89.5},
    {"tile_id": "sundarbans_tile_04", "lat_min": 22.0, "lat_max": 22.5, "lon_min": 88.0, "lon_max": 88.5},
    {"tile_id": "sundarbans_tile_05", "lat_min": 22.0, "lat_max": 22.5, "lon_min": 88.5, "lon_max": 89.0},
    {"tile_id": "sundarbans_tile_06", "lat_min": 22.0, "lat_max": 22.5, "lon_min": 89.0, "lon_max": 89.5},
]
async def fetch_soil_moisture() -> Dict[str, float]:
    """
    Returns soil moisture (0.0 – 1.0) per tile.
    Tries SMAP first. Falls back to NASA POWER if SMAP fails.

    Returns:
        {
            "sundarbans_tile_01": 0.42,
            "sundarbans_tile_02": 0.38,
            ...
        }
    """
    try:
        logger.info("Fetching SMAP soil moisture data...")
        data = await _fetch_smap()
        logger.info("SMAP fetch successful.")
        return data
    except Exception as e:
        logger.warning(f"SMAP failed ({e}). Falling back to NASA POWER.")
        return await _fetch_power_fallback()
async def _fetch_smap() -> Dict[str, float]:
    """Find latest SMAP granule → download HDF5 → extract moisture per tile."""
    from app.core.config import settings

    token = settings.NASA_EARTHDATA_TOKEN
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
    SMAP SPL3SMP_E granule that covers the Sundarbans bounding box.
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
    result = {}
    date_str = (datetime.utcnow() - timedelta(days=1)).strftime("%Y%m%d")

    async with httpx.AsyncClient(timeout=30) as client:
        for tile in TILES:
            lat_center = (tile["lat_min"] + tile["lat_max"]) / 2
            lon_center = (tile["lon_min"] + tile["lon_max"]) / 2

            params = {
                "parameters": "GWETROOT",
                "community":  "AG",
                "longitude":  lon_center,
                "latitude":   lat_center,
                "start":      date_str,
                "end":        date_str,
                "format":     "JSON",
            }

            try:
                resp = await client.get(POWER_URL, params=params)
                resp.raise_for_status()
                data = resp.json()
                value = (
                    data["properties"]["parameter"]["GWETROOT"]
                    .get(date_str, 0.5)
                )
                result[tile["tile_id"]] = round(min(max(float(value), 0.0), 1.0), 4)

            except Exception as e:
                logger.error(f"POWER fallback failed for {tile['tile_id']}: {e}")
                result[tile["tile_id"]] = 0.5 

    return result
def get_tile_grid() -> List[Dict]:
    """Returns the full tile grid — used by scripts/seed_mongo.py."""
    return TILES