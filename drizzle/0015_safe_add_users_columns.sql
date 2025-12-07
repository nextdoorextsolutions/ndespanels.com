-- Migration: Ensure all users table columns exist
-- Safe to run multiple times (uses IF NOT EXISTS)

DO $$ 
BEGIN
    -- Add stripe_customer_id if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'stripe_customer_id'
    ) THEN
        ALTER TABLE "users" ADD COLUMN "stripe_customer_id" varchar(255);
    END IF;

    -- Add rep_code if missing  
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'rep_code'
    ) THEN
        ALTER TABLE "users" ADD COLUMN "rep_code" varchar(20);
    END IF;

    -- Add team_lead_id if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'team_lead_id'
    ) THEN
        ALTER TABLE "users" ADD COLUMN "team_lead_id" integer;
    END IF;
END $$;
