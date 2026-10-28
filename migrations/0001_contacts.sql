-- One row per POST /contact submission, whatever happened to it.
-- No raw IP addresses are stored.
CREATE TABLE IF NOT EXISTS contacts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at  TEXT    NOT NULL,              -- UTC ISO 8601, e.g. 2026-10-28T00:05:00.000Z
  name        TEXT,
  email       TEXT,
  message     TEXT,
  status      TEXT    NOT NULL CHECK (status IN ('sent', 'send_failed', 'spam_dropped', 'invalid', 'rate_limited')),
  error       TEXT,                          -- error code/detail when status is send_failed or invalid
  message_id  TEXT,                          -- Email Service message id when status is sent
  user_agent  TEXT,
  country     TEXT                           -- request.cf.country (ISO 3166-1 alpha-2)
);

CREATE INDEX IF NOT EXISTS contacts_created_at ON contacts (created_at);
CREATE INDEX IF NOT EXISTS contacts_status ON contacts (status);
