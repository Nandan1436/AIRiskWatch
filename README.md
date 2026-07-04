# AIRiskWatch

AI incident intelligence platform — Phase 0: seed the AI Incident Database corpus (MIT taxonomy scope) into PostgreSQL + pgvector.

## Setup

```bash
cp .env.example .env        # edit SEED_DATA_DIR if your data dump lives elsewhere
docker compose up -d
python -m venv .venv
.venv\Scripts\activate       # Windows
pip install -r requirements.txt
docker compose exec db psql -U airiskwatch -d airiskwatch -f /dev/stdin < db/schema.sql
python scripts/import_seed.py
```

## Scope (v1, today)

Only the MIT taxonomy is imported: `incidents.csv`, `reports.csv`, `classifications_MIT.csv`. CSET and GMF classifications, the mitigation crosswalk, and entity graph data are deferred.
