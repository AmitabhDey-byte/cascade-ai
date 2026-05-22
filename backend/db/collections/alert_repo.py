import datetime
import uuid

_alerts: list[dict] = []


def log_alert(tile_id: str, risk_score: float, horizon: str, metadata: dict = None):
    alert = {
        "id": uuid.uuid4().hex,
        "tile_id": tile_id,
        "risk_score": risk_score,
        "horizon": horizon,
        "triggered": risk_score >= 0.7,
        "timestamp": datetime.datetime.utcnow(),
        "metadata": metadata or {},
    }
    _alerts.append(alert)
    return alert["id"]


def get_alerts_by_tile(tile_id: str):
    records = [alert for alert in _alerts if alert["tile_id"] == tile_id]
    return sorted(records, key=lambda alert: alert["timestamp"], reverse=True)


def get_triggered_alerts(limit: int = 50):
    records = [alert for alert in _alerts if alert["triggered"]]
    records.sort(key=lambda alert: alert["timestamp"], reverse=True)
    return records[:limit]


def get_alerts_in_range(start: datetime.datetime, end: datetime.datetime):
    return [alert for alert in _alerts if start <= alert["timestamp"] <= end]


def clear_old_alerts(days: int = 30):
    cutoff = datetime.datetime.utcnow() - datetime.timedelta(days=days)
    before = len(_alerts)
    _alerts[:] = [alert for alert in _alerts if alert["timestamp"] >= cutoff]
    return before - len(_alerts)
