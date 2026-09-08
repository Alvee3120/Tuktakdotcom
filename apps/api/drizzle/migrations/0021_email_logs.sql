-- Email Logs table for tracking sent emails
CREATE TABLE IF NOT EXISTS email_logs (
  id TEXT PRIMARY KEY,
  "to" TEXT NOT NULL,
  subject TEXT NOT NULL,
  template TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
  order_id TEXT,
  error TEXT,
  created_at TEXT NOT NULL
);

-- Indexes for email_logs
CREATE INDEX IF NOT EXISTS email_logs_order_idx ON email_logs(order_id);
CREATE INDEX IF NOT EXISTS email_logs_status_idx ON email_logs(status);
CREATE INDEX IF NOT EXISTS email_logs_created_idx ON email_logs(created_at);
