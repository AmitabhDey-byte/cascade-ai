# Deploy CascadeAI on Vercel

CascadeAI is a monorepo with two deployable applications. Create two Vercel projects from the same Git repository; do not deploy the repository root as one project.

## 1. Deploy the API

1. Import the repository into Vercel and set **Root Directory** to `backend`.
2. Vercel detects `main.py` as the FastAPI application and installs `requirements.txt`; no `vercel.json` is required. The checked-in `.python-version` pins a supported production Python runtime.
3. Set these environment variables for the API project:

   ```text
   CORS_ORIGINS=https://your-frontend.vercel.app
   DATABASE_URL=postgresql://...your-neon-pooled-connection-string...?sslmode=require
   OPENAI_API_KEY=                 # optional; local report/chat fallbacks work without it
   OPENAI_MODEL=gpt-5.4-mini       # optional
   NASA_EARTHDATA_TOKEN=           # optional; enables SMAP before the public fallback
   N8N_WEBHOOK_URL=                # optional; leave empty to skip webhook delivery
   N8N_REPORT_WEBHOOK_URL=         # optional
   BIOCLIP_ENABLED=false
   ```

4. Deploy, then verify `https://your-api.vercel.app/health` returns `{"status":"ok"}` and `https://your-api.vercel.app/risk/status` reports `storage: "neon"`.

Keep `BIOCLIP_ENABLED=false` on the Vercel API. BioCLIP downloads a large vision model and belongs on a persistent ML worker. `requirements-ml-worker.txt` lists the optional packages for that worker.

## 2. Deploy the frontend

1. Import the same repository as a second Vercel project and set **Root Directory** to `frontend/my-app`.
2. Vercel detects Next.js and uses `npm run build` automatically.
3. Set these environment variables:

   ```text
   CASCADE_API_URL=https://your-api.vercel.app
   NEXT_PUBLIC_MAPBOX_TOKEN=your_public_mapbox_token
   CASCADE_AUTH_EMAIL=your-operator-email
   CASCADE_AUTH_PASSWORD=use-a-strong-password
   CASCADE_AUTH_SECRET=use-a-long-random-secret
   ```

`CASCADE_API_URL` is server-only. The browser uses the frontend's `/api/*` proxy, so it never attempts to call `127.0.0.1` or needs a public API URL.

4. Deploy and verify these URLs:

   ```text
   https://your-frontend.vercel.app/dashboard
   https://your-frontend.vercel.app/api/risk/status
   ```

## Neon persistence

The API stores forecast runs, regional risk tiles, verified species observations, generated reports, and AI chat history in Neon whenever `DATABASE_URL` is configured. Use the **pooled** Neon connection string in Vercel; do not put it in the frontend project or commit it to Git.

Without `DATABASE_URL`, the API uses a clearly labelled local demo fallback. Do not use that fallback for deployed field operations.

## Regional coverage and ML worker

The live flood pipeline covers Assam and West Bengal with 65 stable 1° operational cells. It calls Open-Meteo for precipitation and elevation, uses NASA SMAP when an Earthdata token is available, and falls back to NASA POWER for soil moisture. The cells are coverage envelopes for fast regional operations, not a replacement for a boundary-clipped high-resolution hydrology grid.

Keep `BIOCLIP_ENABLED=false` on the Vercel API. BioCLIP and optional vector RAG need a persistent ML worker because the vision model is too large for reliable serverless cold starts. The worker can call the same API endpoints; verified observations are then stored in Neon.

The frontend build and API fallback paths work without OpenAI, NASA, n8n, or Mapbox credentials. Mapbox is only required for the satellite basemap; the risk zone visualization remains available without it.
