-- Add price_status enum
CREATE TYPE price_status AS ENUM ('draft', 'pending_approval', 'negotiation', 'approved');

-- Add pricing fields to report_requests table
ALTER TABLE report_requests
ADD COLUMN price_per_sq NUMERIC(10, 2),
ADD COLUMN total_price NUMERIC(10, 2),
ADD COLUMN counter_price NUMERIC(10, 2),
ADD COLUMN price_status price_status DEFAULT 'draft';

-- Add indexes for better query performance
CREATE INDEX idx_report_requests_price_status ON report_requests(price_status);

-- Add comment for documentation
COMMENT ON COLUMN report_requests.price_per_sq IS 'Price per square foot for the roofing job';
COMMENT ON COLUMN report_requests.total_price IS 'Total calculated price for the job';
COMMENT ON COLUMN report_requests.counter_price IS 'Owner counter-offer price per square';
COMMENT ON COLUMN report_requests.price_status IS 'Status of the pricing proposal workflow';
