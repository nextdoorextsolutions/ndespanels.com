-- Add ALL insurance-specific fields to report_requests table
-- Migration: add_insurance_fields
-- Created: 2024-12-09
-- These fields are required for LOA PDF generation

-- Add all insurance fields (IF NOT EXISTS prevents errors if some already exist)
ALTER TABLE report_requests
ADD COLUMN IF NOT EXISTS insurance_carrier VARCHAR(255),
ADD COLUMN IF NOT EXISTS policy_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS claim_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS deductible NUMERIC(10,2);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_report_requests_insurance_carrier ON report_requests(insurance_carrier);
CREATE INDEX IF NOT EXISTS idx_report_requests_policy_number ON report_requests(policy_number);
CREATE INDEX IF NOT EXISTS idx_report_requests_claim_number ON report_requests(claim_number);

-- Add comments for documentation
COMMENT ON COLUMN report_requests.insurance_carrier IS 'Name of insurance company (e.g., State Farm, Allstate, USAA)';
COMMENT ON COLUMN report_requests.policy_number IS 'Customer policy number with insurance carrier';
COMMENT ON COLUMN report_requests.claim_number IS 'Insurance claim number for this job';
COMMENT ON COLUMN report_requests.deductible IS 'Customer deductible amount in dollars';
