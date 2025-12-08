-- Migration: Add job_attachments and job_message_reads tables
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. Create job_attachments table
-- ============================================
CREATE TABLE IF NOT EXISTS job_attachments (
  id SERIAL PRIMARY KEY,
  job_id INTEGER NOT NULL,
  activity_id INTEGER,
  file_name VARCHAR(255) NOT NULL,
  file_url VARCHAR(1000) NOT NULL,
  file_type VARCHAR(100),
  file_size INTEGER,
  uploaded_by INTEGER,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Add indexes for job_attachments
CREATE INDEX IF NOT EXISTS idx_job_attachments_job_id ON job_attachments(job_id);
CREATE INDEX IF NOT EXISTS idx_job_attachments_activity_id ON job_attachments(activity_id);
CREATE INDEX IF NOT EXISTS idx_job_attachments_uploaded_by ON job_attachments(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_job_attachments_created_at ON job_attachments(created_at DESC);

-- Add foreign key constraints (optional, adjust table names if needed)
-- ALTER TABLE job_attachments ADD CONSTRAINT fk_job_attachments_job 
--   FOREIGN KEY (job_id) REFERENCES report_requests(id) ON DELETE CASCADE;
-- ALTER TABLE job_attachments ADD CONSTRAINT fk_job_attachments_activity 
--   FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE;

-- ============================================
-- 2. Create job_message_reads table
-- ============================================
CREATE TABLE IF NOT EXISTS job_message_reads (
  id SERIAL PRIMARY KEY,
  job_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  last_read_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Add indexes for job_message_reads
CREATE INDEX IF NOT EXISTS idx_job_message_reads_job_id ON job_message_reads(job_id);
CREATE INDEX IF NOT EXISTS idx_job_message_reads_user_id ON job_message_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_job_message_reads_job_user ON job_message_reads(job_id, user_id);

-- Add unique constraint to prevent duplicate records per user per job
CREATE UNIQUE INDEX IF NOT EXISTS idx_job_message_reads_unique 
  ON job_message_reads(job_id, user_id);

-- Add foreign key constraints (optional, adjust table names if needed)
-- ALTER TABLE job_message_reads ADD CONSTRAINT fk_job_message_reads_job 
--   FOREIGN KEY (job_id) REFERENCES report_requests(id) ON DELETE CASCADE;
-- ALTER TABLE job_message_reads ADD CONSTRAINT fk_job_message_reads_user 
--   FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- ============================================
-- 3. Grant permissions (adjust as needed for your setup)
-- ============================================
-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON job_attachments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON job_message_reads TO authenticated;

-- Grant sequence usage
GRANT USAGE, SELECT ON SEQUENCE job_attachments_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE job_message_reads_id_seq TO authenticated;

-- ============================================
-- 4. Verify tables were created
-- ============================================
-- Run these to verify:
-- SELECT * FROM job_attachments LIMIT 1;
-- SELECT * FROM job_message_reads LIMIT 1;

-- Check indexes:
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename IN ('job_attachments', 'job_message_reads');

-- ============================================
-- 5. Create notification_type enum and notifications table
-- ============================================
CREATE TYPE notification_type AS ENUM ('mention', 'assignment', 'status_change');

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  created_by INTEGER,
  resource_id INTEGER NOT NULL,
  type notification_type DEFAULT 'mention' NOT NULL,
  content TEXT,
  is_read BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Add indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_by ON notifications(created_by);
CREATE INDEX IF NOT EXISTS idx_notifications_resource_id ON notifications(resource_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE notifications_id_seq TO authenticated;

-- Verify:
-- SELECT * FROM notifications LIMIT 1;
