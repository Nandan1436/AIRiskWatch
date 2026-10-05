import glob
import os

import psycopg2
from dotenv import load_dotenv

load_dotenv()

MIGRATIONS_DIR = os.path.join(os.path.dirname(__file__), "..", "db", "migrations")


def get_conn():
    # Same precedence as app/config.py: a full DATABASE_URL (Neon) wins over POSTGRES_*.
    database_url = os.environ.get("DATABASE_URL")
    if database_url:
        return psycopg2.connect(database_url.replace("postgresql+psycopg2://", "postgresql://", 1))
    return psycopg2.connect(
        dbname=os.environ["POSTGRES_DB"],
        user=os.environ["POSTGRES_USER"],
        password=os.environ["POSTGRES_PASSWORD"],
        host=os.environ.get("POSTGRES_HOST", "localhost"),
        port=os.environ.get("POSTGRES_PORT", "5432"),
    )


def main():
    paths = sorted(glob.glob(os.path.join(MIGRATIONS_DIR, "*.sql")))
    if not paths:
        print(f"No migrations found in {os.path.abspath(MIGRATIONS_DIR)}")
        return

    conn = get_conn()
    try:
        for path in paths:
            name = os.path.basename(path)
            with open(path, encoding="utf-8") as f:
                sql = f.read()
            with conn:
                with conn.cursor() as cur:
                    cur.execute(sql)
            print(f"applied {name}")
        print(f"Done. {len(paths)} migration(s) applied.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
