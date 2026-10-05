import os

from dotenv import load_dotenv

load_dotenv()


def _build_database_url() -> str:
    # A full connection string is used for hosted PostgreSQL providers such as
    # Neon. Otherwise retain the local Docker-friendly POSTGRES_* fallback.
    explicit_url = os.environ.get("DATABASE_URL")
    if explicit_url:
        return explicit_url

    user = os.environ["POSTGRES_USER"]
    password = os.environ["POSTGRES_PASSWORD"]
    host = os.environ.get("POSTGRES_HOST", "localhost")
    port = os.environ.get("POSTGRES_PORT", "5432")
    database = os.environ["POSTGRES_DB"]
    return f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{database}"


DATABASE_URL: str = _build_database_url()

CORS_ORIGINS: list[str] = os.environ.get(
    "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
).split(",")

LLM_PROVIDER: str = os.environ.get("LLM_PROVIDER", "gemini")

GEMINI_API_KEY: str = os.environ.get("GEMINI_API_KEY", "")
GEMINI_MODEL: str = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash-lite")

MISTRAL_API_KEY: str = os.environ.get("MISTRAL_API_KEY", "")
MISTRAL_MODEL: str = os.environ.get("MISTRAL_MODEL", "mistral-small-latest")
MISTRAL_BASE_URL: str = os.environ.get("MISTRAL_BASE_URL", "https://api.mistral.ai/v1")

GROQ_API_KEY: str = os.environ.get("GROQ_API_KEY", "")
GROQ_MODEL: str = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")
GROQ_BASE_URL: str = os.environ.get("GROQ_BASE_URL", "https://api.groq.com/openai/v1")

OLLAMA_BASE_URL: str = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434/v1")
OLLAMA_MODEL: str = os.environ.get("OLLAMA_MODEL", "qwen3:4b")

LLM_MAX_RPM: int = int(os.environ.get("LLM_MAX_RPM", "10"))
LLM_TIMEOUT_S: float = float(os.environ.get("LLM_TIMEOUT_S", "60"))

# pgvector retrieves this broad candidate pool; a local cross-encoder then
# orders it more precisely before the public top_k is returned.
SEARCH_CANDIDATE_K: int = int(os.environ.get("SEARCH_CANDIDATE_K", "30"))
SEARCH_RERANKER_MODEL: str = os.environ.get(
    "SEARCH_RERANKER_MODEL", "cross-encoder/ms-marco-MiniLM-L6-v2"
)

INGESTION_ENABLED: bool = os.environ.get("INGESTION_ENABLED", "false").lower() in (
    "1",
    "true",
    "yes",
)
INGESTION_CRON_HOUR: int = int(os.environ.get("INGESTION_CRON_HOUR", "3"))
INGESTION_TIMEZONE: str = os.environ.get("INGESTION_TIMEZONE", "Asia/Dhaka")

INGESTION_MAX_ARTICLES_PER_SOURCE: int = int(
    os.environ.get("INGESTION_MAX_ARTICLES_PER_SOURCE", "20")
)

# Only articles published within this many hours of the run are ingested.
INGESTION_LOOKBACK_HOURS: float = float(
    os.environ.get("INGESTION_LOOKBACK_HOURS", "24")
)

INGESTION_SIMILARITY_THRESHOLD: float = float(
    os.environ.get("INGESTION_SIMILARITY_THRESHOLD", "0.85")
)

INGESTION_RELEVANCE_MIN_CONFIDENCE: float = float(
    os.environ.get("INGESTION_RELEVANCE_MIN_CONFIDENCE", "0.6")
)

INGESTION_USER_AGENT: str = os.environ.get(
    "INGESTION_USER_AGENT",
    "AIRiskWatchBot/1.0 (+https://github.com/Nandan1436/AIRiskWatch; academic research project)",
)
INGESTION_REQUEST_DELAY_S: float = float(
    os.environ.get("INGESTION_REQUEST_DELAY_S", "2.0")
)
INGESTION_HTTP_TIMEOUT_S: float = float(
    os.environ.get("INGESTION_HTTP_TIMEOUT_S", "20")
)

# Phase 5 authentication. Leaving JWT_SECRET empty makes app/core/security.py
# fall back to a per-process random secret, so tokens die on every restart.
JWT_SECRET: str = os.environ.get("JWT_SECRET", "")
JWT_ALGORITHM: str = os.environ.get("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MINUTES: int = int(os.environ.get("JWT_EXPIRE_MINUTES", "1440"))

# OAuth 2.0 Web client ID from Google Cloud; the frontend uses the same value.
GOOGLE_CLIENT_ID: str = os.environ.get("GOOGLE_CLIENT_ID", "")

# Monthly digest email. SMTP uses STARTTLS (e.g. smtp.gmail.com:587 with a
# Gmail app password). Leaving SMTP_HOST empty disables sending; the digest
# page and the admin preview still work.
SMTP_HOST: str = os.environ.get("SMTP_HOST", "")
SMTP_PORT: int = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USERNAME: str = os.environ.get("SMTP_USERNAME", "")
SMTP_PASSWORD: str = os.environ.get("SMTP_PASSWORD", "")
SMTP_FROM: str = os.environ.get("SMTP_FROM", "")

# Base URL of the frontend, used for links inside the email.
FRONTEND_BASE_URL: str = os.environ.get("FRONTEND_BASE_URL", "http://localhost:5173")

# Starts the in-process monthly send (1st of each month at DIGEST_CRON_HOUR,
# in INGESTION_TIMEZONE). Off by default, like ingestion; single worker only.
DIGEST_EMAIL_ENABLED: bool = os.environ.get("DIGEST_EMAIL_ENABLED", "false").lower() in (
    "1",
    "true",
    "yes",
)
DIGEST_CRON_HOUR: int = int(os.environ.get("DIGEST_CRON_HOUR", "8"))
