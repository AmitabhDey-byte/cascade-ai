import asyncio
import logging
from typing import Any, Dict, Iterable, List

from app.core.config import settings
from app.services.openai_report import generate_conservation_report

logger = logging.getLogger(__name__)


async def build_report(run_id: str, tiles: Iterable[Any], species: Iterable[Any]) -> Dict[str, Any]:
    """Build the RAG context and generate an OpenAI conservation report."""
    tile_dicts = [_to_dict(tile) for tile in tiles]
    high_risk_tiles = [
        tile for tile in tile_dicts
        if float(tile.get("risk_score", tile.get("score", 0.0)) or 0.0) >= settings.RISK_THRESHOLD
    ]
    species_dicts = [_to_dict(item) for item in species]

    query = _build_query(run_id, high_risk_tiles, species_dicts)
    rag_context = await _retrieve_context(query)

    generated = await generate_conservation_report(
        tiles=high_risk_tiles or tile_dicts,
        species=species_dicts,
        rag_context=rag_context,
    )

    action_plan = generated.get("action_plan", [])
    if isinstance(action_plan, str):
        action_plan = [line.strip(" -0123456789.") for line in action_plan.splitlines() if line.strip()]

    return {
        "flood_summary": generated.get("risk_summary", ""),
        "impact_summary": generated.get("estimated_impact") or generated.get("priority_species", ""),
        "action_plan": action_plan or [generated.get("ranger_instructions", "Review dashboard and deploy patrols.")],
        "species_affected": generated.get("species_affected", []),
        "ranger_instructions": generated.get("ranger_instructions", ""),
        "priority_species": generated.get("priority_species", ""),
        "model_used": generated.get("model_used", settings.OPENAI_MODEL),
    }


async def _retrieve_context(query: str) -> str:
    try:
        from rag.core.retriever import retrieve_context

        chunks = await asyncio.to_thread(retrieve_context, query, 4)
        return "\n\n".join(chunks)
    except Exception as exc:
        logger.warning("RAG context unavailable, using concise fallback context: %s", exc)
        return (
            "Sundarbans response priorities: protect ranger safety, avoid animal displacement into villages, "
            "prioritize Critically Endangered and Endangered species, monitor freshwater/estuarine corridors, "
            "and coordinate alerts through local field teams."
        )


def _build_query(run_id: str, tiles: List[Dict[str, Any]], species: List[Dict[str, Any]]) -> str:
    species_names = ", ".join(
        str(item.get("name") or item.get("latin") or item.get("species_name"))
        for item in species[:8]
        if item.get("name") or item.get("latin") or item.get("species_name")
    )
    tile_ids = ", ".join(str(tile.get("tile_id")) for tile in tiles[:8] if tile.get("tile_id"))
    return f"Sundarbans flood conservation response {run_id} {tile_ids} {species_names}"


def _to_dict(value: Any) -> Dict[str, Any]:
    if hasattr(value, "model_dump"):
        return value.model_dump(mode="json")
    if isinstance(value, dict):
        return value
    return dict(value)
