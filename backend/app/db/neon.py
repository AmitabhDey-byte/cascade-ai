"""Small async wrapper around Neon Postgres for serverless request handlers.

The pooled Neon URL is supplied through DATABASE_URL. Connections are deliberately
short-lived: Vercel functions may scale horizontally, while Neon/PgBouncer handles
pooling safely at the database boundary.
"""

import asyncio
from typing import Any, Iterable, Sequence

from app.core.config import settings


class DatabaseUnavailable(RuntimeError):
    """Raised when a persistence operation is requested without Neon configured."""


def is_configured() -> bool:
    return bool(settings.DATABASE_URL.strip())


def _require_url() -> str:
    url = settings.DATABASE_URL.strip()
    if not url:
        raise DatabaseUnavailable("DATABASE_URL is not configured.")
    return url


def _fetch_all_sync(query: str, params: Sequence[Any] | None = None) -> list[dict[str, Any]]:
    from psycopg import connect
    from psycopg.rows import dict_row

    with connect(_require_url(), autocommit=True, row_factory=dict_row) as conn:
        with conn.cursor() as cursor:
            cursor.execute(query, params or ())
            return [dict(row) for row in cursor.fetchall()]


def _execute_sync(query: str, params: Sequence[Any] | None = None) -> None:
    from psycopg import connect

    with connect(_require_url(), autocommit=True) as conn:
        with conn.cursor() as cursor:
            cursor.execute(query, params or ())


def _execute_many_sync(query: str, rows: Iterable[Sequence[Any]]) -> None:
    from psycopg import connect

    with connect(_require_url(), autocommit=True) as conn:
        with conn.cursor() as cursor:
            cursor.executemany(query, list(rows))


async def fetch_all(query: str, params: Sequence[Any] | None = None) -> list[dict[str, Any]]:
    return await asyncio.to_thread(_fetch_all_sync, query, params)


async def fetch_one(query: str, params: Sequence[Any] | None = None) -> dict[str, Any] | None:
    rows = await fetch_all(query, params)
    return rows[0] if rows else None


async def execute(query: str, params: Sequence[Any] | None = None) -> None:
    await asyncio.to_thread(_execute_sync, query, params)


async def execute_many(query: str, rows: Iterable[Sequence[Any]]) -> None:
    await asyncio.to_thread(_execute_many_sync, query, rows)


async def healthcheck() -> bool:
    row = await fetch_one("SELECT 1 AS ok")
    return bool(row and row.get("ok") == 1)
