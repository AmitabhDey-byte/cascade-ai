from datetime import datetime, timedelta
from typing import Dict, List, Optional


def process_observations(raw_observations: List[Dict]) -> List[Dict]:
    """
    Cleans and filters raw GBIF observations before passing to BioCLIP.

    Filters out:
    - Observations older than 6 months
    - Observations with no photo URL
    - Duplicate species from the same location
    - Observations with missing coordinates

    Args:
        raw_observations: list of dicts from services/gbif.py

    Returns:
        Cleaned list ready for BioCLIP verification.
    """
    cutoff = datetime.utcnow() - timedelta(days=180)
    seen   = set()   # deduplicate by (species, rounded lat/lon)
    result = []

    for obs in raw_observations:
        # Must have a photo
        if not obs.get("photo_url"):
            continue

        # Must have coordinates
        if obs.get("latitude") is None or obs.get("longitude") is None:
            continue

        # Must have a species name
        species = obs.get("species_name") or obs.get("scientific_name")
        if not species or species.strip() == "":
            continue

        # Date filter
        date_str = obs.get("observation_date", "")
        if date_str:
            try:
                obs_date = datetime.fromisoformat(date_str[:10])
                if obs_date < cutoff:
                    continue
            except ValueError:
                pass  # keep if date is unparseable

        # Deduplicate — same species within 0.1° lat/lon grid
        lat_key = round(float(obs["latitude"]), 1)
        lon_key = round(float(obs["longitude"]), 1)
        key     = (species.lower(), lat_key, lon_key)
        if key in seen:
            continue
        seen.add(key)

        result.append({
            "gbif_id":          obs.get("gbif_id", ""),
            "species_name":     species,
            "scientific_name":  obs.get("scientific_name", species),
            "common_name":      obs.get("common_name", ""),
            "latitude":         float(obs["latitude"]),
            "longitude":        float(obs["longitude"]),
            "photo_url":        obs["photo_url"],
            "observation_date": obs.get("observation_date", ""),
        })

    return result