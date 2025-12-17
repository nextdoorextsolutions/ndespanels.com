-- Add Commissions & Bonus System Tables
-- Migration created: 2024-12-16

-- Create enums for bonus period and commission status
DO $$ BEGIN
  CREATE TYPE bonus_period AS ENUM ('weekly', 'monthly', 'quarterly');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE commission_status AS ENUM ('pending', 'approved', 'denied');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create bonus_tiers table
CREATE TABLE IF NOT EXISTS bonus_tiers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  required_deals INTEGER NOT NULL,
  bonus_amount NUMERIC(10, 2) NOT NULL,
  period bonus_period NOT NULL DEFAULT 'weekly',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create commission_requests table
CREATE TABLE IF NOT EXISTS commission_requests (
  id SERIAL PRIMARY KEY,
  job_id INTEGER NOT NULL REFERENCES report_requests(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payment_id VARCHAR(255),
  status commission_status NOT NULL DEFAULT 'pending',
  denial_reason TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_bonus_tiers_user_id ON bonus_tiers(user_id);
CREATE INDEX IF NOT EXISTS idx_bonus_tiers_period ON bonus_tiers(period);

CREATE INDEX IF NOT EXISTS idx_commission_requests_job_id ON commission_requests(job_id);
CREATE INDEX IF NOT EXISTS idx_commission_requests_user_id ON commission_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_commission_requests_status ON commission_requests(status);
CREATE INDEX IF NOT EXISTS idx_commission_requests_created_at ON commission_requests(created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE bonus_tiers IS 'Defines commission and bonus rules per user';
COMMENT ON TABLE commission_requests IS 'Tracks deals claimed by sales reps for commission';

COMMENT ON COLUMN bonus_tiers.required_deals IS 'Number of deals required to earn the bonus';
COMMENT ON COLUMN bonus_tiers.bonus_amount IS 'Bonus amount in dollars';
COMMENT ON COLUMN bonus_tiers.period IS 'Time period for bonus calculation (weekly, monthly, quarterly)';

COMMENT ON COLUMN commission_requests.job_id IS 'Reference to the job/deal being claimed';
COMMENT ON COLUMN commission_requests.user_id IS 'Sales rep claiming the commission';
COMMENT ON COLUMN commission_requests.payment_id IS 'Reference to collected payment/check';
COMMENT ON COLUMN commission_requests.status IS 'Approval status (pending, approved, denied)';
COMMENT ON COLUMN commission_requests.denial_reason IS 'Reason for denial if status is denied';
