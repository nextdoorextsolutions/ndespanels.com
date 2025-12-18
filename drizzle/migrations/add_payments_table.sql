-- Create payment_method enum
DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('check', 'cash', 'wire', 'credit_card', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  report_request_id INTEGER NOT NULL REFERENCES report_requests(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- Amount in cents
  payment_date DATE NOT NULL,
  payment_method payment_method NOT NULL,
  check_number VARCHAR(100),
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payments_report_request_id ON payments(report_request_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_created_by ON payments(created_by);

-- Add comment
COMMENT ON TABLE payments IS 'Manual payment tracking for jobs - records checks, cash, wire transfers, etc.';
