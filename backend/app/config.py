import os

from dotenv import load_dotenv

load_dotenv()


def _build_database_url() -> str:
    explicit_url = os.environ.get("DATABASE_URL")
    if explicit_url:
        return explicit_url

    # Assembled from the same POSTGRES_* variables the seed importer and
    # docker-compose use, so one .env drives everything.
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

# --- LLM classification (Phase 2) ---------------------------------------
# LLM_PROVIDER selects which client create_llm_client() builds. Mistral, Groq,
# and Ollama all speak the OpenAI /chat/completions dialect, so they share one
# client and differ only by base URL + key + model.
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

# --- News ingestion pipeline (Phase 4+7 merged) ---------------------------
# Defaults to DISABLED: starting the server should never begin hitting live
# feeds or spending LLM quota. Enable explicitly, and only with a single app
# worker (see .env.example) — each worker would start its own scheduler.
INGESTION_ENABLED: bool = os.environ.get("INGESTION_ENABLED", "false").lower() in (
    "1",
    "true",
    "yes",
)
INGESTION_CRON_HOUR: int = int(os.environ.get("INGESTION_CRON_HOUR", "3"))
# Explicit timezone: an unqualified hour is ambiguous across a containerized
# deploy, where the process default is usually UTC.
INGESTION_TIMEZONE: str = os.environ.get("INGESTION_TIMEZONE", "Asia/Dhaka")

INGESTION_MAX_ARTICLES_PER_SOURCE: int = int(
    os.environ.get("INGESTION_MAX_ARTICLES_PER_SOURCE", "20")
)

# Cosine similarity at/above which a scraped report is treated as belonging to
# an incident already in the corpus. A tunable starting heuristic, NOT a
# validated constant — tune against manually inspected pairs.
INGESTION_SIMILARITY_THRESHOLD: float = float(
    os.environ.get("INGESTION_SIMILARITY_THRESHOLD", "0.85")
)

# Minimum self-reported confidence for a "yes" from the relevance filter. A
# hedged yes is treated as a no: the corpus is worth more than the coverage.
INGESTION_RELEVANCE_MIN_CONFIDENCE: float = float(
    os.environ.get("INGESTION_RELEVANCE_MIN_CONFIDENCE", "0.6")
)

# A real, identifying User-Agent — never a spoofed browser string. Sent on
# every request the pipeline makes, including robots.txt fetches.
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
