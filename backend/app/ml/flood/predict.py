import os
import logging
import joblib
import numpy as np
from typing import Dict, List
from app.ml.flood.features import build_feature_tensor
from app.core.config import settings

logger = logging.getLogger(__name__)

WEIGHTS_PATH = os.path.join(os.path.dirname(__file__), "..", "weights", "flood_model.joblib")

# Module-level model cache — loaded once, reused on every call
_model = None


def load_model():
    """Loads model from disk into memory. Called once at startup."""
    global _model
    if not os.path.exists(WEIGHTS_PATH):
        raise FileNotFoundError(
            f"Model not found at {WEIGHTS_PATH}. "
            "Run scripts/train_flood_model.py first."
        )
    _model = joblib.load(WEIGHTS_PATH)
    logger.info("Flood risk model loaded successfully.")


def predict_flood_risk(
    smap_data: Dict[str, float],
    meteo_data: Dict[str, Dict],
) -> Dict[str, Dict]:
    """
    Runs flood risk inference for all tiles.

    Args:
        smap_data:  {tile_id: soil_moisture}
        meteo_data: {tile_id: {precip_24h, precip_48h, ...}}

    Returns:
        {
            "sundarbans_tile_01": {
                "risk_score": 0.82,
                "is_high_risk": True,
                "flood_probability_24h": 0.71,
                "flood_probability_48h": 0.85,
                "flood_probability_72h": 0.90,
            },
            ...
        }
    """
    global _model
    if _model is None:
        load_model()

    X, tile_ids = build_feature_tensor(smap_data, meteo_data)

    # Main risk score prediction
    risk_scores = _model.predict(X)
    risk_scores = np.clip(risk_scores, 0.0, 1.0)

    result = {}
    for i, tile_id in enumerate(tile_ids):
        risk  = float(risk_scores[i])
        meteo = meteo_data.get(tile_id, {})

        # Derive horizon probabilities from base risk + precipitation windows
        # Simple scaling — replace with separate models if you have time
        p24 = float(np.clip(risk * (meteo.get("precip_24h", 0) / 80 + 0.5), 0, 1))
        p48 = float(np.clip(risk * (meteo.get("precip_48h", 0) / 120 + 0.6), 0, 1))
        p72 = float(np.clip(risk * (meteo.get("precip_72h", 0) / 160 + 0.7), 0, 1))

        result[tile_id] = {
            "risk_score":             round(risk, 4),
            "is_high_risk":           risk >= settings.RISK_THRESHOLD,
            "flood_probability_24h":  round(p24, 4),
            "flood_probability_48h":  round(p48, 4),
            "flood_probability_72h":  round(p72, 4),
        }

    return result