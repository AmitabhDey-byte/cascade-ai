import logging

logger = logging.getLogger(__name__)


async def init_db() -> None:
    logger.info("Database initialization skipped; using in-memory repositories.")
