import json
import logging
from typing import Any, Dict, List

from app.core.config import settings

try:
    from openai import AsyncOpenAI
except ImportError:  # pragma: no cover - handled at runtime for degraded installs
    AsyncOpenAI = None  # type: ignore

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are CascadeAI, an expert conservation intelligence system
for the Sundarbans delta. Analyze flood risk, weather, and endangered species
data to generate urgent, field-ready conservation reports for rangers.

Return only valid JSON. Be specific, operational, and concise."""


async def generate_conservation_report(
    tiles: List[Dict[str, Any]],
    species: List[Dict[str, Any]],
    rag_context: str,
) -> Dict[str, Any]:
    """Generate a conservation action report with OpenAI, with a local fallback."""
    if AsyncOpenAI is None or not settings.OPENAI_API_KEY:
        logger.warning("OpenAI is not configured; using local report fallback.")
        return _local_report(tiles, species)

    prompt = _build_prompt(tiles, species, rag_context)
    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    try:
        response = await client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
            max_completion_tokens=1400,
        )
        raw_text = response.choices[0].message.content or "{}"
        parsed = _parse_response(raw_text)
        parsed.setdefault("model_used", settings.OPENAI_MODEL)
        return parsed
    except Exception as exc:
        logger.error("OpenAI report generation failed: %s", exc)
        fallback = _local_report(tiles, species)
        fallback["model_used"] = f"{settings.OPENAI_MODEL} unavailable; local fallback"
        return fallback


def _build_prompt(tiles: List[Dict[str, Any]], species: List[Dict[str, Any]], rag_context: str) -> str:
    tile_lines = "\n".join(
        f"- {tile.get('tile_id')}: risk={_num(tile, 'risk_score', 'score'):.2f}, "
        f"24h={_num(tile, 'flood_probability_24h'):.0%}, "
        f"48h={_num(tile, 'flood_probability_48h'):.0%}, "
        f"72h={_num(tile, 'flood_probability_72h'):.0%}, "
        f"soil_moisture={tile.get('soil_moisture', 'unknown')}, "
        f"precip_72h_mm={tile.get('precipitation_mm', 'unknown')}"
        for tile in tiles
    )

    species_lines = "\n".join(
        f"- {item.get('name') or item.get('species_name')} "
        f"({item.get('latin') or item.get('scientific_name', 'unknown')}); "
        f"IUCN={item.get('iucn_status', 'Unknown')}; "
        f"area={item.get('tile_id', 'unknown')}; "
        f"confidence={item.get('bioclip_confidence') or item.get('confidence_score') or 'unknown'}"
        for item in _sort_species(species)
    )

    return f"""
Generate a conservation response report for the Sundarbans flood forecast.

High-risk monitored areas:
{tile_lines or "- No tile rows supplied"}

Species observations in affected areas:
{species_lines or "- No species observations found"}

Retrieved conservation context:
{rag_context or "Use established flood response practice for mangrove habitats and threatened fauna."}

Return only this JSON object:
{{
  "risk_summary": "2-3 sentence flood threat summary",
  "species_affected": ["species common or scientific names"],
  "priority_species": "single highest-priority species and why",
  "action_plan": ["ordered response step 1", "ordered response step 2", "ordered response step 3"],
  "ranger_instructions": "short field instructions suitable for WhatsApp",
  "estimated_impact": "estimated habitat/species impact"
}}
"""


def _parse_response(raw: str) -> Dict[str, Any]:
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        lines = cleaned.splitlines()
        cleaned = "\n".join(line for line in lines if not line.strip().startswith("```"))

    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        logger.error("OpenAI returned non-JSON report text: %s", raw[:300])
        return {
            "risk_summary": "OpenAI returned a report, but it could not be parsed as JSON.",
            "species_affected": [],
            "priority_species": "Unknown",
            "action_plan": [raw],
            "ranger_instructions": "Review the dashboard before field deployment.",
            "estimated_impact": "Unknown",
        }

    if isinstance(parsed.get("action_plan"), str):
        parsed["action_plan"] = _split_steps(parsed["action_plan"])
    return parsed


def _local_report(tiles: List[Dict[str, Any]], species: List[Dict[str, Any]]) -> Dict[str, Any]:
    sorted_tiles = sorted(tiles, key=lambda tile: _num(tile, "risk_score", "score"), reverse=True)
    top_tile = sorted_tiles[0] if sorted_tiles else {}
    top_score = _num(top_tile, "risk_score", "score")
    priority_species = _sort_species(species)
    names = [item.get("name") or item.get("species_name") or item.get("latin") for item in priority_species]
    names = [name for name in names if name]
    priority_name = names[0] if names else "No confirmed species observation"

    return {
        "risk_summary": (
            f"Flood risk is highest in {top_tile.get('tile_id', 'the monitored basin')} "
            f"with a score of {top_score:.2f}. Areas above threshold need immediate patrol triage, "
            "because soil moisture and 72-hour precipitation are elevating inundation probability."
        ),
        "species_affected": names,
        "priority_species": f"{priority_name}; prioritize CR/EN/VU status and sightings inside high-risk areas.",
        "action_plan": [
            "Move patrols to the highest-risk area first and verify safe approach routes before entering low ground.",
            "Check camera traps, nesting banks, and known movement corridors for displaced animals.",
            "Send a 30-minute WhatsApp field update with water level, species sightings, and access constraints.",
        ],
        "ranger_instructions": (
            f"Deploy to {top_tile.get('tile_id', 'the highest-risk area')}; keep teams on elevated routes; "
            f"watch for {priority_name}; report status every 30 minutes."
        ),
        "estimated_impact": f"{len(names)} priority species records overlap the current high-risk forecast.",
        "model_used": "local-fallback",
    }


def _sort_species(species: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    order = {"CR": 0, "EN": 1, "VU": 2, "NT": 3, "LC": 4, "DD": 5}
    return sorted(species, key=lambda item: order.get(str(item.get("iucn_status", "DD")), 6))


def _num(item: Dict[str, Any], *keys: str) -> float:
    for key in keys:
        value = item.get(key)
        if value is not None:
            try:
                return float(value)
            except (TypeError, ValueError):
                continue
    return 0.0


def _split_steps(text: str) -> List[str]:
    lines = [line.strip(" -0123456789.") for line in text.splitlines()]
    return [line for line in lines if line] or [text]
