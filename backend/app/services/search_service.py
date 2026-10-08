from __future__ import annotations

from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import SEARCH_CANDIDATE_K
from app.core.embedding_client import embed_text, incident_embedding_input
from app.core.llm_client import LlmClient, LlmClientError
from app.core.reranker_client import rerank
from app.models.incident_model import Incident
from app.models.mit_classification_model import MitClassification
from app.schemas.search_schema import SearchResultItem

_SUMMARY_DESCRIPTION_CHAR_LIMIT = 600


class SearchError(RuntimeError):
    pass


def _truncate(text: str | None, limit: int) -> str:
    if not text:
        return ""
    text = text.strip()
    return text if len(text) <= limit else text[:limit].rstrip() + "…"


class SearchService:
    def __init__(self, db: Session, client: LlmClient):
        self.db = db
        self.client = client

    def retrieve(self, query: str, top_k: int) -> list[tuple[Incident, str | None, str | None, float]]:
        query_vector = embed_text(query)
        distance = Incident.embedding.cosine_distance(query_vector)
        rows = self.db.execute(
            select(
                Incident,
                MitClassification.risk_domain,
                MitClassification.risk_subdomain,
                distance.label("distance"),
            )
            .outerjoin(MitClassification, MitClassification.incident_id == Incident.incident_id)
            .where(Incident.embedding.is_not(None))
            .order_by(distance)
            .limit(top_k)
        ).all()
        return [
            (incident, domain, subdomain, 1.0 - dist)
            for incident, domain, subdomain, dist in rows
        ]

    def rerank(
        self, query: str, candidates: list[tuple[Incident, str | None, str | None, float]]
    ) -> list[tuple[Incident, str | None, str | None, float]]:
        """Order vector candidates with a query-aware cross-encoder.

        The tuple's similarity remains the first-stage cosine score for
        observability. Final ordering is based on the cross-encoder score,
        which is not a calibrated percentage.
        """
        documents = [
            incident_embedding_input(incident.title, incident.description)
            for incident, _, _, _ in candidates
        ]
        try:
            relevance_scores = rerank(query, documents)
        except Exception as exc:
            raise SearchError(f"reranking failed: {exc}") from exc
        return [
            candidate
            for _, candidate in sorted(
                zip(relevance_scores, candidates, strict=True),
                key=lambda item: item[0],
                reverse=True,
            )
        ]

    def _build_summary_prompt(
        self, query: str, matches: list[tuple[Incident, str | None, str | None, float]]
    ) -> tuple[str, str]:
        system = (
            "You are an assistant summarising AI incident database search results. "
            "You are given a user's query and a fixed list of retrieved incidents. "
            "Write a short summary (3-5 sentences) of how these incidents relate to "
            "the query, citing incidents inline by their number like [#123].\n\n"
            "Rules:\n"
            "- Only use information present in the incidents listed below. Never "
            "invent details, entities, dates, or outcomes not stated there.\n"
            "- Never state or imply an exact total count of matching incidents, and "
            "never claim these are all the incidents relevant to the query — you "
            "were only given a fixed sample, not the full result set.\n"
            "- If none of the incidents seem meaningfully related to the query, say "
            "so plainly instead of forcing a connection.\n"
            "- Reply with ONLY the summary text, no JSON, no markdown headers."
        )
        lines = [f"User query: {query}\n", "Retrieved incidents:"]
        for incident, domain, _, _ in matches:
            lines.append(
                f"[#{incident.incident_id}] {_truncate(incident.title, 200)}\n"
                f"  Domain: {domain or 'unclassified'}\n"
                f"  Description: {_truncate(incident.description, _SUMMARY_DESCRIPTION_CHAR_LIMIT)}"
            )
        return system, "\n".join(lines)

    def summarize(self, query: str, matches: list[tuple[Incident, str | None, str | None, float]]) -> str:
        if not matches:
            return "No matching incidents were found for this query."
        system, user = self._build_summary_prompt(query, matches)
        schema: dict[str, Any] = {
            "type": "object",
            "properties": {"summary": {"type": "string"}},
            "required": ["summary"],
        }
        user_with_format = (
            f"{user}\n\nReply as a JSON object: {{\"summary\": \"<your summary text>\"}}"
        )
        try:
            raw = self.client.complete_json(system, user_with_format, schema)
        except LlmClientError as exc:
            raise SearchError(f"summary generation failed: {exc}") from exc
        summary = raw.get("summary")
        if not isinstance(summary, str) or not summary.strip():
            raise SearchError(f"model returned an empty/invalid summary: {raw!r}")
        return summary.strip()

    def search(self, query: str, top_k: int) -> tuple[str, list[SearchResultItem]]:
        candidate_k = max(top_k, SEARCH_CANDIDATE_K)
        candidates = self.retrieve(query, candidate_k)
        matches = self.rerank(query, candidates)[:top_k]
        summary = self.summarize(query, matches)
        results = [
            SearchResultItem(
                incident_id=incident.incident_id,
                title=incident.title,
                incident_date=incident.incident_date,
                risk_domain=domain,
                risk_subdomain=subdomain,
                similarity=round(similarity, 4),
            )
            for incident, domain, subdomain, similarity in matches
        ]
        return summary, results
