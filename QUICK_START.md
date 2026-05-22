# Quick Start Checklist

## All Models Connected ✓✓✓

---

## What's Been Fixed

### Backend Changes:
1. ✓ Created `/app/api/routes/chat.py` - Chat endpoint with all models integrated
2. ✓ Created `/app/api/routes/species_detection.py` - BioCLIP species verification
3. ✓ Created `/app/api/routes/integration_status.py` - Diagnostics endpoint
4. ✓ Updated `/app/main.py` - Registered all new routes
5. ✓ Updated `/app/lib/api.ts` - Frontend API calls use BioCLIP endpoint

### Frontend Changes:
1. ✓ Created `/hooks/useDashboardSpecies.ts` - Hook for high-risk species
2. ✓ Created `/components/dashboard/AIChat.tsx` - Chat component with models
3. ✓ Updated `/app/dashboard/page.tsx` - Integrated chat interface

### Models Now Integrated:
- ✓ **Flood Prediction Model** - Predicts risk scores
- ✓ **BioCLIP** - Identifies species with confidence
- ✓ **OpenAI API** - Generates responses
- ✓ **RAG Pipeline** - Provides conservation knowledge
- ✓ **Database** - Stores species & risk data

---

## How to Run

### 1. Install Dependencies
```bash
# Backend
cd backend
pip install -r requirements.txt

# Frontend
cd ../frontend/my-app
npm install
```

### 2. Set Environment Variables
Create `.env` in backend folder:
```
OPENAI_API_KEY=your_openai_key_here
OPENAI_MODEL=gpt-4
NASA_EARTHDATA_TOKEN=your_token
BIOCLIP_CONFIDENCE_MIN=0.65
RISK_THRESHOLD=0.70
```

### 3. Start Backend
```bash
cd backend
uvicorn main:app --reload
# Backend runs at http://localhost:8000
```

### 4. Start Frontend
```bash
cd frontend/my-app
npm run dev
# Frontend runs at http://localhost:3000
```

### 5. Test Integration
Visit: http://localhost:3000/dashboard

- Click "💬 OPEN AI ASSISTANT" button
- Chat will automatically fetch live data
- Response shows which models were used

---

## Verify Everything Works

### Check 1: Flood Model
```bash
curl http://localhost:8000/risk/tiles
# Should return risk_score, flood_probability_24h, etc.
```

### Check 2: BioCLIP Species
```bash
curl http://localhost:8000/species/high-risk-with-bioclip
# Should return species with bioclip_confidence scores
```

### Check 3: System Status
```bash
curl http://localhost:8000/status
# Shows all models loaded and endpoints available
```

### Check 4: Chat with Models
```bash
curl -X POST http://localhost:8000/chat/chat \
  -H "Content-Type: application/json" \
  -d '{
    "content": "What flood risks do we have?",
    "tiles": [{
      "tile_id": "sundarbans_tile_01",
      "risk_score": 0.82,
      "flood_probability_24h": 0.71
    }],
    "species": [{
      "name": "Bengal Tiger",
      "iucn_status": "EN",
      "bioclip_confidence": 0.91
    }]
  }'
# Should return response with "model_used" showing all systems
```

---

## Dashboard Features

### Now Available:
1. ✓ Real-time flood risk tiles (from prediction model)
2. ✓ Species alerts with BioCLIP confidence scores
3. ✓ AI chat that understands current situation
4. ✓ Session memory for conversations
5. ✓ Fallback responses if OpenAI unavailable
6. ✓ Live metric cards (avg risk, active alerts, etc.)

### Chat Examples:
- "What species are at risk right now?"
- "What's the flood forecast for the next 72 hours?"
- "What should rangers do in high-risk areas?"
- "Which areas need immediate attention?"

---

## Files Changed

### Backend:
- `/app/main.py` - Added route imports
- `/app/api/routes/chat.py` - Created (new)
- `/app/api/routes/species_detection.py` - Created (new)
- `/app/api/routes/integration_status.py` - Created (new)

### Frontend:
- `/app/dashboard/page.tsx` - Updated hooks & chat integration
- `/hooks/useDashboardSpecies.ts` - Created (new)
- `/components/dashboard/AIChat.tsx` - Created (new)
- `/lib/api.ts` - Updated getHighRiskSpecies()

### Documentation:
- `/INTEGRATION_GUIDE.md` - Created (comprehensive guide)
- `/QUICK_START.md` - This file!

---

## Data Flow

```
Dashboard
  ├─ useRiskData()          → /risk/tiles (Flood Model)
  ├─ useDashboardSpecies()  → /species/high-risk-with-bioclip (BioCLIP)
  │
  └─ AIChat sends message + tiles + species
      │
      └─ /chat/chat (OpenAI + Flood Model + BioCLIP + RAG)
          │
          └─ Response with model_used attribution
```

---

## Common Issues & Solutions

### Issue: "No modules named 'app'"
**Solution:** Run from backend folder, or add to PYTHONPATH
```bash
cd backend
python -m uvicorn app.main:app --reload
```

### Issue: BioCLIP taking long time
**Solution:** Normal! First run downloads ~400MB model. Be patient.

### Issue: "Module 'open_clip' not found"
**Solution:** Install: `pip install open-clip-torch`

### Issue: Chat not responding
**Solution:** Check `/status` endpoint for model health

### Issue: Species data empty
**Solution:** Database might be empty. Check species_repo has demo data.

---

## Environment Variables Explained

```
# Required for Chat responses
OPENAI_API_KEY        - Your OpenAI API key
OPENAI_MODEL          - Model to use (default: gpt-4)

# Optional for full data
NASA_EARTHDATA_TOKEN  - For NASA soil moisture data
N8N_WEBHOOK_URL       - For alert notifications
STELLAR_SECRET_KEY    - For blockchain tracking

# Model Tuning
RISK_THRESHOLD        - Risk score above this = high-risk (default: 0.70)
BIOCLIP_CONFIDENCE    - Only accept species IDs above this (default: 0.65)
```

---

## What Each Model Does

### Flood Prediction Model
- **Input:** Soil moisture + precipitation forecast + elevation
- **Output:** Risk score (0-1) + flood probabilities for 24h/48h/72h
- **Used in:** Risk tiles display, Chat context

### BioCLIP
- **Input:** Species photo + species label
- **Output:** Confidence score (0-1) that photo matches species
- **Used in:** Species verification, Chat context

### OpenAI (GPT-4)
- **Input:** Flood data + species data + conversation history
- **Output:** Human-readable response with recommendations
- **Used in:** Chat responses to rangers

### RAG Pipeline
- **Input:** Query about species/conservation
- **Output:** Relevant documents from knowledge base
- **Used in:** Enhanced Chat context (optional)

---

## Success Indicators

✓ You'll know it's working when:
1. Dashboard loads without errors
2. Risk tiles show numbers (risk scores)
3. Species cards show species with confidence scores  
4. Chat button appears in bottom-right
5. Chat responses reference current risk data
6. Response shows model_used with all components
7. `/status` endpoint shows "healthy: true"

---

## Next: Connect to Real Data

To use real flood/species data:
1. Get NASA EarthData credentials
2. Add to `.env` as `NASA_EARTHDATA_TOKEN`
3. Populate database with real species observations
4. Flood model will use real SMAP + weather data
5. BioCLIP will verify against real photos

---

## Support

1. Check `/status` endpoint - shows what's working
2. Read `INTEGRATION_GUIDE.md` - detailed architecture
3. Check backend logs - look for error messages
4. Test each endpoint individually with curl
5. Verify environment variables are set

---

**Ready to go! Run `npm run dev` and `uvicorn main:app --reload`**
