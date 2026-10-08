from pydantic import BaseModel


class ClassificationBreakdownItem(BaseModel):
    name: str
    incident_count: int


class ClassificationBreakdownResponse(BaseModel):
    causal_entity: list[ClassificationBreakdownItem]
    intent: list[ClassificationBreakdownItem]
    timing: list[ClassificationBreakdownItem]
    risk_domain: list[ClassificationBreakdownItem]
