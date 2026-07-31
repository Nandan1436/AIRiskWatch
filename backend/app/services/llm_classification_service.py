"""LLM MIT-taxonomy classification service (Phase 2).

``classify_incident`` is pure prediction — it reads an incident + its linked
reports, prompts the LLM, and returns a validated result WITHOUT writing to the
database. ``save_llm_classification`` is the only method that writes, and only in
backfill mode. This separation is what lets the eval run over the gold set
without ever touching the seeded data.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from pydantic import BaseModel, Field, ValidationError, field_validator, model_validator
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core import mit_taxonomy as tax
from app.core.llm_client import LlmClient
from app.models.incident_model import Incident
from app.models.mit_classification_model import MitClassification

# Per-report text budget when building the model input (~1.5k chars ≈ ~400 tok).
_REPORT_CHAR_LIMIT = 1500
_MAX_REPORTS = 2
# Target incident description budget; keeps title+description+2 reports ~1.2-2k
# tokens (per the plan). Few-shot exemplars use a tighter budget so the 7
# examples together don't blow the prompt past ~5k tokens.
_DESCRIPTION_CHAR_LIMIT = 2500
_FEWSHOT_DESCRIPTION_CHAR_LIMIT = 700


class ClassificationError(RuntimeError):
    """Raised when an incident cannot be classified into a valid result."""


def _snap(value: Any, options: list[str]) -> Any:
    """Snap a model-returned string to its canonical taxonomy spelling
    (case/entity-insensitive). Leaves unknown values untouched so the validators
    below reject them."""
    if not isinstance(value, str):
        return value
    target = tax.normalize(value).casefold()
    for option in options:
        if tax.normalize(option).casefold() == target:
            return option
    return value


class LlmClassification(BaseModel):
    """Validated LLM output. Only the taxonomy/axis fields + confidence are
    persisted; ``risk_subdomain_second`` and ``justification`` live in the
    predictions JSONL (top-2 accuracy, error analysis)."""

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
        # A second guess that isn't a valid subdomain of the domain (or repeats
        # the first) is dropped rather than failing the whole classification.
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
        """Snap strings to canonical spelling, then validate."""
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
    """JSON schema handed to the LLM (Gemini enforces it natively; OpenAI-compat
    providers get it via the prompt + Pydantic validation)."""
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

    # -- prompt construction ------------------------------------------------
    @staticmethod
    def _build_system_prompt() -> str:
        return (
            "You are an expert annotator applying the MIT AI Risk Repository "
            "taxonomy to real-world AI incidents. For the incident you are given, "
            "choose exactly one risk_domain, then a risk_subdomain that BELONGS TO "
            "that domain, then your second-best subdomain within the same domain "
            "(risk_subdomain_second), then classify the three causal axes.\n\n"
            "TAXONOMY (choose domain + subdomains from these exactly as written):\n"
            f"{tax.taxonomy_prompt_block()}\n\n"
            "CAUSAL AXES (choose one value each, exactly as written):\n"
            f"{tax.axes_prompt_block()}\n\n"
            "Output rules:\n"
            "- risk_subdomain and risk_subdomain_second MUST be subdomains of the "
            "chosen risk_domain, spelled exactly as above; they must differ.\n"
            "- confidence is your confidence in the risk_domain choice, 0 to 1.\n"
            "- justification is at most 2 sentences.\n"
            "- Reply with ONLY a JSON object with keys: risk_domain, "
            "risk_subdomain, risk_subdomain_second, causal_entity, timing, "
            "intent, confidence, justification."
        )

    def _build_few_shot_block(self) -> str:
        exemplars = self._load_incidents(list(tax.FEW_SHOT_INCIDENT_IDS))
        by_id = {inc.incident_id: inc for inc in exemplars}
        blocks: list[str] = []
        for i, ex in enumerate(tax.FEW_SHOT_EXEMPLARS, start=1):
            inc = by_id.get(ex["incident_id"])
            if inc is None:
                continue
            second = self._pick_second(ex["risk_domain"], ex["risk_subdomain"])
            answer = {
                "risk_domain": ex["risk_domain"],
                "risk_subdomain": ex["risk_subdomain"],
                "risk_subdomain_second": second,
                "causal_entity": ex["causal_entity"],
                "timing": ex["timing"],
                "intent": ex["intent"],
                "confidence": 0.9,
                "justification": (
                    f"The incident primarily reflects "
                    f"{ex['risk_subdomain'].lower()}."
                ),
            }
            blocks.append(
                f"EXAMPLE {i}\n"
                f"Title: {_truncate(inc.title, 200)}\n"
                f"Description: {_truncate(inc.description, _FEWSHOT_DESCRIPTION_CHAR_LIMIT)}\n"
                f"Answer: {json.dumps(answer, ensure_ascii=False)}"
            )
        return "\n\n".join(blocks)

    @staticmethod
    def _pick_second(domain: str, first_subdomain: str) -> str:
        for sub in tax.subdomains_for(domain):
            if tax.normalize(sub) != tax.normalize(first_subdomain):
                return sub
        return first_subdomain

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
        return (
            "Here are labelled examples:\n\n"
            f"{self._few_shot}\n\n"
            "Now classify this incident:\n"
            f"{self._incident_input_text(incident)}\n"
            "Answer:"
        )

    # -- data access --------------------------------------------------------
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

    # -- prediction (no DB write) ------------------------------------------
    def classify_incident(self, incident_id: int) -> LlmClassification:
        incident = self._load_incident(incident_id)
        if incident is None:
            raise ClassificationError(f"incident {incident_id} not found")

        user = self._build_user_prompt(incident)
        raw = self.client.complete_json(self._system, user, self._schema)
        try:
            return LlmClassification.from_raw(raw)
        except ValidationError as first_error:
            # One semantic-repair retry, echoing the validation error back.
            repair_user = (
                f"{user}\n\n"
                f"Your previous answer was invalid: {first_error}. "
                f"Return a corrected JSON object; ensure risk_subdomain and "
                f"risk_subdomain_second belong to the chosen risk_domain and use "
                f"the exact taxonomy spellings."
            )
            raw = self.client.complete_json(self._system, repair_user, self._schema)
            try:
                return LlmClassification.from_raw(raw)
            except ValidationError as second_error:
                raise ClassificationError(
                    f"incident {incident_id}: invalid after repair: {second_error}"
                ) from second_error

    # -- persistence (backfill only) ---------------------------------------
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
        """Insert an LLM classification row. Idempotent: returns False (no-op) if
        an LLM row already exists for this incident."""
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
