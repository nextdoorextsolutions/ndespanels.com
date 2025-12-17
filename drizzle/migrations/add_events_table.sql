-- Add event_type enum
DO $$ BEGIN
  CREATE TYPE event_type AS ENUM ('inspection', 'call', 'meeting', 'zoom');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type event_type DEFAULT 'meeting' NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  job_id INTEGER REFERENCES report_requests(id) ON DELETE SET NULL,
  assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL NOT NULL,
  location TEXT,
  meeting_url TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time);
CREATE INDEX IF NOT EXISTS idx_events_assigned_to ON events(assigned_to);
CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by);
CREATE INDEX IF NOT EXISTS idx_events_job_id ON events(job_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);

-- Enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view events assigned to them or created by them"
  ON events FOR SELECT
  USING (
    assigned_to = (SELECT id FROM users WHERE email = current_user)
    OR created_by = (SELECT id FROM users WHERE email = current_user)
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE email = current_user 
      AND role IN ('owner', 'admin', 'office')
    )
  );

CREATE POLICY "Users can create events"
  ON events FOR INSERT
  WITH CHECK (
    created_by = (SELECT id FROM users WHERE email = current_user)
  );

CREATE POLICY "Users can update their own events or if they are owner/admin"
  ON events FOR UPDATE
  USING (
    created_by = (SELECT id FROM users WHERE email = current_user)
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE email = current_user 
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can delete their own events or if they are owner/admin"
  ON events FOR DELETE
  USING (
    created_by = (SELECT id FROM users WHERE email = current_user)
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE email = current_user 
      AND role IN ('owner', 'admin')
    )
  );
