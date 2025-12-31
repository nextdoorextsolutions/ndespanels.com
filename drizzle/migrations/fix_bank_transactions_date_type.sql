-- Fix bank_transactions.transaction_date column type from DATE to TIMESTAMP
-- This fixes the schema mismatch between migration and Drizzle schema

ALTER TABLE bank_transactions 
  ALTER COLUMN transaction_date TYPE TIMESTAMP USING transaction_date::timestamp;
