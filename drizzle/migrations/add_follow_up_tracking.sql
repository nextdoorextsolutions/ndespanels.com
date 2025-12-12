-- Add follow-up tracking fields to report_requests table
ALTER TABLE report_requests 
ADD COLUMN needs_follow_up BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN follow_up_requested_at TIMESTAMP,
ADD COLUMN follow_up_requested_by INTEGER;

-- Add index for faster filtering of jobs needing follow-up
CREATE INDEX idx_report_requests_needs_follow_up ON report_requests(needs_follow_up) WHERE needs_follow_up = true;
