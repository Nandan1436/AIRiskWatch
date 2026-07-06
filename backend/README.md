# AIRiskWatch — Backend

AI incident intelligence platform. Phase 0 (seed import) and Phase 1 (read-only API) are complete: the AI Incident Database corpus (MIT taxonomy scope) lives in PostgreSQL + pgvector and is served by a layered FastAPI application.

All commands below run from `backend/`.

## Setup

```bash
cp .env.example .env        # set SEED_DATA_DIR to a path relative to backend/, e.g. ./MIT_AI_RISK_REPOSITORY/backup-20260601120109
docker compose up -d
python -m venv .venv
.venv\Scripts\activate       # Windows
pip install -r requirements.txt
docker compose exec -T db psql -U airiskwatch -d airiskwatch -f /dev/stdin < db/schema.sql   # bash/git-bash
python scripts/import_seed.py
```

On Windows PowerShell, `<` redirection isn't supported — load the schema with:

```powershell
Get-Content db\schema.sql -Raw | docker compose exec -T db psql -U airiskwatch -d airiskwatch
```

> The compose project name is pinned to `airiskwatch` in `docker-compose.yml` so the
> seeded `airiskwatch_pgdata` volume keeps working now that the compose file lives in
> `backend/` (Compose otherwise derives the project name from the folder name).

## Run

```bash
uvicorn app.main:app --reload
```

The API listens on `http://127.0.0.1:8000`. Interactive docs (Swagger UI) are served at `http://127.0.0.1:8000/docs`.

## Architecture

Layered per `docs/architecture.md`: routes → services → SQLAlchemy models, with Pydantic schemas defining the API contract.

```
app/
├── main.py          # app creation, CORS, router registration
├── config.py        # env-driven configuration (DATABASE_URL, CORS_ORIGINS)
├── database.py      # engine, session factory, declarative base, get_db
├── models/          # SQLAlchemy models mapping the seeded schema
├── schemas/         # Pydantic request/response models
├── services/        # business logic and queries
└── routes/          # FastAPI routers (thin, delegate to services)
```

## API

| Method | Path | Query params | Description |
|--------|------|--------------|-------------|
| GET | `/api/incidents/` | `limit`, `offset`, `search`, `risk_domain`, `risk_subdomain`, `causal_entity`, `timing`, `intent`, `date_from`, `date_to` | Paginated, filterable incident list with MIT classifications |
| GET | `/api/incidents/{incident_id}` | — | Incident detail: description, classifications, linked reports |
| GET | `/api/reports/{report_number}` | — | Report detail including full article text |
| GET | `/api/risk-domains/` | — | MIT risk domains/subdomains with distinct incident counts |
| GET | `/health` | — | Liveness check |

### Examples

```bash
curl "http://127.0.0.1:8000/api/incidents/?risk_domain=3.%20Misinformation&limit=5"
curl "http://127.0.0.1:8000/api/incidents/?search=deepfake&intent=Intentional"
curl "http://127.0.0.1:8000/api/incidents/1"
curl "http://127.0.0.1:8000/api/risk-domains/"
```

## Scope (v1)

Only the MIT taxonomy is imported: `incidents.csv`, `reports.csv`, `classifications_MIT.csv`. CSET and GMF classifications, the mitigation crosswalk, and entity graph data are deferred.
