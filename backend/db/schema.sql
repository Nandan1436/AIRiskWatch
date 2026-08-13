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

CREATE INDEX idx_incident_date ON incident(incident_date);
CREATE INDEX idx_mit_classification_incident_id ON mit_classification(incident_id);
CREATE INDEX idx_mit_classification_risk_domain ON mit_classification(risk_domain);
