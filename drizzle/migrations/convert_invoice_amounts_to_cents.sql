-- Migration: Convert invoice amounts from string (dollars) to integer (cents)
-- This ensures consistency with change_orders which use integer cents

BEGIN;

-- Step 1: Add new integer columns
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS amount_cents INTEGER;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax_amount_cents INTEGER;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS total_amount_cents INTEGER;

-- Step 2: Migrate existing data from string dollars to integer cents
-- CRITICAL: Use ROUND() to avoid floating point errors (e.g., 19.99 * 100 = 1998.9999999)
-- Convert string to numeric, multiply by 100, round to nearest integer
UPDATE invoices 
SET 
  amount_cents = ROUND((CAST(amount AS NUMERIC) * 100))::INTEGER,
  tax_amount_cents = ROUND((CAST(tax_amount AS NUMERIC) * 100))::INTEGER,
  total_amount_cents = ROUND((CAST(total_amount AS NUMERIC) * 100))::INTEGER
WHERE amount_cents IS NULL;

-- Step 3: Make new columns NOT NULL after data migration
ALTER TABLE invoices ALTER COLUMN amount_cents SET NOT NULL;
ALTER TABLE invoices ALTER COLUMN tax_amount_cents SET NOT NULL;
ALTER TABLE invoices ALTER COLUMN total_amount_cents SET NOT NULL;

-- Step 4: Drop old string columns
ALTER TABLE invoices DROP COLUMN IF EXISTS amount;
ALTER TABLE invoices DROP COLUMN IF EXISTS tax_amount;
ALTER TABLE invoices DROP COLUMN IF EXISTS total_amount;

-- Step 5: Rename new columns to replace old ones
ALTER TABLE invoices RENAME COLUMN amount_cents TO amount;
ALTER TABLE invoices RENAME COLUMN tax_amount_cents TO tax_amount;
ALTER TABLE invoices RENAME COLUMN total_amount_cents TO total_amount;

-- Add comment explaining the data type
COMMENT ON COLUMN invoices.amount IS 'Invoice amount in cents (integer)';
COMMENT ON COLUMN invoices.tax_amount IS 'Tax amount in cents (integer)';
COMMENT ON COLUMN invoices.total_amount IS 'Total amount in cents (integer)';

COMMIT;
