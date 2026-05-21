import logging
import httpx
from datetime import datetime, timezone
from typing import Dict, List
from app.core.config import settings

logger = logging.getLogger(__name__)
async def trigger_n8n(
    high_risk_tiles: List[str],
    risk_scores: Dict[str, float],
) -> Dict:
    """
    POSTs flood alert data to the n8n webhook.
    n8n then handles: report generation → SMS → Google Sheets log.

    Args:
        high_risk_tiles: list of tile IDs above threshold
        risk_scores:     full dict of {tile_id: risk_score} for all tiles

    Returns:
        n8n response dict, or error dict if the call fails.
    """
    payload = {
        "high_risk_tiles": high_risk_tiles,
        "risk_scores":     risk_scores,
        "tile_count":      len(high_risk_tiles),
        "timestamp":       datetime.now(timezone.utc).isoformat(),
        "source":          "CascadeAI pipeline",
    }
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(settings.N8N_WEBHOOK_URL,
                json=payload,
                headers={"Content-Type": "application/json"},)
            resp.raise_for_status()
            logger.info(f"n8n triggered — {len(high_risk_tiles)} high-risk tiles.")
            return resp.json()
    except httpx.TimeoutException:
        logger.error("n8n webhook timed out — pipeline continues without it.")
        return {"status": "timeout", "triggered": False}
    except httpx.HTTPStatusError as e:
        logger.error(f"n8n returned {e.response.status_code}: {e.response.text}")
        return {"status": "error", "triggered": False, "detail": str(e)}
    except Exception as e:
        logger.error(f"n8n trigger failed unexpectedly: {e}")
        return {"status": "error", "triggered": False, "detail": str(e)}