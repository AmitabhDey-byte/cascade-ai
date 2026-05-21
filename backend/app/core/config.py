from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # MongoDB
    MONGO_URI:              str   = "mongodb://localhost:27017"
    MONGO_DB_NAME:          str   = "cascadeai"

    # Anthropic
    ANTHROPIC_API_KEY:      str = ""

    # NASA EarthData
    NASA_EARTHDATA_TOKEN:   str = ""

    # n8n
    N8N_WEBHOOK_URL:        str   = "http://localhost:5678/webhook/cascade-alert"

    # Stellar
    STELLAR_SECRET_KEY:     str   = ""
    STELLAR_PUBLIC_KEY:     str   = ""

    # Pipeline
    RISK_THRESHOLD:         float = 0.70   # tiles above this trigger the alert
    BIOCLIP_CONFIDENCE_MIN: float = 0.65   # reject species ID below this

    class Config:
        env_file = ("backend/.env", ".env")


settings = Settings()
