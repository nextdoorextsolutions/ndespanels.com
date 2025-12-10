-- ============================================
-- CONSOLIDATED SUPABASE MIGRATION
-- NextDoor Exterior Solutions CRM Database
-- Generated: December 10, 2024
-- ============================================
-- ⚠️ STATUS: ALREADY APPLIED TO SUPABASE
-- This migration was successfully run on December 10, 2024
-- DO NOT re-run this file - it's for reference only
-- See SUPABASE_APPLIED.md for details
-- ============================================
-- This file contains all SQL migrations needed for Supabase.
-- All tables, enums, indexes, RLS policies, and permissions are live.
-- ============================================

-- ============================================
-- SECTION 1: CREATE ENUMS
-- ============================================

-- User roles
DO $$ BEGIN
  CREATE TYPE "user_role" AS ENUM ('user', 'admin', 'owner', 'office', 'sales_rep', 'project_manager', 'team_lead', 'field_crew');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Job/Lead status
DO $$ BEGIN
  CREATE TYPE "job_status" AS ENUM (
    'lead', 'appointment_set', 'prospect', 'approved', 
    'project_scheduled', 'completed', 'invoiced', 
    'lien_legal', 'closed_deal', 'closed_lost'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Deal type
DO $$ BEGIN
  CREATE TYPE "deal_type" AS ENUM ('insurance', 'cash', 'financed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Lien rights status
DO $$ BEGIN
  CREATE TYPE "lien_rights_status" AS ENUM (
    'not_applicable', 'active', 'warning', 'critical', 'expired', 'legal'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Activity type
DO $$ BEGIN
  CREATE TYPE "activity_type" AS ENUM (
    'status_change', 'note_added', 'call_logged', 'email_sent', 
    'sms_sent', 'appointment_scheduled', 'document_uploaded', 
    'payment_received', 'assigned', 'created', 'message', 
    'photo_uploaded', 'customer_message', 'callback_requested', 
    'inspection_complete'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Edit type
DO $$ BEGIN
  CREATE TYPE "edit_type" AS ENUM ('create', 'update', 'delete', 'assign', 'status_change');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Notification type
DO $$ BEGIN
  CREATE TYPE "notification_type" AS ENUM ('mention', 'assignment', 'status_change');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Price status
DO $$ BEGIN
  CREATE TYPE "price_status" AS ENUM ('draft', 'pending_approval', 'negotiation', 'approved');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Legal entity type
DO $$ BEGIN
  CREATE TYPE "legal_entity_type" AS ENUM ('LLC', 'Inc', 'Corp', 'Sole Proprietor', 'Partnership');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- SECTION 2: CREATE TABLES
-- ============================================

-- Users table
CREATE TABLE IF NOT EXISTS "users" (
  "id" SERIAL PRIMARY KEY,
  "open_id" VARCHAR(64) NOT NULL UNIQUE,
  "name" TEXT,
  "email" VARCHAR(320),
  "login_method" VARCHAR(64),
  "role" user_role NOT NULL DEFAULT 'user',
  "password" VARCHAR(255),
  "stripe_customer_id" VARCHAR(255),
  "rep_code" VARCHAR(20),
  "team_lead_id" INTEGER,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "last_signed_in" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Report requests (Jobs/Leads) table
CREATE TABLE IF NOT EXISTS "report_requests" (
  "id" SERIAL PRIMARY KEY,
  "full_name" VARCHAR(255) NOT NULL,
  "email" VARCHAR(320),
  "phone" VARCHAR(50),
  "address" VARCHAR(500) NOT NULL,
  "city_state_zip" VARCHAR(255) NOT NULL,
  "roof_age" VARCHAR(50),
  "promo_code" VARCHAR(50),
  "promo_applied" BOOLEAN NOT NULL DEFAULT false,
  "amount_paid" INTEGER NOT NULL DEFAULT 0,
  "stripe_payment_intent_id" VARCHAR(255),
  "stripe_checkout_session_id" VARCHAR(255),
  "status" job_status NOT NULL DEFAULT 'lead',
  "roof_concerns" TEXT,
  "hands_on_inspection" BOOLEAN DEFAULT false NOT NULL,
  "assigned_to" INTEGER,
  "team_lead_id" INTEGER,
  "deal_type" deal_type,
  "project_completed_at" TIMESTAMP,
  "lien_rights_status" lien_rights_status DEFAULT 'not_applicable',
  "lien_rights_expires_at" TIMESTAMP,
  "last_lien_rights_notification" TIMESTAMP,
  "customer_status_message" TEXT,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Secondary contact fields
  "secondary_first_name" VARCHAR(100),
  "secondary_last_name" VARCHAR(100),
  "secondary_phone" VARCHAR(50),
  "secondary_email" VARCHAR(320),
  "secondary_relation" VARCHAR(50),
  
  -- Site access fields
  "gate_code" VARCHAR(50),
  "access_instructions" TEXT,
  
  -- Insurance fields
  "insurance_carrier" VARCHAR(255),
  "policy_number" VARCHAR(100),
  "claim_number" VARCHAR(100),
  "deductible" NUMERIC(10,2),
  
  -- Pricing fields
  "price_per_sq" NUMERIC(10, 2),
  "total_price" NUMERIC(10, 2),
  "counter_price" NUMERIC(10, 2),
  "price_status" price_status DEFAULT 'draft',
  
  -- Manual area override
  "manual_area_sqft" INTEGER,
  
  -- JSON data fields
  "solar_api_data" JSONB,
  "estimator_data" JSONB
);

-- Activities table
CREATE TABLE IF NOT EXISTS "activities" (
  "id" SERIAL PRIMARY KEY,
  "report_request_id" INTEGER NOT NULL,
  "user_id" INTEGER,
  "activity_type" activity_type NOT NULL,
  "description" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Documents table
CREATE TABLE IF NOT EXISTS "documents" (
  "id" SERIAL PRIMARY KEY,
  "report_request_id" INTEGER NOT NULL,
  "file_name" VARCHAR(255) NOT NULL,
  "file_url" VARCHAR(1000) NOT NULL,
  "file_type" VARCHAR(100),
  "file_size" INTEGER,
  "category" VARCHAR(100),
  "uploaded_by" INTEGER,
  "photo_taken_at" TIMESTAMP,
  "latitude" VARCHAR(50),
  "longitude" VARCHAR(50),
  "camera_model" VARCHAR(100),
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Edit history table
CREATE TABLE IF NOT EXISTS "edit_history" (
  "id" SERIAL PRIMARY KEY,
  "report_request_id" INTEGER NOT NULL,
  "user_id" INTEGER NOT NULL,
  "field_name" VARCHAR(100) NOT NULL,
  "old_value" TEXT,
  "new_value" TEXT,
  "edit_type" edit_type NOT NULL DEFAULT 'update',
  "ip_address" VARCHAR(45),
  "user_agent" VARCHAR(500),
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Job attachments table
CREATE TABLE IF NOT EXISTS "job_attachments" (
  "id" SERIAL PRIMARY KEY,
  "job_id" INTEGER NOT NULL,
  "activity_id" INTEGER,
  "file_name" VARCHAR(255) NOT NULL,
  "file_url" VARCHAR(1000) NOT NULL,
  "file_type" VARCHAR(100),
  "file_size" INTEGER,
  "uploaded_by" INTEGER,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Job message reads table
CREATE TABLE IF NOT EXISTS "job_message_reads" (
  "id" SERIAL PRIMARY KEY,
  "job_id" INTEGER NOT NULL,
  "user_id" INTEGER NOT NULL,
  "last_read_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Notifications table
CREATE TABLE IF NOT EXISTS "notifications" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL,
  "created_by" INTEGER,
  "resource_id" INTEGER NOT NULL,
  "type" notification_type DEFAULT 'mention' NOT NULL,
  "content" TEXT,
  "is_read" BOOLEAN DEFAULT FALSE NOT NULL,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Company settings table
CREATE TABLE IF NOT EXISTS "company_settings" (
  "id" SERIAL PRIMARY KEY,
  
  -- Identity & Branding
  "company_name" VARCHAR(255) NOT NULL DEFAULT 'NextDoor Exterior Solutions',
  "legal_entity_type" legal_entity_type,
  "dba_name" VARCHAR(255),
  "logo_url" VARCHAR(500),
  
  -- Contact Information
  "company_email" VARCHAR(320),
  "company_phone" VARCHAR(50),
  "website_url" VARCHAR(500),
  
  -- Physical Address
  "address" TEXT,
  "city" VARCHAR(100),
  "state" VARCHAR(2),
  "zip_code" VARCHAR(10),
  
  -- Tax & Registration
  "tax_id" VARCHAR(20),
  
  -- Credentials (Critical for Proposals)
  "contractor_license_number" VARCHAR(50),
  "additional_licenses" JSONB,
  "insurance_policy_number" VARCHAR(100),
  "insurance_expiration_date" TIMESTAMP,
  "insurance_provider" VARCHAR(255),
  "bonding_info" TEXT,
  
  -- Business Defaults
  "quote_expiration_days" INTEGER DEFAULT 30,
  "labor_warranty_years" INTEGER DEFAULT 10,
  "material_warranty_years" INTEGER DEFAULT 25,
  "default_deposit_percent" NUMERIC(5, 2) DEFAULT 50.00,
  "payment_terms" TEXT,
  
  -- Legal & Compliance
  "terms_and_conditions" TEXT,
  "cancellation_policy" TEXT,
  "privacy_policy_url" VARCHAR(500),
  
  -- Supplier Defaults
  "beacon_account_number" VARCHAR(100),
  "beacon_branch_code" VARCHAR(50),
  "preferred_supplier" VARCHAR(100) DEFAULT 'Beacon',
  "default_shingle_brand" VARCHAR(100) DEFAULT 'GAF Timberline HDZ',
  
  -- Metadata
  "updated_by" INTEGER,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ============================================
-- SECTION 3: ADD UNIQUE CONSTRAINTS
-- ============================================

-- Add unique constraint to users.email
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'users_email_unique'
    ) THEN
        ALTER TABLE "users" ADD CONSTRAINT "users_email_unique" UNIQUE ("email");
    END IF;
END $$;

-- Add unique constraint to job_message_reads
CREATE UNIQUE INDEX IF NOT EXISTS "idx_job_message_reads_unique" 
  ON "job_message_reads"("job_id", "user_id");

-- ============================================
-- SECTION 4: CREATE INDEXES
-- ============================================

-- Users table indexes
CREATE INDEX IF NOT EXISTS "idx_users_open_id" ON "users"("open_id");
CREATE INDEX IF NOT EXISTS "idx_users_email" ON "users"("email");
CREATE INDEX IF NOT EXISTS "idx_users_role" ON "users"("role");
CREATE INDEX IF NOT EXISTS "idx_users_team_lead_id" ON "users"("team_lead_id");

-- Report requests (jobs) table indexes
CREATE INDEX IF NOT EXISTS "idx_report_requests_email" ON "report_requests"("email");
CREATE INDEX IF NOT EXISTS "idx_report_requests_phone" ON "report_requests"("phone");
CREATE INDEX IF NOT EXISTS "idx_report_requests_status" ON "report_requests"("status");
CREATE INDEX IF NOT EXISTS "idx_report_requests_assigned_to" ON "report_requests"("assigned_to");
CREATE INDEX IF NOT EXISTS "idx_report_requests_team_lead_id" ON "report_requests"("team_lead_id");
CREATE INDEX IF NOT EXISTS "idx_report_requests_created_at" ON "report_requests"("created_at");
CREATE INDEX IF NOT EXISTS "idx_report_requests_deal_type" ON "report_requests"("deal_type");
CREATE INDEX IF NOT EXISTS "idx_report_requests_lien_rights_status" ON "report_requests"("lien_rights_status");
CREATE INDEX IF NOT EXISTS "idx_report_requests_price_status" ON "report_requests"("price_status");
CREATE INDEX IF NOT EXISTS "idx_report_requests_secondary_email" ON "report_requests"("secondary_email");
CREATE INDEX IF NOT EXISTS "idx_report_requests_insurance_carrier" ON "report_requests"("insurance_carrier");
CREATE INDEX IF NOT EXISTS "idx_report_requests_policy_number" ON "report_requests"("policy_number");
CREATE INDEX IF NOT EXISTS "idx_report_requests_claim_number" ON "report_requests"("claim_number");

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS "idx_report_requests_assigned_status" ON "report_requests"("assigned_to", "status");
CREATE INDEX IF NOT EXISTS "idx_report_requests_status_assigned" ON "report_requests"("status", "assigned_to");

-- GIN indexes for JSONB fields
CREATE INDEX IF NOT EXISTS "idx_report_requests_solar_api_data" 
  ON "report_requests" USING GIN ("solar_api_data");
CREATE INDEX IF NOT EXISTS "idx_report_requests_estimator_data" 
  ON "report_requests" USING GIN ("estimator_data");

-- Activities table indexes
CREATE INDEX IF NOT EXISTS "idx_activities_report_request_id" ON "activities"("report_request_id");
CREATE INDEX IF NOT EXISTS "idx_activities_user_id" ON "activities"("user_id");
CREATE INDEX IF NOT EXISTS "idx_activities_created_at" ON "activities"("created_at");
CREATE INDEX IF NOT EXISTS "idx_activities_job_time" ON "activities"("report_request_id", "created_at" DESC);

-- Documents table indexes
CREATE INDEX IF NOT EXISTS "idx_documents_report_request_id" ON "documents"("report_request_id");
CREATE INDEX IF NOT EXISTS "idx_documents_uploaded_by" ON "documents"("uploaded_by");
CREATE INDEX IF NOT EXISTS "idx_documents_category" ON "documents"("category");

-- Edit history table indexes
CREATE INDEX IF NOT EXISTS "idx_edit_history_report_request_id" ON "edit_history"("report_request_id");
CREATE INDEX IF NOT EXISTS "idx_edit_history_user_id" ON "edit_history"("user_id");

-- Job attachments indexes
CREATE INDEX IF NOT EXISTS "idx_job_attachments_job_id" ON "job_attachments"("job_id");
CREATE INDEX IF NOT EXISTS "idx_job_attachments_activity_id" ON "job_attachments"("activity_id");
CREATE INDEX IF NOT EXISTS "idx_job_attachments_uploaded_by" ON "job_attachments"("uploaded_by");
CREATE INDEX IF NOT EXISTS "idx_job_attachments_created_at" ON "job_attachments"("created_at" DESC);

-- Job message reads indexes
CREATE INDEX IF NOT EXISTS "idx_job_message_reads_job_id" ON "job_message_reads"("job_id");
CREATE INDEX IF NOT EXISTS "idx_job_message_reads_user_id" ON "job_message_reads"("user_id");
CREATE INDEX IF NOT EXISTS "idx_job_message_reads_job_user" ON "job_message_reads"("job_id", "user_id");

-- Notifications table indexes
CREATE INDEX IF NOT EXISTS "idx_notifications_user_id" ON "notifications"("user_id");
CREATE INDEX IF NOT EXISTS "idx_notifications_created_by" ON "notifications"("created_by");
CREATE INDEX IF NOT EXISTS "idx_notifications_resource_id" ON "notifications"("resource_id");
CREATE INDEX IF NOT EXISTS "idx_notifications_is_read" ON "notifications"("is_read");
CREATE INDEX IF NOT EXISTS "idx_notifications_created_at" ON "notifications"("created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_notifications_user_unread" ON "notifications"("user_id", "is_read");

-- Company settings index
CREATE INDEX IF NOT EXISTS "idx_company_settings_id" ON "company_settings"("id");

-- ============================================
-- SECTION 5: INSERT DEFAULT DATA
-- ============================================

-- Insert default company settings row (id=1) if not exists
INSERT INTO "company_settings" (
  "id",
  "company_name",
  "quote_expiration_days",
  "labor_warranty_years",
  "material_warranty_years",
  "default_deposit_percent",
  "preferred_supplier",
  "default_shingle_brand"
)
VALUES (
  1,
  'NextDoor Exterior Solutions',
  30,
  10,
  25,
  50.00,
  'Beacon',
  'GAF Timberline HDZ'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SECTION 6: ADD COMMENTS
-- ============================================

-- Table comments
COMMENT ON TABLE "company_settings" IS 'Single-row table (id=1) storing company-wide settings for proposals and legal compliance';

-- Column comments
COMMENT ON COLUMN "company_settings"."contractor_license_number" IS 'Florida format: CCC, CGC, CBC, or CRC followed by 7 digits';
COMMENT ON COLUMN "company_settings"."insurance_expiration_date" IS 'Must be monitored - expired insurance blocks proposal generation';
COMMENT ON COLUMN "company_settings"."terms_and_conditions" IS 'Minimum 50 characters required for legal validity';
COMMENT ON COLUMN "company_settings"."default_deposit_percent" IS 'Typical range: 25-50% for residential roofing';

COMMENT ON COLUMN "report_requests"."solar_api_data" IS 'Google Solar API response data for roof measurements. Includes solarCoverage flag if API returns 404.';
COMMENT ON COLUMN "report_requests"."estimator_data" IS 'Imported estimate data from NextDoor Exterior Solutions roofing estimator';
COMMENT ON COLUMN "report_requests"."price_per_sq" IS 'Price per square foot for the roofing job';
COMMENT ON COLUMN "report_requests"."total_price" IS 'Total calculated price for the job';
COMMENT ON COLUMN "report_requests"."counter_price" IS 'Owner counter-offer price per square';
COMMENT ON COLUMN "report_requests"."price_status" IS 'Status of the pricing proposal workflow';
COMMENT ON COLUMN "report_requests"."manual_area_sqft" IS 'Manual roof area override in square feet - takes precedence over calculated area';
COMMENT ON COLUMN "report_requests"."insurance_carrier" IS 'Name of insurance company (e.g., State Farm, Allstate, USAA)';
COMMENT ON COLUMN "report_requests"."policy_number" IS 'Customer policy number with insurance carrier';
COMMENT ON COLUMN "report_requests"."claim_number" IS 'Insurance claim number for this job';
COMMENT ON COLUMN "report_requests"."deductible" IS 'Customer deductible amount in dollars';

-- ============================================
-- SECTION 7: ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "report_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "activities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "edit_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "job_attachments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "job_message_reads" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "company_settings" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "report_requests_insert_policy" ON "report_requests";
DROP POLICY IF EXISTS "report_requests_select_policy" ON "report_requests";
DROP POLICY IF EXISTS "report_requests_update_policy" ON "report_requests";
DROP POLICY IF EXISTS "report_requests_delete_policy" ON "report_requests";
DROP POLICY IF EXISTS "activities_insert_policy" ON "activities";
DROP POLICY IF EXISTS "activities_select_policy" ON "activities";
DROP POLICY IF EXISTS "documents_insert_policy" ON "documents";
DROP POLICY IF EXISTS "documents_select_policy" ON "documents";
DROP POLICY IF EXISTS "documents_delete_policy" ON "documents";
DROP POLICY IF EXISTS "edit_history_insert_policy" ON "edit_history";
DROP POLICY IF EXISTS "edit_history_select_policy" ON "edit_history";

-- REPORT_REQUESTS TABLE POLICIES

-- INSERT Policy: Allow all authenticated users to create jobs
CREATE POLICY "report_requests_insert_policy" 
ON "report_requests" 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- SELECT Policy: Users can view jobs based on their role
CREATE POLICY "report_requests_select_policy" 
ON "report_requests" 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM "users" 
    WHERE "users"."open_id" = auth.uid()
    AND (
      -- Owners and Admins see everything
      "users"."role" IN ('owner', 'admin', 'office')
      -- Sales Reps see their assigned jobs
      OR ("users"."role" = 'sales_rep' AND "report_requests"."assigned_to" = "users"."id")
      -- Team Leads see their team's jobs
      OR ("users"."role" = 'team_lead' AND (
        "report_requests"."assigned_to" = "users"."id" 
        OR "report_requests"."team_lead_id" = "users"."id"
        OR EXISTS (
          SELECT 1 FROM "users" team_members 
          WHERE team_members."team_lead_id" = "users"."id" 
          AND "report_requests"."assigned_to" = team_members."id"
        )
      ))
    )
  )
);

-- UPDATE Policy: Users can update jobs based on their role
CREATE POLICY "report_requests_update_policy" 
ON "report_requests" 
FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM "users" 
    WHERE "users"."open_id" = auth.uid()
    AND (
      -- Owners and Admins can update everything
      "users"."role" IN ('owner', 'admin', 'office')
      -- Sales Reps can update their assigned jobs
      OR ("users"."role" = 'sales_rep' AND "report_requests"."assigned_to" = "users"."id")
      -- Team Leads can update their team's jobs
      OR ("users"."role" = 'team_lead' AND (
        "report_requests"."assigned_to" = "users"."id" 
        OR "report_requests"."team_lead_id" = "users"."id"
        OR EXISTS (
          SELECT 1 FROM "users" team_members 
          WHERE team_members."team_lead_id" = "users"."id" 
          AND "report_requests"."assigned_to" = team_members."id"
        )
      ))
    )
  )
);

-- DELETE Policy: Only owners can delete jobs
CREATE POLICY "report_requests_delete_policy" 
ON "report_requests" 
FOR DELETE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM "users" 
    WHERE "users"."open_id" = auth.uid()
    AND "users"."role" = 'owner'
  )
);

-- ACTIVITIES TABLE POLICIES

-- Allow all authenticated users to insert activities
CREATE POLICY "activities_insert_policy" 
ON "activities" 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Allow users to view activities for jobs they can access
CREATE POLICY "activities_select_policy" 
ON "activities" 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM "report_requests" 
    WHERE "report_requests"."id" = "activities"."report_request_id"
    AND EXISTS (
      SELECT 1 FROM "users" 
      WHERE "users"."open_id" = auth.uid()
      AND (
        "users"."role" IN ('owner', 'admin', 'office')
        OR ("users"."role" = 'sales_rep' AND "report_requests"."assigned_to" = "users"."id")
        OR ("users"."role" = 'team_lead' AND (
          "report_requests"."assigned_to" = "users"."id" 
          OR "report_requests"."team_lead_id" = "users"."id"
        ))
      )
    )
  )
);

-- DOCUMENTS TABLE POLICIES

-- Allow all authenticated users to upload documents
CREATE POLICY "documents_insert_policy" 
ON "documents" 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Allow users to view documents for jobs they can access
CREATE POLICY "documents_select_policy" 
ON "documents" 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM "report_requests" 
    WHERE "report_requests"."id" = "documents"."report_request_id"
    AND EXISTS (
      SELECT 1 FROM "users" 
      WHERE "users"."open_id" = auth.uid()
      AND (
        "users"."role" IN ('owner', 'admin', 'office')
        OR ("users"."role" = 'sales_rep' AND "report_requests"."assigned_to" = "users"."id")
        OR ("users"."role" = 'team_lead' AND (
          "report_requests"."assigned_to" = "users"."id" 
          OR "report_requests"."team_lead_id" = "users"."id"
        ))
      )
    )
  )
);

-- Allow users to delete their own documents or owners to delete any
CREATE POLICY "documents_delete_policy" 
ON "documents" 
FOR DELETE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM "users" 
    WHERE "users"."open_id" = auth.uid()
    AND (
      "users"."role" = 'owner'
      OR "documents"."uploaded_by" = "users"."id"
    )
  )
);

-- EDIT_HISTORY TABLE POLICIES

-- Allow all authenticated users to insert edit history
CREATE POLICY "edit_history_insert_policy" 
ON "edit_history" 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Allow users to view edit history for jobs they can access
CREATE POLICY "edit_history_select_policy" 
ON "edit_history" 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM "report_requests" 
    WHERE "report_requests"."id" = "edit_history"."report_request_id"
    AND EXISTS (
      SELECT 1 FROM "users" 
      WHERE "users"."open_id" = auth.uid()
      AND (
        "users"."role" IN ('owner', 'admin', 'office')
        OR ("users"."role" = 'sales_rep' AND "report_requests"."assigned_to" = "users"."id")
        OR ("users"."role" = 'team_lead' AND (
          "report_requests"."assigned_to" = "users"."id" 
          OR "report_requests"."team_lead_id" = "users"."id"
        ))
      )
    )
  )
);

-- ============================================
-- SECTION 8: GRANT PERMISSIONS
-- ============================================

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON "users" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "report_requests" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "activities" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "documents" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "edit_history" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "job_attachments" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "job_message_reads" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "notifications" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "company_settings" TO authenticated;

-- Grant sequence usage
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- =============================================
-- Products Table - Roofing Product Catalog
-- =============================================
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  category VARCHAR(50) NOT NULL,
  manufacturer VARCHAR(100),
  product_name VARCHAR(255) NOT NULL,
  color VARCHAR(100),
  wind_rating VARCHAR(50),
  warranty_info TEXT,
  description TEXT,
  image_url TEXT,
  price_per_square NUMERIC(10, 2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index for filtering by category
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);

-- RLS Policies for products (read-only for authenticated users)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read products"
  ON products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow service role full access to products"
  ON products FOR ALL
  TO service_role
  USING (true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON "products" TO authenticated;

-- Tamko Titan XT Shingle Products
INSERT INTO "products" (
  "category", "manufacturer", "product_name", "color", "wind_rating", 
  "warranty_info", "description", "image_url"
)
VALUES 
(
  'Shingle', 'Tamko', 'Titan XT', 'Black Walnut', '160 MPH', 
  'Limited Lifetime (Tamko Pro Enhanced)', 'High-contrast color blend.',
  'https://YOUR_PROJECT_REF.supabase.co/storage/v1/object/public/Proposal_Bucket/BlackWalnut.jpg'
),
(
  'Shingle', 'Tamko', 'Titan XT', 'Glacier White', '160 MPH', 
  'Limited Lifetime (Tamko Pro Enhanced)', 'Bright, clean appearance.',
  'https://YOUR_PROJECT_REF.supabase.co/storage/v1/object/public/Proposal_Bucket/GlacierWhite.jpg'
),
(
  'Shingle', 'Tamko', 'Titan XT', 'Olde English Pewter', '160 MPH', 
  'Limited Lifetime (Tamko Pro Enhanced)', 'Stately deep gray.',
  'https://YOUR_PROJECT_REF.supabase.co/storage/v1/object/public/Proposal_Bucket/OldeEnglishPewter.jpg'
),
(
  'Shingle', 'Tamko', 'Titan XT', 'Oxford Grey', '160 MPH', 
  'Limited Lifetime (Tamko Pro Enhanced)', 'Versatile medium gray.',
  'https://YOUR_PROJECT_REF.supabase.co/storage/v1/object/public/Proposal_Bucket/OxfordGrey.jpg'
),
(
  'Shingle', 'Tamko', 'Titan XT', 'Rustic Black', '160 MPH', 
  'Limited Lifetime (Tamko Pro Enhanced)', 'Deep rich black.',
  'https://YOUR_PROJECT_REF.supabase.co/storage/v1/object/public/Proposal_Bucket/RusticBlack.jpg'
),
(
  'Shingle', 'Tamko', 'Titan XT', 'Shadow Grey', '160 MPH', 
  'Limited Lifetime (Tamko Pro Enhanced)', 'Soft blended gray.',
  'https://YOUR_PROJECT_REF.supabase.co/storage/v1/object/public/Proposal_Bucket/ShadowGrey.jpg'
),
(
  'Shingle', 'Tamko', 'Titan XT', 'Thunderstorm Grey', '160 MPH', 
  'Limited Lifetime (Tamko Pro Enhanced)', 'Dark stormy grey.',
  'https://YOUR_PROJECT_REF.supabase.co/storage/v1/object/public/Proposal_Bucket/ThunderstormGrey.jpg'
),
(
  'Shingle', 'Tamko', 'Titan XT', 'Virginia Slate', '160 MPH', 
  'Limited Lifetime (Tamko Pro Enhanced)', 'Classic slate appearance.',
  'https://YOUR_PROJECT_REF.supabase.co/storage/v1/object/public/Proposal_Bucket/VirginiaSlate.jpg'
),
(
  'Marketing', 'Tamko', 'Titan XT Logo', NULL, NULL, 
  NULL, 'Official Branding.',
  'https://YOUR_PROJECT_REF.supabase.co/storage/v1/object/public/Proposal_Bucket/TitanXT_logo.jpg'
),
(
  'Marketing', 'Tamko', 'Titan XT Aerial Shot', NULL, NULL, 
  NULL, 'Hero Image.',
  'https://YOUR_PROJECT_REF.supabase.co/storage/v1/object/public/Proposal_Bucket/TitanXT_Aerial.jpg'
),
(
  'Marketing', 'Tamko', 'Layers of Protection', NULL, NULL, 
  NULL, 'Tech Breakdown.',
  'https://YOUR_PROJECT_REF.supabase.co/storage/v1/object/public/Proposal_Bucket/tamko-complete-optimized.jpg'
)
ON CONFLICT DO NOTHING;

-- Verify tables were created:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
--
-- Verify indexes were created:
-- SELECT indexname FROM pg_indexes WHERE schemaname = 'public' ORDER BY indexname;
--
-- Verify RLS policies:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd 
-- FROM pg_policies 
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;
-- ============================================
