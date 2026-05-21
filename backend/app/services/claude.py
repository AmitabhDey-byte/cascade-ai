
import logging
from typing import Dict, List
from anthropic import AsyncAnthropic
from app.core.config import settings
 
logger = logging.getLogger(__name__)
 
client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
 
SYSTEM_PROMPT = """You are CascadeAI, an expert conservation intelligence system 
for the Sundarbans delta. You analyse flood risk data and endangered species 
information to generate urgent, actionable conservation reports for field rangers.
 
Your reports must be:
- Specific and actionable — no vague advice
- Prioritised by species threat level (CR > EN > VU)
- Written for rangers in the field, not scientists
- Concise but complete
 
Always structure your response as valid JSON matching the schema provided."""
 
 
async def generate_conservation_report(
    tiles: List[Dict],
    species: List[Dict],
    rag_context: str,
) -> Dict:
    """
    Calls Claude to generate a conservation action plan.
 
    Args:
        tiles:       List of high-risk tile dicts with risk scores
        species:     List of verified species dicts with IUCN status
        rag_context: Retrieved text from ChromaDB (IUCN docs, conservation papers)
 
    Returns:
        {
            "risk_summary": str,
            "species_affected": [str, ...],
            "action_plan": str,
            "ranger_instructions": str,
            "priority_species": str,
            "estimated_impact": str,
        }
    """
    prompt = _build_prompt(tiles, species, rag_context)
 
    try:
        response = await client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1500,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
        )
 
        raw_text = response.content[0].text
        return _parse_response(raw_text)
 
    except Exception as e:
        logger.error(f"Claude API call failed: {e}")
        raise
 
 
def _build_prompt(tiles: List[Dict], species: List[Dict], rag_context: str) -> str:
    """
    Assembles the full prompt with all context Claude needs.
    Clear sections so Claude doesn't miss anything.
    """
    tile_lines = "\n".join([
        f"  - {t['tile_id']}: risk={t['risk_score']:.2f}, "
        f"flood_24h={t.get('flood_probability_24h', 0):.0%}, "
        f"flood_72h={t.get('flood_probability_72h', 0):.0%}"
        for t in tiles
    ])
    priority_order = {"CR": 0, "EN": 1, "VU": 2, "NT": 3, "LC": 4}
    sorted_species = sorted(species, key=lambda s: priority_order.get(s.get("iucn_status", "LC"), 5))
 
    species_lines = "\n".join([
        f"  - {s['species_name']} ({s.get('scientific_name', '')}) "
        f"[IUCN: {s.get('iucn_status', 'Unknown')}] "
        f"confidence={s.get('confidence_score', 0):.0%}"
        for s in sorted_species
    ])
 
    return f"""
## FLOOD RISK ALERT — SUNDARBANS DELTA
 
### High-Risk Tiles ({len(tiles)} tiles above 70% threshold):
{tile_lines}
 
### Species Detected in Danger Zones ({len(species)} species):
{species_lines}
 
### Conservation Context (from IUCN Red List + research papers):
{rag_context}
 
---
 
Generate a conservation response report. Return ONLY valid JSON with this exact schema:
{{
  "risk_summary": "2-3 sentence summary of the flood threat and scale",
  "species_affected": ["list", "of", "species", "names"],
  "priority_species": "The single most at-risk species and why",
  "action_plan": "Detailed step-by-step conservation response plan",
  "ranger_instructions": "Specific immediate instructions for field rangers (bullets)",
  "estimated_impact": "Estimated number of animals at risk and habitat area affected"
}}
 
Be specific. Reference the actual species names and tile IDs. Do not add any text outside the JSON.
"""
 
 
def _parse_response(raw: str) -> Dict:
    """
    Parses Claude's JSON response.
    Strips markdown fences if Claude adds them despite instructions.
    """
    import json
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        cleaned = "\n".join(lines[1:-1]) 
 
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Claude JSON response: {e}\nRaw: {raw[:300]}")
        return {
            "risk_summary":       "Report generation encountered an error. Raw data available.",
            "species_affected":   [],
            "priority_species":   "Unknown",
            "action_plan":        raw,
            "ranger_instructions": "Check dashboard for latest risk data.",
            "estimated_impact":   "Unknown",
        }
