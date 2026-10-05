import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import config
from app.config import CORS_ORIGINS
from app.routes.admin_route import router as admin_router
from app.routes.auth_route import router as auth_router
from app.routes.classification_breakdown_route import (
    router as classification_breakdown_router,
)
from app.routes.digest_route import router as digest_router
from app.routes.incident_route import router as incident_router
from app.routes.ingestion_route import router as ingestion_router
from app.routes.organization_route import router as organization_router
from app.routes.report_route import router as report_router
from app.routes.risk_domain_route import router as risk_domain_router
from app.routes.search_route import router as search_router
from app.routes.summary_route import router as summary_router
from app.routes.user_route import router as user_router

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
    if config.INGESTION_ENABLED or config.DIGEST_EMAIL_ENABLED:
        from apscheduler.schedulers.background import BackgroundScheduler
        from apscheduler.triggers.cron import CronTrigger

        scheduler = BackgroundScheduler(timezone=config.INGESTION_TIMEZONE)
        if config.INGESTION_ENABLED:
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
            logger.info(
                "ingestion scheduled: daily at %02d:00 %s",
                config.INGESTION_CRON_HOUR,
                config.INGESTION_TIMEZONE,
            )
        if config.DIGEST_EMAIL_ENABLED:
            from app.services.digest_email_service import run_digest_job

            scheduler.add_job(
                run_digest_job,
                trigger=CronTrigger(
                    day=1,
                    hour=config.DIGEST_CRON_HOUR,
                    minute=0,
                    timezone=config.INGESTION_TIMEZONE,
                ),
                id="monthly_digest",
                max_instances=1,
                coalesce=True,
            )
            logger.info(
                "digest email scheduled: 1st of the month at %02d:00 %s",
                config.DIGEST_CRON_HOUR,
                config.INGESTION_TIMEZONE,
            )
        scheduler.start()
    else:
        logger.info("scheduler disabled (INGESTION_ENABLED and DIGEST_EMAIL_ENABLED are false)")

    try:
        yield
    finally:
        if scheduler is not None:
            scheduler.shutdown(wait=True)
            logger.info("scheduler stopped")


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
app.include_router(digest_router)
app.include_router(search_router)
app.include_router(ingestion_router)
app.include_router(auth_router)
app.include_router(user_router)
app.include_router(admin_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
