import datetime
import uuid

_reports: list[dict] = []


def save_report(
    tile_id: str,
    risk_score: float,
    species_at_risk: list,
    report_text: str,
    action_plan: str,
    metadata: dict = None,
):
    report = {
        "id": uuid.uuid4().hex,
        "tile_id": tile_id,
        "risk_score": risk_score,
        "species_at_risk": species_at_risk,
        "report_text": report_text,
        "action_plan": action_plan,
        "timestamp": datetime.datetime.utcnow(),
        "metadata": metadata or {},
        "dispatched": False,
    }
    _reports.append(report)
    return report["id"]


def get_report_by_id(report_id: str):
    return next((report for report in _reports if report["id"] == report_id), None)


def get_reports_by_tile(tile_id: str):
    records = [report for report in _reports if report["tile_id"] == tile_id]
    return sorted(records, key=lambda report: report["timestamp"], reverse=True)


def get_undispatched_reports():
    return [report for report in _reports if not report["dispatched"]]


def mark_dispatched(report_id: str):
    report = get_report_by_id(report_id)
    if report:
        report["dispatched"] = True


def get_recent_reports(limit: int = 20):
    records = sorted(_reports, key=lambda report: report["timestamp"], reverse=True)
    return records[:limit]
