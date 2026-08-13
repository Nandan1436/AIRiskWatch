-- Resize incident/report embedding columns from VECTOR(1536) (placeholder
-- OpenAI dimensionality) to VECTOR(384), matching the local sentence-transformer
-- (multi-qa-MiniLM-L6-cos-v1) chosen for Phase 3 semantic search — see
-- MIT_AI_RISK_REPOSITORY/AIRiskWatch_Design_Decisions_2026-08-01.md §1/§3.
-- pgvector can't ALTER a vector column's dimension in place; both columns are
-- unpopulated (NULL) at this point in the project, so drop+recreate is safe
-- and loses no data. Idempotent: skips the drop/add when already VECTOR(384).
DO $$
BEGIN
    IF (
        SELECT atttypmod FROM pg_attribute
        WHERE attrelid = 'incident'::regclass AND attname = 'embedding'
    ) IS DISTINCT FROM 384 THEN
        ALTER TABLE incident DROP COLUMN embedding;
        ALTER TABLE incident ADD COLUMN embedding VECTOR(384);
    END IF;

    IF (
        SELECT atttypmod FROM pg_attribute
        WHERE attrelid = 'report'::regclass AND attname = 'embedding'
    ) IS DISTINCT FROM 384 THEN
        ALTER TABLE report DROP COLUMN embedding;
        ALTER TABLE report ADD COLUMN embedding VECTOR(384);
    END IF;
END $$;
