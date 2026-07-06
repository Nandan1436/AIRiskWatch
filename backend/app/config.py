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
