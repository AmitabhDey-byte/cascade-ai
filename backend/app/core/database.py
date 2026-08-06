import logging

from app.db import neon

logger = logging.getLogger(__name__)


async def init_db() -> None:
    if not neon.is_configured():
        logger.warning("DATABASE_URL is not configured; local demo fallback is active.")
        return

    if not await neon.healthcheck():
        raise RuntimeError("Neon Postgres health check failed.")

    logger.info("Neon Postgres connection verified.")
