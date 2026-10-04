from pydantic import BaseModel, ConfigDict


class MitClassificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    risk_domain: str | None
    risk_subdomain: str | None
    causal_entity: str | None
    timing: str | None
    intent: str | None
    confidence: float | None = None
    classified_by: str | None = None
