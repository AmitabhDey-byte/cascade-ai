from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import report, risk, species, chat, species_detection, integration_status
from app.core.database import init_db


app = FastAPI(title="CascadeAI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup() -> None:
    await init_db()


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(risk.router, prefix="/risk", tags=["risk"])
app.include_router(species.router)
app.include_router(report.router)
app.include_router(chat.router, prefix="/chat", tags=["chat"])
app.include_router(species_detection.router, tags=["species-detection"])
app.include_router(integration_status.router, tags=["status"])
