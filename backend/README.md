# AIRiskWatch — Backend

FastAPI service for AIRiskWatch: ingestion, MIT taxonomy classification, semantic search, auth and the monthly digest, on PostgreSQL + pgvector. Setup steps are in the [main README](../README.md#getting-started).

All commands below run from `backend/`.

## Run

```bash
uvicorn app.main:app --reload
```

The API listens on `http://127.0.0.1:8000`. Every endpoint is documented in the interactive Swagger UI at `http://127.0.0.1:8000/docs`.

## Architecture

Layered per [`docs/architecture.md`](docs/architecture.md): routes → services → SQLAlchemy models, with Pydantic schemas defining the API contract.

```
app/
├── main.py          # app creation, CORS, router registration, schedulers
├── config.py        # env-driven configuration
├── database.py      # engine, session factory, get_db
├── core/            # LLM, embedding, reranker, email and news clients; site scrapers
├── prompts/         # LLM prompts, MIT taxonomy definitions, few-shot examples
├── models/          # SQLAlchemy models
├── schemas/         # Pydantic request/response models
├── services/        # business logic: ingestion, classification, search, digest, auth
└── routes/          # FastAPI routers (thin, delegate to services)
```

## Scripts

| Script | Purpose |
|---|---|
| `scripts/apply_migrations.py` | Apply `db/migrations/*.sql` (idempotent) |
| `scripts/import_seed.py` | Load the AI Incident Database snapshot from `SEED_DATA_DIR` |
| `scripts/backfill_embeddings.py` | Embed incidents that have no embedding yet |
| `scripts/create_admin.py` | Create or promote an admin account |
| `scripts/run_classification.py` | Classify incidents (`--mode backfill`) or evaluate against gold labels (`--mode eval`) |
| `scripts/evaluate_classifier.py` | Score and compare evaluation runs |
| `scripts/run_ingestion.py` | Run the news ingestion pipeline (`--check-sources`, `--dry-run`, `--source`) |

Evaluation output is written to `eval_results/`, which is not tracked in git.
