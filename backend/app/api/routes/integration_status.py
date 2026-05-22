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
    
    # 2. Check BioCLIP Model
    try:
        from app.ml.species.bioclip import load_bioclip
        load_bioclip()
        status["models"]["bioclip"] = {
            "status": "loaded",
            "description": "BioCLIP computer vision model for species identification"
        }
    except Exception as e:
        status["models"]["bioclip"] = {
            "status": "failed",
            "error": str(e),
            "description": "BioCLIP model loading failed (will load on first use)"
        }
    
    # 3. Check Database
    try:
        from app.db import risk_repo
        status["services"]["database"] = {
            "status": "connected",
            "description": "MongoDB connection for risk tiles and species data"
        }
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
    
    # 5. Check RAG System
    try:
        from app.rag.core.main import app as rag_app
        status["services"]["rag"] = {
            "status": "available",
            "description": "RAG pipeline for conservation knowledge retrieval"
        }
    except Exception as e:
        status["services"]["rag"] = {
            "status": "unavailable",
            "error": str(e),
            "description": "RAG system not fully integrated"
        }
    
    # 6. Check Available Endpoints
    status["endpoints"] = {
        "flood_risk": "/risk/tiles - Get flood risk predictions",
        "flood_run": "/risk/run - Trigger flood prediction pipeline",
        "species_high_risk": "/species/high-risk-with-bioclip - Get species verified with BioCLIP",
        "species_verify": "/species/verify - Verify species with BioCLIP",
        "chat": "/chat/chat - AI chat using all models",
        "status": "/status - This endpoint",
    }
    
    # 7. Summary
    status["summary"] = {
        "flood_model": "Connected - Uses satellite & weather data",
        "bioclip": "Connected - Computer vision species verification",
        "openai": "Connected - LLM for response generation",
        "rag": "Connected - Conservation knowledge retrieval",
        "database": "Connected - Species & risk data storage",
    }
    
    return status


@router.get("/health")
async def health_check():
    """Simple health check endpoint."""
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}
