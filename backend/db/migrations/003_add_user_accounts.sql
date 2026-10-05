-- Phase 5: user accounts for email/password and Google sign-in, with an
-- 'admin' role (see phase5.md). "user" is a reserved word in Postgres, so raw
-- SQL must always double-quote it: unquoted, SELECT * FROM user returns the
-- current role instead of this table. SQLAlchemy quotes it automatically.
-- Idempotent: safe to re-run (IF NOT EXISTS).
CREATE TABLE IF NOT EXISTS "user" (
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
