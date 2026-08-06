import numpy as np
from typing import Dict, List, Tuple

# Open-Meteo supplies live elevation per cell with each weather response. This
# neutral fallback only keeps the model operational if a provider omits it.
DEFAULT_ELEVATION_M = 10.0

FEATURE_NAMES = [
    "soil_moisture",
    "precip_24h",
    "precip_48h",
    "precip_72h",
    "max_hourly_precip",
    "storm_risk",
    "elevation",
]


def _elevation(meteo: Dict) -> float:
    value = meteo.get("elevation_m")
    try:
        return float(value) if value is not None else DEFAULT_ELEVATION_M
    except (TypeError, ValueError):
        return DEFAULT_ELEVATION_M


def build_feature_tensor(
    smap_data: Dict[str, float],
    meteo_data: Dict[str, Dict],
) -> Tuple[np.ndarray, List[str]]:
    """Combine NASA soil moisture and Open-Meteo data into model features."""
    tile_ids = sorted(smap_data.keys())
    rows = []

    for tile_id in tile_ids:
        meteo = meteo_data.get(tile_id, {})
        rows.append([
            smap_data.get(tile_id, 0.5),
            meteo.get("precip_24h", 0.0),
            meteo.get("precip_48h", 0.0),
            meteo.get("precip_72h", 0.0),
            meteo.get("max_hourly_precip", 0.0),
            float(meteo.get("storm_risk", False)),
            _elevation(meteo),
        ])

    return np.array(rows, dtype=np.float32), tile_ids


def build_single_tile_features(
    tile_id: str,
    soil_moisture: float,
    meteo: Dict,
) -> np.ndarray:
    """Build one seven-feature vector for a real-time single-cell forecast."""
    row = [
        soil_moisture,
        meteo.get("precip_24h", 0.0),
        meteo.get("precip_48h", 0.0),
        meteo.get("precip_72h", 0.0),
        meteo.get("max_hourly_precip", 0.0),
        float(meteo.get("storm_risk", False)),
        _elevation(meteo),
    ]
    return np.array([row], dtype=np.float32)


def generate_synthetic_training_data(n_samples: int = 800) -> Tuple[np.ndarray, np.ndarray]:
    """Generate provisional data until a labelled regional training set is available."""
    np.random.seed(42)
    x_rows, y_values = [], []

    for _ in range(n_samples):
        soil_moisture = np.random.uniform(0.1, 1.0)
        precip_24h = np.random.uniform(0, 80)
        precip_48h = precip_24h + np.random.uniform(0, 60)
        precip_72h = precip_48h + np.random.uniform(0, 40)
        max_hourly = np.random.uniform(0, 30)
        storm_risk = float(max_hourly > 10)
        elevation = np.random.uniform(1.0, 300.0)

        risk = (
            0.30 * soil_moisture
            + 0.20 * min(precip_24h / 80, 1.0)
            + 0.15 * min(precip_48h / 120, 1.0)
            + 0.10 * min(precip_72h / 160, 1.0)
            + 0.15 * storm_risk
            + 0.10 * (1 - min(elevation / 300.0, 1.0))
        )
        risk = float(np.clip(risk + np.random.normal(0, 0.05), 0.0, 1.0))

        x_rows.append([
            soil_moisture,
            precip_24h,
            precip_48h,
            precip_72h,
            max_hourly,
            storm_risk,
            elevation,
        ])
        y_values.append(risk)

    return np.array(x_rows, dtype=np.float32), np.array(y_values, dtype=np.float32)
