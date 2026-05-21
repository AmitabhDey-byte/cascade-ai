from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
import certifi
import logging

from app.core.config import settings
from app.db.model import ConservationReport, RiskTile, SpeciesAlert


client: AsyncIOMotorClient | None = None
logger = logging.getLogger(__name__)


async def init_db() -> None:
    global client
    client = AsyncIOMotorClient(
        settings.MONGO_URI,
        serverSelectionTimeoutMS=5000,
        tlsCAFile=certifi.where(),
    )
    try:
        await init_beanie(
            database=client[settings.MONGO_DB_NAME],
            document_models=[RiskTile, SpeciesAlert, ConservationReport],
        )
    except Exception as exc:
        logger.warning("MongoDB initialization skipped: %s", exc)
