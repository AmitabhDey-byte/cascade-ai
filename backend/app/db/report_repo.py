"""Conservation reports persisted in Neon Postgres."""

import json

from app.db import neon
from app.db.model import ConservationReport


async def get_latest_report() -> ConservationReport | None:
    if not neon.is_configured():
        return None
    row = await neon.fetch_one("SELECT * FROM conservation_reports ORDER BY timestamp DESC LIMIT 1")
    return _model_from_row(row) if row else None


async def get_report_by_run_id(run_id: str) -> ConservationReport | None:
    if not neon.is_configured():
        return None
    row = await neon.fetch_one(
        "SELECT * FROM conservation_reports WHERE run_id = %s ORDER BY timestamp DESC LIMIT 1",
        (run_id,),
    )
    return _model_from_row(row) if row else None


async def insert_report(report: ConservationReport) -> None:
    if not neon.is_configured():
        return
    await neon.execute(
        """
        INSERT INTO conservation_reports (
          report_id, run_id, timestamp, trigger, severity, tiles_affected, species_affected,
          flood_risk_summary, impact_summary, action_plan, dispatched_to, model_used
        ) VALUES (%s, %s, %s, %s, %s, %s::jsonb, %s::jsonb, %s, %s, %s::jsonb, %s::jsonb, %s)
        ON CONFLICT (report_id) DO UPDATE SET
          timestamp = EXCLUDED.timestamp, trigger = EXCLUDED.trigger, severity = EXCLUDED.severity,
          tiles_affected = EXCLUDED.tiles_affected, species_affected = EXCLUDED.species_affected,
          flood_risk_summary = EXCLUDED.flood_risk_summary, impact_summary = EXCLUDED.impact_summary,
          action_plan = EXCLUDED.action_plan, dispatched_to = EXCLUDED.dispatched_to,
          model_used = EXCLUDED.model_used
        """,
        (
            report.report_id, report.run_id, report.timestamp, report.trigger, report.severity,
            json.dumps(report.tiles_affected), json.dumps(report.species_affected),
            report.flood_risk_summary, report.impact_summary, json.dumps(report.action_plan),
            json.dumps(report.dispatched_to), report.model_used,
        ),
    )


def _model_from_row(row: dict) -> ConservationReport:
    return ConservationReport(
        report_id=row["report_id"], run_id=row["run_id"], timestamp=row["timestamp"],
        trigger=row["trigger"], severity=row["severity"],
        tiles_affected=_json_list(row.get("tiles_affected")),
        species_affected=_json_list(row.get("species_affected")),
        flood_risk_summary=row["flood_risk_summary"], impact_summary=row["impact_summary"],
        action_plan=_json_list(row.get("action_plan")), dispatched_to=_json_list(row.get("dispatched_to")),
        model_used=row["model_used"],
    )


def _json_list(value: object) -> list[str]:
    if isinstance(value, list):
        return [str(item) for item in value]
    if isinstance(value, str):
        try:
            loaded = json.loads(value)
            return [str(item) for item in loaded] if isinstance(loaded, list) else []
        except json.JSONDecodeError:
            return []
    return []
