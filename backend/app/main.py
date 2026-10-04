import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import config
from app.config import CORS_ORIGINS
from app.routes.classification_breakdown_route import (
    router as classification_breakdown_router,
)
from app.routes.incident_route import router as incident_router
from app.routes.ingestion_route import router as ingestion_router
from app.routes.organization_route import router as organization_router
from app.routes.report_route import router as report_router
from app.routes.risk_domain_route import router as risk_domain_router
from app.routes.search_route import router as search_router
from app.routes.summary_route import router as summary_router

logger = logging.getLogger(__name__)

if not logging.getLogger().handlers:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)-7s %(name)s: %(message)s",
    )
logging.getLogger("httpx").setLevel(logging.WARNING)


def _run_scheduled_ingestion() -> None:
    from app.database import SessionLocal
    from app.services.ingestion_service import run_ingestion_cycle

    db = SessionLocal()
    try:
        summary = run_ingestion_cycle(db)
        logger.info("scheduled ingestion finished: status=%s", summary.status)
    except Exception:
        logger.exception("scheduled ingestion failed")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler = None
    if config.INGESTION_ENABLED:
        from apscheduler.schedulers.background import BackgroundScheduler
        from apscheduler.triggers.cron import CronTrigger

        scheduler = BackgroundScheduler(timezone=config.INGESTION_TIMEZONE)
        scheduler.add_job(
            _run_scheduled_ingestion,
            trigger=CronTrigger(
                hour=config.INGESTION_CRON_HOUR,
                minute=0,
                timezone=config.INGESTION_TIMEZONE,
            ),
            id="daily_ingestion",
            max_instances=1,
            coalesce=True,
        )
        scheduler.start()
        logger.info(
            "ingestion scheduler started: daily at %02d:00 %s",
            config.INGESTION_CRON_HOUR,
            config.INGESTION_TIMEZONE,
        )
    else:
        logger.info("ingestion scheduler disabled (INGESTION_ENABLED=false)")

    try:
        yield
    finally:
        if scheduler is not None:
            scheduler.shutdown(wait=True)
            logger.info("ingestion scheduler stopped")


app = FastAPI(title="AIRiskWatch", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(incident_router)
app.include_router(report_router)
app.include_router(risk_domain_router)
app.include_router(classification_breakdown_router)
app.include_router(organization_router)
app.include_router(summary_router)
app.include_router(search_router)
app.include_router(ingestion_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
