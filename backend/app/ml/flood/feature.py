import numpy as np
from typing import Dict, List, Tuple

# Static elevation per tile (metres) — pre-fetched from SRTM
# Low elevation = higher flood risk at same moisture/rain levels
TILE_ELEVATION: Dict[str, float] = {
    "sundarbans_tile_01": 3.2,
    "sundarbans_tile_02": 2.8,
    "sundarbans_tile_03": 4.1,
    "sundarbans_tile_04": 2.1,
    "sundarbans_tile_05": 1.9,   # lowest — highest natural risk
    "sundarbans_tile_06": 3.6,
}

FEATURE_NAMES = [
    "soil_moisture",
    "precip_24h",
    "precip_48h",
    "precip_72h",
    "max_hourly_precip",
    "storm_risk",
    "elevation",
]


def build_feature_tensor(
    smap_data: Dict[str, float],
    meteo_data: Dict[str, Dict],
) -> Tuple[np.ndarray, List[str]]:
    """
    Combines SMAP and Open-Meteo data into a feature matrix.

    Args:
        smap_data:  {tile_id: soil_moisture} from nasa_smap.fetch_soil_moisture()
        meteo_data: {tile_id: {...}} from open_meteo.fetch_precipitation_forecast()

    Returns:
        (X, tile_ids)
        X        — numpy array shape (n_tiles, 7)
        tile_ids — list of tile IDs in same row order as X
    """
    tile_ids = sorted(smap_data.keys())
    rows = []

    for tile_id in tile_ids:
        moisture  = smap_data.get(tile_id, 0.5)
        meteo     = meteo_data.get(tile_id, {})
        elevation = TILE_ELEVATION.get(tile_id, 3.0)

        row = [
            moisture,
            meteo.get("precip_24h", 0.0),
            meteo.get("precip_48h", 0.0),
            meteo.get("precip_72h", 0.0),
            meteo.get("max_hourly_precip", 0.0),
            float(meteo.get("storm_risk", False)),
            elevation,
        ]
        rows.append(row)

    X = np.array(rows, dtype=np.float32)
    return X, tile_ids


def build_single_tile_features(
    tile_id: str,
    soil_moisture: float,
    meteo: Dict,
) -> np.ndarray:
    """
    Builds a feature vector for a single tile.
    Used for real-time prediction on one tile.
    Returns shape (1, 7).
    """
    elevation = TILE_ELEVATION.get(tile_id, 3.0)
    row = [
        soil_moisture,
        meteo.get("precip_24h", 0.0),
        meteo.get("precip_48h", 0.0),
        meteo.get("precip_72h", 0.0),
        meteo.get("max_hourly_precip", 0.0),
        float(meteo.get("storm_risk", False)),
        elevation,
    ]
    return np.array([row], dtype=np.float32)


def generate_synthetic_training_data(n_samples: int = 800) -> Tuple[np.ndarray, np.ndarray]:
    """
    Generates synthetic training data for initial model training.
    Use this if you don't have historical SMAP + Open-Meteo data yet.

    Physics-based rules:
    - High soil moisture + high rain = high flood risk
    - Low elevation amplifies risk
    - Storm risk is a strong positive signal

    Returns:
        (X, y) where y is flood risk 0.0–1.0
    """
    np.random.seed(42)
    X_list, y_list = [], []

    for _ in range(n_samples):
        soil_moisture      = np.random.uniform(0.1, 1.0)
        precip_24h         = np.random.uniform(0, 80)
        precip_48h         = precip_24h + np.random.uniform(0, 60)
        precip_72h         = precip_48h + np.random.uniform(0, 40)
        max_hourly         = np.random.uniform(0, 30)
        storm_risk         = float(max_hourly > 10)
        elevation          = np.random.uniform(1.0, 8.0)

    
        risk = (
            0.30 * soil_moisture +
            0.20 * min(precip_24h / 80, 1.0) +
            0.15 * min(precip_48h / 120, 1.0) +
            0.10 * min(precip_72h / 160, 1.0) +
            0.15 * storm_risk +
            0.10 * (1 - min(elevation / 8.0, 1.0))  
        )
        risk = float(np.clip(risk + np.random.normal(0, 0.05), 0.0, 1.0))

        X_list.append([soil_moisture, precip_24h, precip_48h, precip_72h,
                        max_hourly, storm_risk, elevation])
        y_list.append(risk)

    return np.array(X_list, dtype=np.float32), np.array(y_list, dtype=np.float32)