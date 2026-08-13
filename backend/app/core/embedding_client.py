"""Sentence-embedding client for semantic search (Phase 3).

Uses the local sentence-transformers model ``multi-qa-MiniLM-L6-cos-v1`` —
chosen (see MIT_AI_RISK_REPOSITORY/AIRiskWatch_Design_Decisions_2026-08-01.md
§1) because the cited paper (2507.23669v1, Russo et al.) found this exact
pretrained model beats BM25, BM25+T5, and fine-tuned cross-encoders for
report/query-to-incident association, with no training required. It runs
locally (no API key, no network call, no rate limit) and outputs 384-dim
vectors, matching ``incident.embedding VECTOR(384)`` / ``EMBEDDING_DIM`` in
``app/models/incident_model.py``.

The model is loaded once per process (module-level singleton) since loading
weights is the expensive part; ``embed_text``/``embed_texts`` calls after the
first are cheap.
"""
from __future__ import annotations

from sentence_transformers import SentenceTransformer

MODEL_NAME = "multi-qa-MiniLM-L6-cos-v1"

_model: SentenceTransformer | None = None


def _get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer(MODEL_NAME)
    return _model


def embed_text(text: str) -> list[float]:
    """Embed a single string (e.g. a search query or system description)."""
    return _get_model().encode(text, normalize_embeddings=True).tolist()


def embed_texts(texts: list[str]) -> list[list[float]]:
    """Embed a batch of strings — batches on the GPU/CPU when available,
    faster than calling ``embed_text`` in a loop for backfill-sized jobs."""
    if not texts:
        return []
    vectors = _get_model().encode(texts, normalize_embeddings=True, show_progress_bar=False)
    return vectors.tolist()


def incident_embedding_input(title: str | None, description: str | None) -> str:
    """Build the embedding input text for an incident: title + description,
    which the cited paper found beats title-alone by 15-25 points on
    Accuracy@K/MRR@K/NDCG@K (design doc §1)."""
    title = (title or "").strip()
    description = (description or "").strip()
    if title and description:
        return f"{title}\n{description}"
    return title or description
