-- Performance Indexes for Supabase/PostgreSQL
-- Apply these indexes to speed up common queries

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_open_id ON users(open_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Report requests (jobs) table indexes
CREATE INDEX IF NOT EXISTS idx_report_requests_email ON report_requests(email);
CREATE INDEX IF NOT EXISTS idx_report_requests_phone ON report_requests(phone);
CREATE INDEX IF NOT EXISTS idx_report_requests_status ON report_requests(status);
CREATE INDEX IF NOT EXISTS idx_report_requests_assigned_to ON report_requests(assigned_to);
CREATE INDEX IF NOT EXISTS idx_report_requests_team_lead_id ON report_requests(team_lead_id);
CREATE INDEX IF NOT EXISTS idx_report_requests_created_at ON report_requests(created_at);

-- Activities table indexes
CREATE INDEX IF NOT EXISTS idx_activities_report_request_id ON activities(report_request_id);
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at);

-- Documents table indexes
CREATE INDEX IF NOT EXISTS idx_documents_report_request_id ON documents(report_request_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);

-- Notifications table indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_report_requests_assigned_status ON report_requests(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_activities_job_time ON activities(report_request_id, created_at DESC);
