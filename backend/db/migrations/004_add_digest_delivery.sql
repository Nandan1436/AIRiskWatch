-- Monthly digest email: one row per user recording the latest digest month
-- handled for them, so a re-run (cron, restart, or the admin button) never
-- mails the same digest twice. The row is overwritten each month, so the table
-- never grows past the user count. The digest content itself is not stored;
-- it is queried live from incident/report data.
-- Idempotent: safe to re-run (IF NOT EXISTS).
CREATE TABLE IF NOT EXISTS digest_delivery (
    user_id       INTEGER PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
    digest_month  DATE NOT NULL,  -- first day of the month the digest covers (not the send month)
    status        TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed')),
    sent_at       TIMESTAMPTZ
);
