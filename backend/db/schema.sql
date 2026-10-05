CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE incident (
    id              SERIAL PRIMARY KEY,
    incident_id     INTEGER NOT NULL UNIQUE,
    title           TEXT,
    description     TEXT,
    incident_date   DATE,
    alleged_deployer  TEXT[],
    alleged_developer TEXT[],
    harmed_parties    TEXT[],
    embedding       VECTOR(384)     -- multi-qa-MiniLM-L6-cos-v1 (Phase 3 semantic search)
);

CREATE TABLE report (
    id              SERIAL PRIMARY KEY,
    report_number   INTEGER NOT NULL UNIQUE,
    title           TEXT,
    text            TEXT,
    url             TEXT,
    source_domain   TEXT,
    authors         TEXT,
    published_date  DATE,
    language        TEXT,
    embedding       VECTOR(384)     -- multi-qa-MiniLM-L6-cos-v1 (Phase 3 semantic search)
);

CREATE TABLE incident_report (
    incident_id     INTEGER NOT NULL REFERENCES incident(incident_id),
    report_id       INTEGER NOT NULL REFERENCES report(report_number),
    PRIMARY KEY (incident_id, report_id)
);

CREATE TABLE mit_classification (
    id              SERIAL PRIMARY KEY,
    incident_id     INTEGER NOT NULL UNIQUE REFERENCES incident(incident_id),
    risk_domain     TEXT,
    risk_subdomain  TEXT,
    causal_entity   TEXT,
    timing          TEXT,
    intent          TEXT,
    published       BOOLEAN,
    confidence      REAL,          -- LLM self-reported confidence (0-1); NULL for human gold rows
    classified_by   TEXT,          -- 'human' (seed gold) or 'llm' (Phase 2 backfill)
    classified_at   TIMESTAMPTZ    -- when an LLM classification was written; NULL for gold rows
);

CREATE TABLE app_user (
    id                   SERIAL PRIMARY KEY,
    email                TEXT NOT NULL UNIQUE,  -- stored lower-cased
    username             TEXT NOT NULL UNIQUE,
    password_hash        TEXT,                  -- NULL for Google-only accounts
    google_sub           TEXT UNIQUE,           -- NULL for password-only accounts
    role                 TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    is_active            BOOLEAN NOT NULL DEFAULT TRUE,
    email_notifications  BOOLEAN NOT NULL DEFAULT TRUE,  -- monthly summary email (later phase)
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_incident_date ON incident(incident_date);
CREATE INDEX idx_mit_classification_incident_id ON mit_classification(incident_id);
CREATE INDEX idx_mit_classification_risk_domain ON mit_classification(risk_domain);
