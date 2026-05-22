# TODO - Fix AI app errors

## Frontend
- [ ] Fix TS/React structural issues in `frontend/my-app/components/dashboard/AIChat.tsx`, `RiskMap.tsx`, etc. (ensure only one `export default` and valid JSX).
- [ ] Fix mismatched route paths / endpoints in `frontend/my-app/lib/api.ts` (species high-risk endpoint and tile species endpoint names).
- [ ] Fix type mismatches between `frontend/my-app/types/index.ts` and backend schemas (species + report fields).
- [ ] Ensure `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_MAPBOX_TOKEN` are used consistently.

## Backend
- [ ] Fix schema/route path mismatches: `/species/high-risk-with-bioclip` vs implemented router endpoints.
- [ ] Fix bug in `species.py` / `report.py` where response model fields don’t match frontend expectations (generated_at, summary, etc.).
- [ ] Ensure router include paths: `/risk` tiles/run, `/species` high-risk/tile/{tile_id}, `/report/latest` and `/report/generate`.

## Verification
- [ ] Run frontend lint/typecheck and backend startup.
- [ ] Call key endpoints manually with curl/postman to ensure JSON shapes match frontend normalizers.

