# Supabase Migration Status

## ✅ Applied to Supabase (December 10, 2024)

The following SQL has been successfully applied to the Supabase database via `supabase_migration.sql`:

### Enums Created
- ✅ `user_role` - 8 values (user, admin, owner, office, sales_rep, project_manager, team_lead, field_crew)
- ✅ `job_status` - 10 values (lead, appointment_set, prospect, approved, project_scheduled, completed, invoiced, lien_legal, closed_deal, closed_lost)
- ✅ `deal_type` - 3 values (insurance, cash, financed)
- ✅ `lien_rights_status` - 6 values (not_applicable, active, warning, critical, expired, legal)
- ✅ `activity_type` - 15 values
- ✅ `edit_type` - 5 values (create, update, delete, assign, status_change)
- ✅ `notification_type` - 3 values (mention, assignment, status_change)
- ✅ `price_status` - 4 values (draft, pending_approval, negotiation, approved)
- ✅ `legal_entity_type` - 5 values (LLC, Inc, Corp, Sole Proprietor, Partnership)

### Tables Created
- ✅ `users` - All fields including phone, is_active
- ✅ `report_requests` - All fields including latitude, longitude, sales_rep_code, lead_source, payment_status, priority, internal_notes, scheduled_date, completed_date
- ✅ `activities` - With JSONB metadata, **parent_id** (for threaded replies), **tags** (TEXT[] for topic filtering)
- ✅ `documents` - With photo metadata fields
- ✅ `edit_history` - Audit trail
- ✅ `job_attachments` - File attachments
- ✅ `job_message_reads` - Message tracking
- ✅ `notifications` - User notifications
- ✅ `company_settings` - Business settings (with default row id=1)

### Indexes Created
- ✅ All performance indexes on users, report_requests, activities, documents, edit_history, job_attachments, job_message_reads, notifications
- ✅ Composite indexes for common queries
- ✅ GIN indexes for JSONB fields (solar_api_data, estimator_data)
- ✅ **idx_activities_parent_id** - For threaded reply lookups
- ✅ **idx_activities_tags** (GIN) - For tag filtering queries

### Row Level Security (RLS)
- ✅ RLS enabled on all tables
- ✅ Policies created for report_requests (INSERT, SELECT, UPDATE, DELETE)
- ✅ Policies created for activities (INSERT, SELECT)
- ✅ Policies created for documents (INSERT, SELECT, DELETE)
- ✅ Policies created for edit_history (INSERT, SELECT)

### Permissions
- ✅ GRANT permissions to authenticated role
- ✅ Sequence usage granted

### Default Data
- ✅ Company settings default row inserted (id=1)

---

## 📋 Current Schema Status

**Schema File:** `drizzle/schema.ts`
**Status:** ✅ In sync with Supabase database

All tables, enums, and fields in `drizzle/schema.ts` match what's deployed in Supabase.

---

## 🔄 Future Migrations

Any new migrations should be:
1. Added to `drizzle/schema.ts` first
2. Generated with `npx drizzle-kit generate`
3. Applied to Supabase via SQL Editor
4. Documented in this file

---

## ⚠️ Important Notes

- The `supabase_migration.sql` file is the **master migration** that created the entire database
- Do NOT re-run `supabase_migration.sql` - it's already applied
- All enums use `IF NOT EXISTS` / `DO $$ BEGIN ... EXCEPTION` for safety
- All tables use `CREATE TABLE IF NOT EXISTS` for idempotency
- All indexes use `CREATE INDEX IF NOT EXISTS` for safety

---

## 📝 Recent Changes

### December 11, 2024 - Finance Dashboard Tables
**Applied:** Invoices and Expenses tables for financial tracking

**Migration File:** `drizzle/migrations/add_invoices_expenses.sql`

**New Tables:**
- ✅ `invoices` - Customer billing and payment tracking
  - Fields: invoice_number, client_name, amount, status (draft/sent/paid/overdue/cancelled), dates, payment tracking
  - Indexes on status, invoice_date, report_request_id
- ✅ `expenses` - Business expense tracking
  - Fields: date, category, amount, description, vendor_name, receipt_url, tax tracking
  - Indexes on date, category, report_request_id

**New Enums:**
- ✅ `invoice_status` - draft, sent, paid, overdue, cancelled
- ✅ `expense_category` - materials, labor, equipment, vehicle, insurance, utilities, marketing, office, professional_services, other

**Features:**
- ✅ RLS policies for authenticated users
- ✅ Foreign key links to report_requests (jobs)
- ✅ JSONB line_items for invoice details
- ✅ Tax deductibility tracking for expenses
- ✅ Payment method and reference tracking

**Status:** Complete and deployed

---

### December 10, 2024 - Threaded Timeline Feature
**Applied:** Threading and tagging support for activities table

**Changes:**
- ✅ Added `parent_id` column for threaded replies
- ✅ Added `tags` column (TEXT[]) for topic filtering
- ✅ Created indexes for performance

**Status:** Complete and deployed

---

**Last Updated:** December 11, 2024 (Finance tables added)
**Applied By:** Manual SQL execution in Supabase SQL Editor
