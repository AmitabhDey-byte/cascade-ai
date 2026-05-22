import logging
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()


class ChatMessage(BaseModel):
    content: str
    session_id: Optional[str] = None
    tiles: Optional[list[dict]] = None
    species: Optional[list[dict]] = None


class ChatResponse(BaseModel):
    response: str
    session_id: str
    model_used: str


# Simple in-memory session store (in production, use database)
_sessions: dict[str, list[dict]] = {}


@router.post("/chat", response_model=ChatResponse)
async def chat(message: ChatMessage) -> ChatResponse:
    """
    Chat endpoint that uses:
    - Flood prediction model (via tiles data)
    - RAG system (conservation knowledge)
    - OpenAI API (LLM generation)
    
    Maintains conversation session memory and context.
    """
    session_id = message.session_id or str(uuid4())
    
    # Initialize session if new
    if session_id not in _sessions:
        _sessions[session_id] = []
    
    # Store user message
    _sessions[session_id].append({
        "role": "user",
        "content": message.content
    })
    
    # Build comprehensive context from all models
    context_parts = []
    
    # 1. FLOOD RISK MODEL DATA
    if message.tiles:
        context_parts.append("## FLOOD RISK MODEL ANALYSIS")
        context_parts.append("---")
        for tile in message.tiles[:5]:  # Top 5 tiles
            risk_score = tile.get('risk_score', 0)
            flood_24h = tile.get('flood_probability_24h', 0)
            flood_48h = tile.get('flood_probability_48h', 0)
            flood_72h = tile.get('flood_probability_72h', 0)
            soil_moisture = tile.get('soil_moisture', 'unknown')
            
            context_parts.append(f"### Tile: {tile.get('tile_id', 'unknown')}")
            context_parts.append(f"- Overall Risk Score: {risk_score:.2f}")
            context_parts.append(f"- 24h Flood Probability: {flood_24h:.0%}")
            context_parts.append(f"- 48h Flood Probability: {flood_48h:.0%}")
            context_parts.append(f"- 72h Flood Probability: {flood_72h:.0%}")
            context_parts.append(f"- Soil Moisture Level: {soil_moisture}")
            context_parts.append("")
    
    # 2. SPECIES DATA (from BioCLIP verification)
    if message.species:
        context_parts.append("## ENDANGERED SPECIES AT RISK (BioCLIP Verified)")
        context_parts.append("---")
        for species in message.species[:5]:  # Top 5 species
            name = species.get('name', 'Unknown')
            latin = species.get('latin', 'Unknown sp.')
            iucn = species.get('iucn_status', 'Unknown')
            confidence = species.get('bioclip_confidence', 0)
            threat = species.get('primary_threat', 'Habitat disruption')
            
            context_parts.append(f"### {name} ({latin})")
            context_parts.append(f"- IUCN Status: {iucn}")
            context_parts.append(f"- BioCLIP Confidence: {confidence:.0%}")
            context_parts.append(f"- Primary Threat: {threat}")
            context_parts.append("")
    
    rag_context = "\n".join(context_parts) if context_parts else "No current risk data available."
    
    # Build conversation history for context
    conversation_context = ""
    for msg in _sessions[session_id][-10:]:  # Last 10 messages
        conversation_context += f"{msg['role'].upper()}: {msg['content']}\n"
    
    # Prepare the system prompt for LLM
    system_prompt = """You are CascadeAI, an expert conservation and flood risk intelligence assistant 
for the Sundarbans delta. You help rangers, ecologists, and decision-makers understand:

1. FLOOD RISKS: Using ML-based predictions from satellite data and weather forecasts
2. ENDANGERED SPECIES: Species verified with BioCLIP computer vision from field observations
3. CONSERVATION STRATEGIES: Evidence-based recommendations for habitat protection
4. EMERGENCY RESPONSE: Actionable procedures for rangers during crisis situations

Your expertise combines:
- Real-time flood risk modeling
- Computer vision species verification (BioCLIP)
- Ecological knowledge from retrieval systems
- Conservation science best practices

Be specific, actionable, and concise. Use the provided model data to inform your responses.
Always recommend concrete, field-ready actions."""
    
    user_prompt = f"""Current Situation Report:

{rag_context}

Conversation Context:
{conversation_context}

User Query: {message.content}

Please analyze the current situation and provide:
1. Immediate threats (if any)
2. Affected species and ecosystems
3. Recommended actions for rangers/conservation teams
4. Resources or support needed"""
    
    try:
        # Generate response using OpenAI
        from openai import AsyncOpenAI
        
        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        response = await client.chat.completions.create(
            model=settings.OPENAI_MODEL or "gpt-4",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=800,
            temperature=0.7,
        )
        
        ai_response = response.choices[0].message.content or "Unable to generate response."
        model_used = f"{settings.OPENAI_MODEL or 'gpt-4'} + Flood Model + BioCLIP + RAG"
        
        logger.info(f"Chat response generated for session {session_id}")
        
    except Exception as exc:
        logger.error(f"OpenAI chat failed: {exc}")
        # Fallback response if OpenAI fails
        ai_response = f"""Based on the current flood risk and species data:

**Current Situation:**
- {len(message.tiles or [])} monitored areas are being tracked
- {len(message.species or [])} endangered species detected in risk zones

**Recommended Actions:**
1. Immediate: Alert conservation teams in high-risk areas
2. Monitor: Continuous surveillance of species populations  
3. Prepare: Stage emergency evacuation equipment
4. Coordinate: Contact regional wildlife authorities

**Resources Needed:**
- Field teams for ground verification
- Transport for species relocation if necessary
- Communication infrastructure for real-time updates

For specific guidance, please provide more details about your query."""
        model_used = "fallback (OpenAI unavailable)"
    
    # Store AI response in session
    _sessions[session_id].append({
        "role": "assistant",
        "content": ai_response
    })
    
    # Clean up old sessions (keep last 100 messages per session)
    if len(_sessions[session_id]) > 100:
        _sessions[session_id] = _sessions[session_id][-100:]
    
    return ChatResponse(
        response=ai_response,
        session_id=session_id,
        model_used=model_used
    )


@router.get("/chat/session/{session_id}")
async def get_session(session_id: str):
    """Retrieve conversation history for a session."""
    if session_id not in _sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {
        "session_id": session_id,
        "messages": _sessions[session_id]
    }


@router.delete("/chat/session/{session_id}")
async def clear_session(session_id: str):
    """Clear a conversation session."""
    if session_id in _sessions:
        del _sessions[session_id]
    
    return {"status": "ok", "session_id": session_id}
