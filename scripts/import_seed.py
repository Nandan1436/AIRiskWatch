"""Seed importer — MIT taxonomy scope only.

Loads incidents.csv, reports.csv, and classifications_MIT.csv from SEED_DATA_DIR
into the incident / report / incident_report / mit_classification tables.
CSET and GMF classifications are out of scope for this pass.
"""
import json
import os

import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv

load_dotenv()

SEED_DATA_DIR = os.environ["SEED_DATA_DIR"]


def get_conn():
    return psycopg2.connect(
        dbname=os.environ["POSTGRES_DB"],
        user=os.environ["POSTGRES_USER"],
        password=os.environ["POSTGRES_PASSWORD"],
        host=os.environ.get("POSTGRES_HOST", "localhost"),
        port=os.environ.get("POSTGRES_PORT", "5432"),
    )


def parse_json_array(value):
    if pd.isna(value):
        return []
    return json.loads(value)


def load_incidents(path):
    df = pd.read_csv(path, encoding="utf-8")
    df["reports"] = df["reports"].apply(parse_json_array)
    df["Alleged deployer of AI system"] = df["Alleged deployer of AI system"].apply(parse_json_array)
    df["Alleged developer of AI system"] = df["Alleged developer of AI system"].apply(parse_json_array)
    df["Alleged harmed or nearly harmed parties"] = df["Alleged harmed or nearly harmed parties"].apply(parse_json_array)
    df["date"] = pd.to_datetime(df["date"], errors="coerce").dt.date
    return df


def load_reports(path):
    df = pd.read_csv(path, encoding="utf-8")
    df["date_published"] = pd.to_datetime(df["date_published"], errors="coerce").dt.date
    return df


def load_mit_classifications(path):
    return pd.read_csv(path, encoding="utf-8")


def insert_incidents(cur, df):
    rows = [
        (
            int(r["incident_id"]),
            r["title"] if pd.notna(r["title"]) else None,
            r["description"] if pd.notna(r["description"]) else None,
            r["date"] if pd.notna(r["date"]) else None,
            r["Alleged deployer of AI system"],
            r["Alleged developer of AI system"],
            r["Alleged harmed or nearly harmed parties"],
        )
        for _, r in df.iterrows()
    ]
    execute_values(
        cur,
        """
        INSERT INTO incident (incident_id, title, description, incident_date,
                               alleged_deployer, alleged_developer, harmed_parties)
        VALUES %s
        ON CONFLICT (incident_id) DO NOTHING
        """,
        rows,
    )


def insert_reports(cur, df):
    rows = [
        (
            int(r["report_number"]),
            r["title"] if pd.notna(r["title"]) else None,
            r["text"] if pd.notna(r["text"]) else None,
            r["url"] if pd.notna(r["url"]) else None,
            r["source_domain"] if pd.notna(r["source_domain"]) else None,
            r["authors"] if pd.notna(r["authors"]) else None,
            r["date_published"] if pd.notna(r["date_published"]) else None,
            r["language"] if pd.notna(r["language"]) else None,
        )
        for _, r in df.iterrows()
    ]
    execute_values(
        cur,
        """
        INSERT INTO report (report_number, title, text, url, source_domain,
                             authors, published_date, language)
        VALUES %s
        ON CONFLICT (report_number) DO NOTHING
        """,
        rows,
    )


def insert_incident_reports(cur, incidents_df, valid_report_numbers):
    rows = []
    for _, r in incidents_df.iterrows():
        incident_id = int(r["incident_id"])
        for report_number in r["reports"]:
            if report_number in valid_report_numbers:
                rows.append((incident_id, report_number))
    execute_values(
        cur,
        """
        INSERT INTO incident_report (incident_id, report_id)
        VALUES %s
        ON CONFLICT DO NOTHING
        """,
        rows,
    )


def insert_mit_classifications(cur, df):
    rows = [
        (
            int(r["Incident ID"]),
            r["Risk Domain"] if pd.notna(r["Risk Domain"]) else None,
            r["Risk Subdomain"] if pd.notna(r["Risk Subdomain"]) else None,
            r["Entity"] if pd.notna(r["Entity"]) else None,
            r["Timing"] if pd.notna(r["Timing"]) else None,
            r["Intent"] if pd.notna(r["Intent"]) else None,
            bool(r["Published"]) if pd.notna(r["Published"]) else None,
        )
        for _, r in df.iterrows()
    ]
    execute_values(
        cur,
        """
        INSERT INTO mit_classification (incident_id, risk_domain, risk_subdomain,
                                         causal_entity, timing, intent, published)
        VALUES %s
        """,
        rows,
    )


def main():
    incidents_df = load_incidents(os.path.join(SEED_DATA_DIR, "incidents.csv"))
    reports_df = load_reports(os.path.join(SEED_DATA_DIR, "reports.csv"))
    mit_df = load_mit_classifications(os.path.join(SEED_DATA_DIR, "classifications_MIT.csv"))

    conn = get_conn()
    try:
        with conn:
            with conn.cursor() as cur:
                insert_incidents(cur, incidents_df)
                insert_reports(cur, reports_df)
                insert_incident_reports(cur, incidents_df, set(reports_df["report_number"]))
                insert_mit_classifications(cur, mit_df)
        print("Seed import complete.")
        print(f"  incidents: {len(incidents_df)}")
        print(f"  reports: {len(reports_df)}")
        print(f"  mit_classifications: {len(mit_df)}")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
