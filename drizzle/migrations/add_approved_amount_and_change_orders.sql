-- Add approved amount and change order fields to report_requests table
-- Migration: add_approved_amount_and_change_orders.sql
-- Date: 2024-12-15

-- Add approved amount field (shown after approval status)
ALTER TABLE report_requests ADD COLUMN IF NOT EXISTS approved_amount NUMERIC(10, 2);

-- Add change order fields (shown when status is completed or later)
ALTER TABLE report_requests ADD COLUMN IF NOT EXISTS extras_charged NUMERIC(10, 2);
ALTER TABLE report_requests ADD COLUMN IF NOT EXISTS supplement_numbers TEXT;

-- Add comments for documentation
COMMENT ON COLUMN report_requests.approved_amount IS 'Initial approved amount for the project (visible after approval)';
COMMENT ON COLUMN report_requests.extras_charged IS 'Additional charges for extras/change orders (visible when completed)';
COMMENT ON COLUMN report_requests.supplement_numbers IS 'Supplement numbers for insurance claims (visible when completed)';
