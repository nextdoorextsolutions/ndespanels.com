-- Migration: Expand lead form with optional contact info, secondary contact, and site details
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. Make email and phone optional (remove NOT NULL constraint)
-- ============================================
ALTER TABLE report_requests ALTER COLUMN email DROP NOT NULL;
ALTER TABLE report_requests ALTER COLUMN phone DROP NOT NULL;

-- ============================================
-- 2. Add secondary contact columns
-- ============================================
ALTER TABLE report_requests ADD COLUMN IF NOT EXISTS secondary_first_name VARCHAR(100);
ALTER TABLE report_requests ADD COLUMN IF NOT EXISTS secondary_last_name VARCHAR(100);
ALTER TABLE report_requests ADD COLUMN IF NOT EXISTS secondary_phone VARCHAR(50);
ALTER TABLE report_requests ADD COLUMN IF NOT EXISTS secondary_email VARCHAR(320);
ALTER TABLE report_requests ADD COLUMN IF NOT EXISTS secondary_relation VARCHAR(50);

-- ============================================
-- 3. Add site access columns
-- ============================================
ALTER TABLE report_requests ADD COLUMN IF NOT EXISTS gate_code VARCHAR(50);
ALTER TABLE report_requests ADD COLUMN IF NOT EXISTS access_instructions TEXT;

-- ============================================
-- 4. Add insurance columns
-- ============================================
ALTER TABLE report_requests ADD COLUMN IF NOT EXISTS insurance_carrier VARCHAR(200);
ALTER TABLE report_requests ADD COLUMN IF NOT EXISTS claim_number VARCHAR(100);

-- ============================================
-- 5. Create indexes for new searchable fields
-- ============================================
CREATE INDEX IF NOT EXISTS idx_report_requests_secondary_email ON report_requests(secondary_email);
CREATE INDEX IF NOT EXISTS idx_report_requests_insurance_carrier ON report_requests(insurance_carrier);
CREATE INDEX IF NOT EXISTS idx_report_requests_claim_number ON report_requests(claim_number);

-- ============================================
-- 6. Verify changes
-- ============================================
-- Run this to verify the new columns exist:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'report_requests' 
-- AND column_name IN ('email', 'phone', 'secondary_first_name', 'secondary_last_name', 
--                     'secondary_phone', 'secondary_email', 'secondary_relation',
--                     'gate_code', 'access_instructions', 'insurance_carrier', 'claim_number')
-- ORDER BY column_name;
