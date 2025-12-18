# Database Migration Log

This document tracks all schema changes made to the NDES CRM database in chronological order.

---

## December 11, 2024 - Invoices & Expenses

**Migration:** `drizzle/migrations/add_invoices_expenses.sql`

**Changes:**
- Added `invoice_status` enum: `'draft', 'sent', 'paid', 'overdue', 'cancelled'`
- Added `expense_category` enum: `'materials', 'labor', 'equipment', 'vehicle', 'insurance', 'utilities', 'marketing', 'office', 'professional_services', 'other'`
- Created `invoices` table with full invoice management
  - Fields: invoice_number (unique), client info, amounts, status, dates, payment details, line_items (JSONB)
  - Indexes: status, invoice_date, report_request_id
  - RLS policies enabled
- Created `expenses` table for expense tracking
  - Fields: date, category, amount, vendor, payment method, receipt URL, tax deduction flags
  - Indexes: date, category, report_request_id
  - RLS policies enabled

**Purpose:** Finance module for invoice generation, tracking, and expense management

---

## December 17, 2024 - Error Logging & Crash Reporter

**Migration:** `drizzle/migrations/add_error_logs.sql`

**Changes:**
- Created `error_logs` table for crash reporting
  - Fields: error_message, error_stack, component_stack, user_id, url, user_agent, severity, metadata (JSONB)
  - Indexes: created_at, user_id, severity
  - RLS policies for admin/owner access

**Purpose:** Production error monitoring and crash reporting system

---

## December 17, 2024 - Commission & Bonus System

**Migration:** `drizzle/migrations/add_bonus_commissions.sql`

**Changes:**
- Added `bonus_period` enum: `'weekly', 'monthly', 'quarterly'`
- Added `commission_status` enum: `'pending', 'approved', 'denied'`
- Created `bonus_tiers` table
  - Fields: user_id, required_deals, bonus_amount, period
  - Tracks commission thresholds per user
- Created `commission_requests` table
  - Fields: job_id, user_id, payment_id, status, denial_reason
  - Tracks deal submissions for bonus approval

**Purpose:** Sales commission tracking with owner-only approval workflow

---

## December 17, 2024 - Unified Messaging System

**Migration:** `drizzle/migrations/add_chat_system.sql`

**Changes:**
- Added `channel_type` enum: `'public', 'private', 'dm'`
- Created `chat_channels` table
  - Fields: name, type, description, created_by
  - Supports team channels and direct messages
- Created `channel_members` table
  - Junction table for user-channel relationships
- Created `chat_messages` table
  - Fields: channel_id, user_id, content, is_edited, edited_at, metadata (JSONB)
  - Indexes: channel_id, created_at
  - RLS policies for member access

**Purpose:** Unified messaging with channels, DMs, and AI assistant integration

---

## December 17, 2024 - Calendar Events System

**Migration:** `drizzle/migrations/add_events_table.sql`

**Changes:**
- Added `event_type` enum: `'inspection', 'call', 'meeting', 'zoom'`
- Created `events` table
  - Fields: title, description, type, color (VARCHAR 50), start_time, end_time
  - Fields: job_id, assigned_to, created_by, attendees (JSONB array)
  - Fields: location, meeting_url
  - Indexes: start_time, assigned_to, created_by, job_id, type
  - RLS policies for event access control

**Purpose:** Color-coded calendar scheduling with attendee notifications

**Color Scheme:**
- Red (#ef4444) - Inspection
- Green (#22c55e) - Call
- Blue (#3b82f6) - Meeting
- Purple (#a855f7) - Zoom

---

## December 17, 2024 - Time Clock System

**Migration:** `drizzle/migrations/add_time_entries.sql`

**Changes:**
- Created `time_entries` table
  - Fields: user_id, clock_in, clock_out, duration_minutes
  - Fields: location_lat, location_lng, notes
  - Indexes: user_id, clock_in, clock_out
  - RLS policies for user access

**Purpose:** Employee time tracking with GPS verification

---

## December 18, 2024 - Manual Payments System

**Migration:** `drizzle/migrations/add_payments_table.sql`

**Changes:**
- Added `payment_method` enum: `'check', 'cash', 'wire', 'credit_card', 'other'`
- Created `payments` table
  - Fields: report_request_id (FK to jobs), amount (cents), payment_date, payment_method
  - Fields: check_number (VARCHAR 100), notes (TEXT), created_by
  - Indexes: report_request_id, payment_date, created_by
  - Foreign key: CASCADE delete on job deletion

**Purpose:** Manual payment tracking (checks, cash, wire transfers) without payment processor fees. Automatically updates job's `amountPaid` field for revenue tracking and bonus calculations.

**Backend Router:** `server/api/routers/payments.ts`
- `recordPayment` - Insert payment, update job revenue, log activity
- `getJobPayments` - List all payments for a job
- `deletePayment` - Remove payment, recalculate revenue
- `getPaymentSummary` - Total paid and payment count

**Frontend Component:** `client/src/components/crm/job-detail/JobPaymentsTab.tsx`

---

## December 18, 2024 - Jobs Router Refactoring

**Code Refactoring:** Modular architecture for maintainability

**Changes:**
- Split monolithic `server/api/routers/jobs.ts` (1,883 lines → 1,157 lines)
- Created modular sub-routers:
  - `server/api/routers/jobs/analytics.ts` (~400 lines) - Stats, reports, dashboard data
  - `server/api/routers/jobs/documents.ts` (~300 lines) - File uploads, photos, field uploads
  - `server/api/routers/jobs/lien-rights.ts` (~150 lines) - Lien tracking, alerts
  - `server/api/routers/jobs/shared.ts` - Common imports and utilities
  - `server/api/routers/jobs/index.ts` - Module exports

**Purpose:** Improve code maintainability and reduce file size while maintaining backward compatibility. All API endpoints remain unchanged (flat structure preserved via router merging).

**Reduction:** 38.5% smaller main file (726 lines extracted)

---

## Schema Overview

### Core Tables
- `users` - User accounts and roles
- `report_requests` - Main jobs/leads table (CRM core)
- `activities` - Activity log for jobs
- `documents` - File attachments

### Finance
- `invoices` - Invoice management
- `expenses` - Expense tracking
- `commission_requests` - Bonus submissions
- `bonus_tiers` - Commission rules

### Communication
- `chat_channels` - Team channels and DMs
- `channel_members` - Channel membership
- `chat_messages` - Message history
- `events` - Calendar events

### Operations
- `material_orders` - Material ordering
- `material_kits` - Predefined material sets
- `time_entries` - Time clock
- `error_logs` - Crash reporting

### Enums
- `role` - User roles (owner, admin, office, sales_rep, team_lead, field_crew)
- `status` - Job statuses (lead, appointment_set, prospect, approved, etc.)
- `deal_type` - Deal types (insurance, cash, financed)
- `lien_rights_status` - Lien compliance (not_applicable, active, warning, critical, expired, legal)
- `invoice_status` - Invoice states
- `expense_category` - Expense types
- `commission_status` - Approval states
- `channel_type` - Chat channel types
- `event_type` - Calendar event types
- `bonus_period` - Commission periods

---

## Migration Best Practices

1. **Always use `IF NOT EXISTS`** for table creation
2. **Use `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object`** for enums
3. **Add indexes** for frequently queried columns
4. **Enable RLS policies** for security
5. **Use JSONB** for flexible metadata storage
6. **Document purpose** in migration comments

---

## Running Migrations

```bash
# Generate migration from schema changes
npm run db:generate

# Push schema to database
npm run db:push

# View current schema
npm run db:studio
```

---

## Notes

- All migrations use safe re-run patterns (IF NOT EXISTS, exception handling)
- RLS policies enforce row-level security based on user roles
- JSONB fields provide flexibility for evolving requirements
- Indexes optimize query performance for large datasets
- Foreign keys use `ON DELETE CASCADE` or `SET NULL` appropriately
