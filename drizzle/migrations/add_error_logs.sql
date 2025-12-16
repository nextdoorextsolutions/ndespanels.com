-- Add error_logs table for internal crash reporting
-- Run this migration: psql $DATABASE_URL -f drizzle/migrations/add_error_logs.sql

CREATE TABLE IF NOT EXISTS error_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  user_role VARCHAR(50),
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  page_url VARCHAR(1000),
  browser_info TEXT,
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index for querying unresolved errors
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON error_logs(resolved);

-- Index for querying by user
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id);

-- Index for querying by date
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at DESC);
