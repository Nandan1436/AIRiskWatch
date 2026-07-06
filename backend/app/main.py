from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import CORS_ORIGINS
from app.routes.incident_route import router as incident_router
from app.routes.report_route import router as report_router
from app.routes.risk_domain_route import router as risk_domain_router

app = FastAPI(title="AIRiskWatch")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(incident_router)
app.include_router(report_router)
app.include_router(risk_domain_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
