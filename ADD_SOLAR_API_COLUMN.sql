-- Add solar_api_data JSONB column to report_requests table
-- Run this in Supabase SQL Editor

ALTER TABLE report_requests 
ADD COLUMN IF NOT EXISTS solar_api_data JSONB;

-- Add index for faster queries on the JSON data
CREATE INDEX IF NOT EXISTS idx_report_requests_solar_api_data 
ON report_requests USING GIN (solar_api_data);

-- Add comment
COMMENT ON COLUMN report_requests.solar_api_data IS 'Google Solar API response data for roof measurements. Includes solarCoverage flag if API returns 404.';

-- Example structure:
-- {
--   "solarCoverage": true/false,
--   "buildingInsights": {...},
--   "solarPotential": {...},
--   "imageryUrl": "...",
--   "fetchedAt": "2024-12-08T..."
-- }
