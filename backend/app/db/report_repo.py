from app.db.model import ConservationReport

_memory_reports: list[ConservationReport] = []


async def get_latest_report() -> ConservationReport | None:
    if not _memory_reports:
        return None
    return max(_memory_reports, key=lambda report: report.timestamp)


async def get_report_by_run_id(run_id: str) -> ConservationReport | None:
    reports = [report for report in _memory_reports if report.run_id == run_id]
    if not reports:
        return None
    return max(reports, key=lambda report: report.timestamp)


async def insert_report(report: ConservationReport) -> None:
    _memory_reports.append(report)
