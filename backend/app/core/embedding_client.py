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
    return _get_model().encode(text, normalize_embeddings=True).tolist()


def embed_texts(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
    vectors = _get_model().encode(texts, normalize_embeddings=True, show_progress_bar=False)
    return vectors.tolist()


def incident_embedding_input(title: str | None, description: str | None) -> str:
    title = (title or "").strip()
    description = (description or "").strip()
    if title and description:
        return f"{title}\n{description}"
    return title or description
