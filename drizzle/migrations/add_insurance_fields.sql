-- Add missing insurance-specific fields to report_requests table
-- Migration: add_insurance_fields
-- Created: 2024-12-09
-- Note: insurance_carrier and claim_number already exist

-- Add policy_number field
ALTER TABLE report_requests
ADD COLUMN IF NOT EXISTS policy_number VARCHAR(100);

-- Add deductible field
ALTER TABLE report_requests
ADD COLUMN IF NOT EXISTS deductible NUMERIC(10,2);

-- Add index for policy number lookups
CREATE INDEX IF NOT EXISTS idx_report_requests_policy_number ON report_requests(policy_number);

-- Add comments for documentation
COMMENT ON COLUMN report_requests.policy_number IS 'Customer policy number with insurance carrier';
COMMENT ON COLUMN report_requests.deductible IS 'Customer deductible amount in dollars';
