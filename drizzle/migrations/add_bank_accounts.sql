-- Create bank account type enum
DO $$ BEGIN
  CREATE TYPE bank_account_type AS ENUM ('checking', 'savings', 'credit_card', 'line_of_credit');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create bank accounts table
CREATE TABLE IF NOT EXISTS bank_accounts (
  id SERIAL PRIMARY KEY,
  account_name VARCHAR(255) NOT NULL,
  account_type bank_account_type NOT NULL DEFAULT 'checking',
  account_number_last4 VARCHAR(4),
  institution_name VARCHAR(255),
  credit_limit NUMERIC(12, 2),
  current_balance NUMERIC(12, 2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Add account_id to bank_transactions table
ALTER TABLE bank_transactions 
ADD COLUMN IF NOT EXISTS account_id INTEGER REFERENCES bank_accounts(id) ON DELETE SET NULL;

-- Create index on account_id for faster queries
CREATE INDEX IF NOT EXISTS idx_bank_transactions_account_id ON bank_transactions(account_id);

-- Create index on account_type for filtering
CREATE INDEX IF NOT EXISTS idx_bank_accounts_type ON bank_accounts(account_type);

-- Create index on is_active for filtering active accounts
CREATE INDEX IF NOT EXISTS idx_bank_accounts_active ON bank_accounts(is_active);

-- Insert default checking account if none exists
INSERT INTO bank_accounts (account_name, account_type, institution_name, is_active)
SELECT 'Chase Business Checking', 'checking', 'Chase Bank', true
WHERE NOT EXISTS (SELECT 1 FROM bank_accounts WHERE account_name = 'Chase Business Checking');

-- Update existing transactions to use the default account
UPDATE bank_transactions 
SET account_id = (SELECT id FROM bank_accounts WHERE account_name = 'Chase Business Checking' LIMIT 1)
WHERE account_id IS NULL;

-- Enable RLS
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for bank_accounts
DROP POLICY IF EXISTS "Users can view all bank accounts" ON bank_accounts;
CREATE POLICY "Users can view all bank accounts" ON bank_accounts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert bank accounts" ON bank_accounts;
CREATE POLICY "Users can insert bank accounts" ON bank_accounts FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update bank accounts" ON bank_accounts;
CREATE POLICY "Users can update bank accounts" ON bank_accounts FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Users can delete bank accounts" ON bank_accounts;
CREATE POLICY "Users can delete bank accounts" ON bank_accounts FOR DELETE USING (true);
