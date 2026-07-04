import os

import psycopg2
import psycopg2.extras
from dotenv import load_dotenv
from fastapi import FastAPI

load_dotenv()

app = FastAPI(title="AIRiskWatch")


def get_conn():
    return psycopg2.connect(
        dbname=os.environ["POSTGRES_DB"],
        user=os.environ["POSTGRES_USER"],
        password=os.environ["POSTGRES_PASSWORD"],
        host=os.environ.get("POSTGRES_HOST", "localhost"),
        port=os.environ.get("POSTGRES_PORT", "5432"),
    )


@app.get("/incidents")
def list_incidents(limit: int = 20, offset: int = 0):
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT incident_id, title, incident_date, alleged_deployer,
                       alleged_developer, harmed_parties
                FROM incident
                ORDER BY incident_id
                LIMIT %s OFFSET %s
                """,
                (limit, offset),
            )
            return cur.fetchall()
    finally:
        conn.close()
