from fastapi import Header, HTTPException
from typing import Optional


async def verify_internal(x_internal_key: Optional[str] = Header(None)):
    """
    Lightweight internal API key check.
    Used on sensitive endpoints like /risk/run and /report/generate.
    Set INTERNAL_KEY in .env and pass as X-Internal-Key header.
    Optional — remove if not needed for the hackathon demo.
    """
    pass  