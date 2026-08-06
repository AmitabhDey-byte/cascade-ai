from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Neon Postgres. Use the pooled `postgresql://...-pooler...` URL supplied
    # by Neon so Vercel functions do not exhaust direct connections.
    DATABASE_URL:           str = ""

    # OpenAI
    OPENAI_API_KEY:         str = ""
    OPENAI_MODEL:           str = "gpt-5.4-mini"

    # NASA EarthData
    NASA_EARTHDATA_TOKEN:   str = ""

    # n8n
    N8N_WEBHOOK_URL:        str   = ""
    N8N_REPORT_WEBHOOK_URL: str   = ""

    # Browser deployments normally use the Next.js API proxy, but this also
    # permits deliberate direct access from local development or another UI.
    CORS_ORIGINS:            str   = "http://localhost:3000,http://127.0.0.1:3000"

    # BioCLIP downloads a large model and is unsuitable for a default
    # serverless cold start. Enable it only on a worker with the model/deps.
    BIOCLIP_ENABLED:         bool  = False

    # Stellar
    STELLAR_SECRET_KEY:     str   = ""
    STELLAR_PUBLIC_KEY:     str   = ""

    # Pipeline
    RISK_THRESHOLD:         float = 0.70   # tiles above this trigger the alert
    BIOCLIP_CONFIDENCE_MIN: float = 0.65   # reject species ID below this

    class Config:
        env_file = ("backend/.env", ".env")

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip().rstrip("/") for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


settings = Settings()
