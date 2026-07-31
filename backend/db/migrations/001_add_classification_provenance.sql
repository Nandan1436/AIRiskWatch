-- Add provenance columns to mit_classification so LLM-produced classifications
-- can be distinguished from the human-annotated gold set (Phase 2).
-- Idempotent: safe to re-run (IF NOT EXISTS + guarded UPDATE).

ALTER TABLE mit_classification
    ADD COLUMN IF NOT EXISTS confidence    REAL,
    ADD COLUMN IF NOT EXISTS classified_by TEXT,
    ADD COLUMN IF NOT EXISTS classified_at TIMESTAMPTZ;

-- Existing rows are the expert gold annotations imported from
-- classifications_MIT.csv. Only touches rows not yet stamped, so the second
-- run is a no-op (LLM rows are inserted with classified_by='llm').
UPDATE mit_classification
SET classified_by = 'human'
WHERE classified_by IS NULL;
