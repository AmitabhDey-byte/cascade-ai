# CascadeAI Integration Guide

## All Models Connected ✓

This document summarizes the integration of all AI models and systems in the CascadeAI platform.

---

## Backend Models Connected

### 1. **Flood Prediction Model** ✓
**Location:** `backend/app/ml/flood/predict.py`

- **Type:** Scikit-learn JobLib model
- **Input:** Satellite data (SMAP soil moisture) + Weather forecast (Open-Meteo)
- **Output:** Risk scores for 72-hour flood forecast
- **Confidence:** 0-1 score per tile
- **Integration Points:**
  - `/risk/run` - Triggers full pipeline
  - `/risk/tiles` - Returns latest predictions
  - Used in Chat context for decision-making

**Features Used:**
- Soil moisture (from NASA SMAP)
- 24h, 48h, 72h precipitation forecasts
- Elevation data
- Storm risk indicators

---

### 2. **BioCLIP Model** ✓
**Location:** `backend/app/ml/species/bioclip.py`

- **Type:** Open-source computer vision model from imageomics/bioclip
- **Input:** Species photos + Sundarbans species labels
- **Output:** Confidence scores (0-1) for species identification
- **Minimum Confidence:** 0.65 (configurable in `.env`)
- **Integration Points:**
  - `/species/verify` - Verify species with BioCLIP
  - `/species/high-risk-with-bioclip` - Get verified species for high-risk areas
  - Used in Chat context for species threat assessment

**Sundarbans Species Covered:**
- Bengal Tiger, Irrawaddy Dolphin, Saltwater Crocodile
- Fishing Cat, Smooth-coated Otter, Eagles
- Multiple others (15 total target species)

---

### 3. **OpenAI API Integration** ✓
**Location:** `backend/app/api/routes/chat.py`

- **Type:** LLM for intelligent response generation
- **Model:** gpt-4 (or configured via `OPENAI_MODEL`)
- **Input:** Flood data + Species data + Conversation history
- **Output:** Contextual, actionable responses
- **Integration Points:**
  - `/chat/chat` - Main chat endpoint
  - Uses AsyncOpenAI for non-blocking requests
  - Fallback responses if API unavailable

**System Prompt:** CascadeAI specializes in flood forecasting, species conservation, and emergency response for Sundarbans rangers.

---

### 4. **RAG Pipeline** (Connected)
**Location:** `backend/rag/core/main.py`

- **Type:** Retrieval-Augmented Generation for conservation knowledge
- **Input:** Conservation queries about species and habitats
- **Output:** Evidence-based conservation recommendations
- **Integration:** Called indirectly through Chat context
- **Features:**
  - Chroma vector database for knowledge storage
  - Species relationship graphs (Neo4j)
  - Conversation memory management

---

## Frontend Components

### 1. **useRiskData Hook** ✓
**Location:** `frontend/my-app/hooks/userRiskData.ts`

- Polls `/risk/tiles` every 60 seconds
- Provides high-risk count and average risk scores
- Feeds data to Chat component

### 2. **useDashboardSpecies Hook** ✓ (NEW)
**Location:** `frontend/my-app/hooks/useDashboardSpecies.ts`

- Polls `/species/high-risk-with-bioclip` every 60 seconds
- Returns BioCLIP-verified species for display
- Feeds top species data to Chat component

### 3. **AIChat Component** ✓ (UPDATED)
**Location:** `frontend/my-app/components/dashboard/AIChat.tsx`

- Sends user queries to `/chat/chat`
- Includes live tiles and species data with each message
- Maintains session memory
- Shows loading indicators and error handling

### 4. **Dashboard Page** ✓ (UPDATED)
**Location:** `frontend/my-app/app/dashboard/page.tsx`

- Uses both hooks to fetch live data
- Passes tiles + species to AIChat
- Displays chat button in bottom-right corner

---

## API Endpoints Summary

### Flood Risk Model
```
GET  /risk/tiles              - Get all monitored tiles with risk scores
GET  /risk/tiles/{tile_id}    - Get specific tile
POST /risk/run                - Trigger prediction pipeline
```

### Species Detection (BioCLIP)
```
POST /species/verify          - Verify observations with BioCLIP
GET  /species/high-risk-with-bioclip - Get verified species in high-risk areas
GET  /species/tile/{tile_id}  - Get species for specific tile
GET  /species/high-risk       - Get all high-risk species
```

### AI Chat (All Models)
```
POST /chat/chat               - Main chat endpoint (uses all models)
GET  /chat/session/{id}       - Get conversation history
DELETE /chat/session/{id}     - Clear session
```

### System Status
```
GET  /status                  - Diagnostics for all models
GET  /health                  - Simple health check
```

---

## Data Flow Diagram

```
FRONTEND (Dashboard)
    ↓
Hooks fetch data
    ├→ useRiskData (Flood predictions)
    ├→ useDashboardSpecies (BioCLIP verified)
    ↓
AIChat Component sends: {message, tiles, species}
    ↓
BACKEND /chat/chat endpoint
    ├→ Flood Model: Analyze tile data
    ├→ BioCLIP: Analyze species confidence
    ├→ RAG: Retrieve conservation knowledge
    ├→ OpenAI: Generate contextual response
    ↓
Response returned with model_used: "gpt-4 + Flood Model + BioCLIP + RAG"
```

---

## Configuration Required

### Environment Variables (.env)
```
# OpenAI
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4

# Optional: NASA, n8n, Stellar
NASA_EARTHDATA_TOKEN=...
N8N_WEBHOOK_URL=...
STELLAR_SECRET_KEY=...

# Model Thresholds
RISK_THRESHOLD=0.70
BIOCLIP_CONFIDENCE_MIN=0.65
```

---

## Testing Models Integration

### 1. Check Status
```bash
curl http://localhost:8000/status
```
Response shows all models and connection status.

### 2. Get Risk Data
```bash
curl http://localhost:8000/risk/tiles
```
Response includes flood predictions from ML model.

### 3. Get Species Data
```bash
curl http://localhost:8000/species/high-risk-with-bioclip
```
Response includes BioCLIP confidence scores.

### 4. Test Chat with All Models
```bash
curl -X POST http://localhost:8000/chat/chat \
  -H "Content-Type: application/json" \
  -d '{
    "content": "What are the immediate threats?",
    "tiles": [{...risk_data...}],
    "species": [{...species_data...}]
  }'
```
Response includes "model_used" showing all integrated systems.

---

## Architecture Summary

```
CascadeAI = Flood Model + BioCLIP + OpenAI + RAG
```

- **Flood Model**: Predicts where floods will happen (72-hour forecast)
- **BioCLIP**: Identifies what species are in those areas (with confidence)
- **OpenAI**: Explains what rangers should do about it
- **RAG**: Provides conservation strategies from knowledge base

All integrated through Dashboard Chat interface!

---

## Troubleshooting

### BioCLIP not loading
- Check if `flask-cors` and `torch` are installed
- Model will load lazily on first use (~400MB download)
- Can pre-load by calling any `/species/verify` or `/species/high-risk-with-bioclip`

### Flood model not found
- Run: `python backend/scripts/train_flood_model.py`
- Creates `backend/app/ml/weights/flood_model.joblib`

### Chat not getting OpenAI responses
- Check `OPENAI_API_KEY` is set in `.env`
- Fallback responses will be used if API unavailable
- Check `/status` endpoint for configuration

### Species data empty
- Ensure database has species data (demo data provided)
- Check BioCLIP confidence threshold in config
- Lower `BIOCLIP_CONFIDENCE_MIN` to 0.5 to get more results

---

## Recent Changes (All Systems Connected)

1. ✓ Created `useDashboardSpecies` hook for automatic species fetching
2. ✓ Created `AIChat` component with all models integrated
3. ✓ Updated Dashboard to use proper hooks
4. ✓ Created `/species/verify` endpoint with BioCLIP
5. ✓ Created `/species/high-risk-with-bioclip` endpoint
6. ✓ Updated Chat endpoint to include all model context
7. ✓ Added `/status` endpoint for diagnostics
8. ✓ Registered all routes in main app
9. ✓ Updated API client to call correct endpoints

---

## Next Steps (Optional Enhancements)

- [ ] Connect N8N for alert notifications
- [ ] Add Stellar blockchain for impact tracking
- [ ] Deploy RAG as separate service
- [ ] Add WebSocket for real-time chat updates
- [ ] Create ranger mobile app integration
- [ ] Add photo upload for species verification
- [ ] Create field team collaboration features

---

**All systems are now integrated and ready for use!**
