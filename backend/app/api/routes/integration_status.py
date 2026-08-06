"""Integration status and diagnostics endpoint."""
import logging
from datetime import datetime
from fastapi import APIRouter

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/status")
async def get_system_status():
    """
    Returns integration status for all AI models and systems.
    Useful for diagnosing connection issues.
    """
    status = {
        "timestamp": datetime.utcnow().isoformat(),
        "services": {},
        "models": {},
        "healthy": True,
    }
    
    # 1. Check Flood Prediction Model
    try:
        from app.ml.flood.predict import load_model
        load_model()
        status["models"]["flood_prediction"] = {
            "status": "loaded",
            "description": "ML flood risk prediction model from joblib"
        }
    except Exception as e:
        status["models"]["flood_prediction"] = {
            "status": "failed",
            "error": str(e),
            "description": "Flood model loading failed"
        }
        status["healthy"] = False
    
    # 2. Check BioCLIP configuration. Loading it here would download a large
    # model during a lightweight status probe, which is unsafe for serverless.
    try:
        from app.core.config import settings
        if settings.BIOCLIP_ENABLED:
            status["models"]["bioclip"] = {
                "status": "on_demand",
                "description": "BioCLIP is enabled and loads only when /species/verify is called",
            }
        else:
            status["models"]["bioclip"] = {
                "status": "disabled",
                "description": "Disabled for this deployment; use an ML worker for photo verification",
            }
    except Exception as e:
        status["models"]["bioclip"] = {
            "status": "failed",
            "error": str(e),
            "description": "BioCLIP configuration could not be checked"
        }
    
    # 3. Check Neon Postgres persistence
    try:
        from app.db import neon
        if not neon.is_configured():
            status["services"]["database"] = {
                "status": "not_configured",
                "description": "DATABASE_URL is absent; this local process uses the explicit demo fallback.",
            }
        elif await neon.healthcheck():
            status["services"]["database"] = {
                "status": "connected",
                "provider": "neon-postgres",
                "description": "Forecast runs, risk tiles, species, reports, and chat history are durable.",
            }
        else:
            raise RuntimeError("Neon health check returned an unexpected response.")
    except Exception as e:
        status["services"]["database"] = {
            "status": "failed",
            "error": str(e)
        }
        status["healthy"] = False
    
    # 4. Check OpenAI API
    try:
        from app.core.config import settings
        if settings.OPENAI_API_KEY:
            status["services"]["openai"] = {
                "status": "configured",
                "model": settings.OPENAI_MODEL or "gpt-4",
                "description": "OpenAI API for response generation"
            }
        else:
            status["services"]["openai"] = {
                "status": "not_configured",
                "description": "OpenAI API key not set - will use fallback responses"
            }
    except Exception as e:
        status["services"]["openai"] = {
            "status": "error",
            "error": str(e)
        }
    
    # 5. RAG is intentionally moved to the optional ML worker dependency set.
    status["services"]["rag"] = {
        "status": "worker_required",
        "description": "Vercel uses a concise local conservation fallback; deploy the ML worker to enable vector retrieval",
    }
    
    # 6. Check Available Endpoints
    status["endpoints"] = {
        "flood_risk": "/risk/tiles - Get flood risk predictions",
        "flood_run": "/risk/run - Trigger flood prediction pipeline",
        "species_high_risk": "/species/high-risk - Get species in the current high-risk forecast",
        "species_verify": "/species/verify - Verify species with BioCLIP",
        "chat": "/chat/chat - AI chat using all models",
        "status": "/status - This endpoint",
    }
    
    # 7. Summary
    status["summary"] = {
        "flood_model": "Available for on-demand forecast runs",
        "bioclip": "Optional ML worker capability",
        "openai": "Optional LLM response generation with local fallback",
        "rag": "Optional ML worker capability",
        "database": "Neon Postgres when DATABASE_URL is configured; demo fallback only for local development",
    }
    
    return status


@router.get("/health")
async def health_check():
    """Simple health check endpoint."""
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}
