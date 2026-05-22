import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


async def trigger_n8n(
    high_risk_tiles: List[str],
    risk_scores: Dict[str, float],
    run_id: Optional[str] = None,
) -> Dict:
    """
    POST flood alert data to n8n.
    n8n can then generate the report, send WhatsApp/SMS, and log the cycle.
    """
    payload = {
        "run_id": run_id,
        "high_risk_tiles": high_risk_tiles,
        "risk_scores": risk_scores,
        "tile_count": len(high_risk_tiles),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "source": "CascadeAI pipeline",
    }
    payload["risk_summary"] = _risk_summary(high_risk_tiles, risk_scores)
    payload["ranger_instructions"] = _ranger_instructions(high_risk_tiles)
    payload["whatsapp_message"] = (
        "CASCADEAI FLOOD ALERT\n\n"
        f"{payload['risk_summary']}\n\n"
        f"Immediate action: {payload['ranger_instructions']}\n\n"
        f"Run: {run_id or 'manual'}\n"
        f"Time: {payload['timestamp']}"
    )

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                settings.N8N_WEBHOOK_URL,
                json=payload,
                headers={"Content-Type": "application/json"},
            )
            resp.raise_for_status()
            logger.info("n8n triggered for %s high-risk areas.", len(high_risk_tiles))
            try:
                return {"triggered": True, **resp.json()}
            except ValueError:
                return {"triggered": True, "status": resp.status_code}
    except httpx.TimeoutException:
        logger.error("n8n webhook timed out; pipeline continues without dispatch.")
        return {"status": "timeout", "triggered": False}
    except httpx.HTTPStatusError as exc:
        logger.error("n8n returned %s: %s", exc.response.status_code, exc.response.text)
        return {"status": "error", "triggered": False, "detail": str(exc)}
    except Exception as exc:
        logger.error("n8n trigger failed unexpectedly: %s", exc)
        return {"status": "error", "triggered": False, "detail": str(exc)}


async def dispatch_report(report_id: str, severity: str) -> Dict:
    """
    Optional report-level webhook for manual report generation.
    Leave N8N_REPORT_WEBHOOK_URL empty when the alert webhook already owns dispatch.
    """
    if not settings.N8N_REPORT_WEBHOOK_URL:
        return {"status": "skipped", "triggered": False, "reason": "N8N_REPORT_WEBHOOK_URL not configured"}

    payload = {
        "report_id": report_id,
        "severity": severity,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "source": "CascadeAI report generator",
    }

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(settings.N8N_REPORT_WEBHOOK_URL, json=payload)
            resp.raise_for_status()
            try:
                return {"triggered": True, **resp.json()}
            except ValueError:
                return {"triggered": True, "status": resp.status_code}
    except Exception as exc:
        logger.error("Report dispatch failed: %s", exc)
        return {"status": "error", "triggered": False, "detail": str(exc)}


def _risk_summary(high_risk_tiles: List[str], risk_scores: Dict[str, float]) -> str:
    top = sorted(
        ((tile_id, risk_scores.get(tile_id, 0.0)) for tile_id in high_risk_tiles),
        key=lambda item: item[1],
        reverse=True,
    )
    if not top:
        return "No monitored areas are above the flood alert threshold."
    top_text = ", ".join(f"{tile_id}={score:.2f}" for tile_id, score in top[:4])
    return f"{len(high_risk_tiles)} monitored areas are above threshold. Highest risk: {top_text}."


def _ranger_instructions(high_risk_tiles: List[str]) -> str:
    if not high_risk_tiles:
        return "Continue normal monitoring cycle."
    first = high_risk_tiles[0]
    return (
        f"Deploy first patrol to {first}, keep teams on elevated routes, "
        "confirm water level and species movement, then send a 30-minute WhatsApp field update."
    )
