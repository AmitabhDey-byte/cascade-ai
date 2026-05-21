from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    N8N_WEBHOOK_URL: str

    class Config:
        env_file = ".env"


settings = Settings()