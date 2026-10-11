from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from pydantic import BaseModel, Field, ValidationError, field_validator, model_validator
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app import prompts
from app.core import mit_taxonomy as tax
from app.core.llm_client import LlmClient
from app.models.incident_model import Incident
from app.models.mit_classification_model import MitClassification

_REPORT_CHAR_LIMIT = 1500
_MAX_REPORTS = 2
_DESCRIPTION_CHAR_LIMIT = 2500
_FEWSHOT_DESCRIPTION_CHAR_LIMIT = 700


class ClassificationError(RuntimeError):
    pass


def _snap(value: Any, options: list[str]) -> Any:
    if not isinstance(value, str):
        return value
    target = tax.normalize(value).casefold()
    for option in options:
        if tax.normalize(option).casefold() == target:
            return option
    return value


class LlmClassification(BaseModel):
    risk_domain: str
    risk_subdomain: str
    risk_subdomain_second: str | None = None
    causal_entity: str
    timing: str
    intent: str
    confidence: float = Field(ge=0.0, le=1.0)
    justification: str = ""

    @field_validator("risk_domain")
    @classmethod
    def _valid_domain(cls, v: str) -> str:
        if v not in tax.DOMAINS:
            raise ValueError(f"risk_domain '{v}' is not a valid MIT domain")
        return v

    @field_validator("causal_entity")
    @classmethod
    def _valid_entity(cls, v: str) -> str:
        if v not in tax.CAUSAL_ENTITIES:
            raise ValueError(f"causal_entity '{v}' invalid")
        return v

    @field_validator("timing")
    @classmethod
    def _valid_timing(cls, v: str) -> str:
        if v not in tax.TIMINGS:
            raise ValueError(f"timing '{v}' invalid")
        return v

    @field_validator("intent")
    @classmethod
    def _valid_intent(cls, v: str) -> str:
        if v not in tax.INTENTS:
            raise ValueError(f"intent '{v}' invalid")
        return v

    @model_validator(mode="after")
    def _subdomain_belongs_to_domain(self) -> "LlmClassification":
        if not tax.is_valid_pair(self.risk_domain, self.risk_subdomain):
            raise ValueError(
                f"risk_subdomain '{self.risk_subdomain}' does not belong to "
                f"domain '{self.risk_domain}'"
            )
        if self.risk_subdomain_second is not None:
            same = tax.normalize(self.risk_subdomain_second) == tax.normalize(
                self.risk_subdomain
            )
            if same or not tax.is_valid_pair(
                self.risk_domain, self.risk_subdomain_second
            ):
                self.risk_subdomain_second = None
        return self

    @classmethod
    def from_raw(cls, raw: dict[str, Any]) -> "LlmClassification":
        data = dict(raw)
        data["risk_domain"] = _snap(data.get("risk_domain"), tax.DOMAINS)
        data["risk_subdomain"] = _snap(data.get("risk_subdomain"), tax.SUBDOMAINS)
        if data.get("risk_subdomain_second") is not None:
            data["risk_subdomain_second"] = _snap(
                data.get("risk_subdomain_second"), tax.SUBDOMAINS
            )
        data["causal_entity"] = _snap(data.get("causal_entity"), tax.CAUSAL_ENTITIES)
        data["timing"] = _snap(data.get("timing"), tax.TIMINGS)
        data["intent"] = _snap(data.get("intent"), tax.INTENTS)
        return cls.model_validate(data)


def build_response_schema() -> dict[str, Any]:
    order = [
        "risk_domain",
        "risk_subdomain",
        "risk_subdomain_second",
        "causal_entity",
        "timing",
        "intent",
        "confidence",
        "justification",
    ]
    return {
        "type": "object",
        "properties": {
            "risk_domain": {"type": "string", "enum": tax.DOMAINS},
            "risk_subdomain": {"type": "string", "enum": tax.SUBDOMAINS},
            "risk_subdomain_second": {"type": "string", "enum": tax.SUBDOMAINS},
            "causal_entity": {"type": "string", "enum": tax.CAUSAL_ENTITIES},
            "timing": {"type": "string", "enum": tax.TIMINGS},
            "intent": {"type": "string", "enum": tax.INTENTS},
            "confidence": {"type": "number"},
            "justification": {"type": "string"},
        },
        "required": [k for k in order if k != "risk_subdomain_second"],
        "propertyOrdering": order,
    }


def _truncate(text: str | None, limit: int) -> str:
    if not text:
        return ""
    text = text.strip()
    return text if len(text) <= limit else text[:limit].rstrip() + "…"


class LlmClassificationService:
    def __init__(self, db: Session, client: LlmClient):
        self.db = db
        self.client = client
        self._schema = build_response_schema()
        self._system = self._build_system_prompt()
        self._few_shot = self._build_few_shot_block()

    @staticmethod
    def _build_system_prompt() -> str:
        return prompts.render(
            "classification/system.md",
            taxonomy=tax.taxonomy_prompt_block(),
            axes=tax.axes_prompt_block(),
        )

    def _build_few_shot_block(self) -> str:
        exemplars = self._load_incidents(list(tax.FEW_SHOT_INCIDENT_IDS))
        by_id = {inc.incident_id: inc for inc in exemplars}
        blocks: list[str] = []
        for i, ex in enumerate(tax.FEW_SHOT_EXEMPLARS, start=1):
            inc = by_id.get(ex["incident_id"])
            if inc is None:
                continue
            answer = {
                "risk_domain": ex["risk_domain"],
                "risk_subdomain": ex["risk_subdomain"],
                "risk_subdomain_second": ex["risk_subdomain_second"],
                "causal_entity": ex["causal_entity"],
                "timing": ex["timing"],
                "intent": ex["intent"],
                "confidence": ex["confidence"],
                "justification": ex["justification"],
            }
            blocks.append(
                f"EXAMPLE {i}\n"
                f"Title: {_truncate(inc.title, 200)}\n"
                f"Description: {_truncate(inc.description, _FEWSHOT_DESCRIPTION_CHAR_LIMIT)}\n"
                f"Answer: {json.dumps(answer, ensure_ascii=False)}"
            )
        return "\n\n".join(blocks)

    def _incident_input_text(self, incident: Incident) -> str:
        parts = [
            f"Title: {_truncate(incident.title, 200)}",
            f"Description: {_truncate(incident.description, _DESCRIPTION_CHAR_LIMIT)}",
        ]
        reports = list(incident.reports)[:_MAX_REPORTS]
        if reports:
            parts.append("Linked reports:")
            for i, report in enumerate(reports, start=1):
                snippet = _truncate(report.text, _REPORT_CHAR_LIMIT)
                if snippet:
                    parts.append(f"[{i}] {snippet}")
        return "\n".join(parts)

    def _build_user_prompt(self, incident: Incident) -> str:
        return prompts.render(
            "classification/user.md",
            examples=self._few_shot,
            incident=self._incident_input_text(incident),
        )

    def _load_incidents(self, incident_ids: list[int]) -> list[Incident]:
        if not incident_ids:
            return []
        return list(
            self.db.scalars(
                select(Incident)
                .where(Incident.incident_id.in_(incident_ids))
                .options(selectinload(Incident.reports))
            ).all()
        )

    def _load_incident(self, incident_id: int) -> Incident | None:
        return self.db.scalar(
            select(Incident)
            .where(Incident.incident_id == incident_id)
            .options(selectinload(Incident.reports))
        )

    def classify_incident(self, incident_id: int) -> LlmClassification:
        incident = self._load_incident(incident_id)
        if incident is None:
            raise ClassificationError(f"incident {incident_id} not found")

        user = self._build_user_prompt(incident)
        raw = self.client.complete_json(self._system, user, self._schema)
        try:
            return LlmClassification.from_raw(raw)
        except ValidationError as first_error:
            repair_user = prompts.render(
                "classification/repair.md", prompt=user, error=str(first_error)
            )
            raw = self.client.complete_json(self._system, repair_user, self._schema)
            try:
                return LlmClassification.from_raw(raw)
            except ValidationError as second_error:
                raise ClassificationError(
                    f"incident {incident_id}: invalid after repair: {second_error}"
                ) from second_error

    def has_llm_classification(self, incident_id: int) -> bool:
        return (
            self.db.scalar(
                select(MitClassification.id)
                .where(MitClassification.incident_id == incident_id)
                .where(MitClassification.classified_by == "llm")
                .limit(1)
            )
            is not None
        )

    def save_llm_classification(
        self, incident_id: int, result: LlmClassification
    ) -> bool:
        if self.has_llm_classification(incident_id):
            return False
        row = MitClassification(
            incident_id=incident_id,
            risk_domain=result.risk_domain,
            risk_subdomain=result.risk_subdomain,
            causal_entity=result.causal_entity,
            timing=result.timing,
            intent=result.intent,
            published=False,
            confidence=result.confidence,
            classified_by="llm",
            classified_at=datetime.now(timezone.utc),
        )
        self.db.add(row)
        self.db.commit()
        return True
