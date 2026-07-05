# AIRiskWatch

AI incident intelligence platform — Phase 0: seed the AI Incident Database corpus (MIT taxonomy scope) into PostgreSQL + pgvector.

## Setup

```bash
cp .env.example .env        # set SEED_DATA_DIR to a path relative to the repo root, e.g. MIT_AI_RISK_REPOSITORY
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

## Run

```bash
uvicorn app.main:app --reload
```

The API listens on `http://127.0.0.1:8000`. Interactive docs (Swagger UI) are served at `http://127.0.0.1:8000/docs`.

## Testing the API

### Endpoints

| Method | Path        | Query params           | Description                     |
|--------|-------------|-------------------------|----------------------------------|
| GET    | `/incidents` | `limit` (default 20), `offset` (default 0) | List seeded incidents, paginated |

### curl

```bash
curl "http://127.0.0.1:8000/incidents?limit=5&offset=0"
```

### Postman

- Method: `GET`
- URL: `http://127.0.0.1:8000/incidents`
- Params tab: `limit=5`, `offset=0`

## Scope (v1)

Only the MIT taxonomy is imported: `incidents.csv`, `reports.csv`, `classifications_MIT.csv`. CSET and GMF classifications, the mitigation crosswalk, and entity graph data are deferred.
