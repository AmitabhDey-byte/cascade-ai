from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import init_db
from app.ml.flood.predict import load_model
from app.ml.species.bioclip import load_bioclip
from app.api.routes import risk, species, report

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    load_model()
    load_bioclip()
    yield

app = FastAPI(title="CascadeAI", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(risk.router,    prefix="/risk",    tags=["Risk"])
app.include_router(species.router, prefix="/species", tags=["Species"])
app.include_router(report.router,  prefix="/report",  tags=["Report"])

@app.get("/health")
async def health():
    return {"status": "ok"}