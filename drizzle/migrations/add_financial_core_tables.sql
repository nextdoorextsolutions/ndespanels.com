-- Migration: Financial Core Architecture - Phase 1
-- Date: 2026-01-02
-- Description: Adds change_orders, insurance_scopes, and invoice_items tables
--              Also adds invoice_type enum and field to invoices table

-- ============================================================================
-- STEP 1: Create new enums
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE "invoice_type" AS ENUM ('deposit', 'progress', 'supplement', 'final', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "change_order_status" AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "change_order_type" AS ENUM ('supplement', 'retail_change', 'insurance_supplement');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- STEP 2: Add invoice_type column to existing invoices table
-- ============================================================================

DO $$ BEGIN
  ALTER TABLE "invoices" ADD COLUMN "invoice_type" "invoice_type" DEFAULT 'other';
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

-- ============================================================================
-- STEP 3: Create change_orders table
-- ============================================================================

CREATE TABLE IF NOT EXISTS "change_orders" (
  "id" SERIAL PRIMARY KEY,
  "job_id" INTEGER NOT NULL REFERENCES "report_requests"("id") ON DELETE CASCADE,
  "type" "change_order_type" NOT NULL,
  "description" TEXT NOT NULL,
  "amount" INTEGER NOT NULL, -- Stored in cents
  "status" "change_order_status" DEFAULT 'pending' NOT NULL,
  "invoice_id" INTEGER REFERENCES "invoices"("id") ON DELETE SET NULL,
  "approved_by" INTEGER REFERENCES "users"("id") ON DELETE SET NULL,
  "approved_at" TIMESTAMP,
  "created_by" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- STEP 4: Create insurance_scopes table
-- ============================================================================

CREATE TABLE IF NOT EXISTS "insurance_scopes" (
  "id" SERIAL PRIMARY KEY,
  "job_id" INTEGER NOT NULL REFERENCES "report_requests"("id") ON DELETE CASCADE,
  "document_id" INTEGER REFERENCES "documents"("id") ON DELETE SET NULL,
  "carrier_name" VARCHAR(255),
  "claim_number" VARCHAR(100),
  "rcv_amount" INTEGER, -- Replacement Cost Value in cents
  "acv_amount" INTEGER, -- Actual Cash Value in cents
  "deductible" INTEGER, -- Stored in cents
  "line_items" JSONB, -- Array of parsed scope items
  "raw_data" JSONB, -- Full parser output
  "parser_version" VARCHAR(50),
  "parsed_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- STEP 5: Create invoice_items table (normalized line items)
-- ============================================================================

CREATE TABLE IF NOT EXISTS "invoice_items" (
  "id" SERIAL PRIMARY KEY,
  "invoice_id" INTEGER NOT NULL REFERENCES "invoices"("id") ON DELETE CASCADE,
  "description" TEXT NOT NULL,
  "quantity" NUMERIC(10, 2) DEFAULT 1 NOT NULL,
  "unit_price" INTEGER NOT NULL, -- Stored in cents
  "total_price" INTEGER NOT NULL, -- Stored in cents
  "product_id" INTEGER REFERENCES "products"("id") ON DELETE SET NULL,
  "change_order_id" INTEGER REFERENCES "change_orders"("id") ON DELETE SET NULL,
  "sort_order" INTEGER DEFAULT 0 NOT NULL,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- STEP 6: Create indexes for performance
-- ============================================================================

-- Change Orders indexes
CREATE INDEX IF NOT EXISTS "idx_change_orders_job_id" ON "change_orders"("job_id");
CREATE INDEX IF NOT EXISTS "idx_change_orders_status" ON "change_orders"("status");
CREATE INDEX IF NOT EXISTS "idx_change_orders_invoice_id" ON "change_orders"("invoice_id");
CREATE INDEX IF NOT EXISTS "idx_change_orders_created_by" ON "change_orders"("created_by");

-- Insurance Scopes indexes
CREATE INDEX IF NOT EXISTS "idx_insurance_scopes_job_id" ON "insurance_scopes"("job_id");
CREATE INDEX IF NOT EXISTS "idx_insurance_scopes_document_id" ON "insurance_scopes"("document_id");
CREATE INDEX IF NOT EXISTS "idx_insurance_scopes_claim_number" ON "insurance_scopes"("claim_number");

-- Invoice Items indexes
CREATE INDEX IF NOT EXISTS "idx_invoice_items_invoice_id" ON "invoice_items"("invoice_id");
CREATE INDEX IF NOT EXISTS "idx_invoice_items_product_id" ON "invoice_items"("product_id");
CREATE INDEX IF NOT EXISTS "idx_invoice_items_change_order_id" ON "invoice_items"("change_order_id");

-- Invoices invoice_type index
CREATE INDEX IF NOT EXISTS "idx_invoices_invoice_type" ON "invoices"("invoice_type");

-- ============================================================================
-- STEP 7: Add helpful comments
-- ============================================================================

COMMENT ON TABLE "change_orders" IS 'Tracks value added after initial contract signing - supplements and retail changes';
COMMENT ON TABLE "insurance_scopes" IS 'Parsed data from insurance Scope of Loss PDFs for comparison and auto-supplement generation';
COMMENT ON TABLE "invoice_items" IS 'Normalized invoice line items replacing JSONB for better reporting and querying';

COMMENT ON COLUMN "change_orders"."amount" IS 'Amount in cents to match amountPaid pattern';
COMMENT ON COLUMN "change_orders"."invoice_id" IS 'Links to invoice if this change order has been billed';
COMMENT ON COLUMN "insurance_scopes"."rcv_amount" IS 'Replacement Cost Value from insurance scope in cents';
COMMENT ON COLUMN "insurance_scopes"."acv_amount" IS 'Actual Cash Value from insurance scope in cents';
COMMENT ON COLUMN "invoice_items"."change_order_id" IS 'Tracks which change order this line item originated from';
