# Database Migrations

This document lists all SQL migrations applied to the database in chronological order.

## Migration Files

All migration files are located in `drizzle/migrations/`

### 1. `add_chat_system.sql`
**Purpose:** Add real-time team chat functionality
- Creates `chat_channels` table for chat channels/threads
- Creates `chat_messages` table for messages
- Creates `channel_members` table for channel membership
- Adds indexes for performance
- **Note:** RLS disabled - access control handled at application layer

### 2. `add_clients_table.sql`
**Purpose:** Add dedicated clients table for finance management
- Creates `clients` table with contact and billing information
- Links to jobs via `report_request_id`
- Supports multiple contacts per client
- Tracks billing preferences and payment terms

### 3. `add_error_logs.sql`
**Purpose:** Internal crash reporting system
- Creates `error_logs` table for tracking application errors
- Stores stack traces, user context, and error metadata
- Includes `resolved` status for error management
- Indexed by timestamp and resolved status

### 4. `add_follow_up_tracking.sql`
**Purpose:** Track jobs needing follow-up
- Adds `needs_follow_up` boolean to `report_requests`
- Adds `follow_up_reason` text field
- Adds `follow_up_requested_at` timestamp
- Enables dashboard filtering for follow-up needed

### 5. `add_invoices_expenses.sql`
**Purpose:** Complete finance management system
- Creates `invoice_status` enum: draft, sent, paid, overdue, cancelled
- Creates `expense_category` enum: materials, labor, equipment, etc.
- Creates `invoices` table with full invoice management
- Creates `expenses` table for expense tracking
- Adds RLS policies for security
- Indexes for performance on status, dates, and foreign keys

### 6. `add_tasks_table.sql`
**Purpose:** Task management system
- Creates `tasks` table linked to jobs
- Fields: title, description, assigned user, due date, status, priority
- Enables task tracking and overdue task alerts

### 7. `add_user_image_column.sql`
**Purpose:** User profile images
- Adds `image_url` column to `users` table
- Stores Supabase Storage URLs for profile pictures

### 8. `add_approved_amount_and_change_orders.sql`
**Purpose:** Enhanced job financial tracking
- Adds `approved_amount` to track approved job value
- Adds `extras_charged` for additional charges
- Adds `supplement_numbers` for insurance supplement tracking
- Enables better financial reporting

### 9. `migrate_clients_from_invoices.sql`
**Purpose:** Data migration for clients table
- Migrates existing client data from invoices to dedicated clients table
- Ensures data consistency
- One-time migration script

### 10. `seed_clients.sql`
**Purpose:** Seed initial client data
- Populates clients table with initial data
- Development/testing purposes

## Running Migrations

Migrations are managed by Drizzle ORM and should be applied in order.

**Apply all pending migrations:**
```bash
npm run db:push
```

**Generate new migration from schema changes:**
```bash
npm run db:generate
```

## Migration Safety

- All migrations use `IF NOT EXISTS` for table creation
- Enum migrations use `DO $$ BEGIN ... EXCEPTION` blocks to handle re-runs
- RLS policies are created with `IF NOT EXISTS` checks
- Indexes use `IF NOT EXISTS` to prevent errors on re-run

## Schema Source

The authoritative schema is defined in `drizzle/schema.ts`. Migrations are generated from schema changes using Drizzle Kit.

## Important Notes

- **Never drop enums** - Production data exists, use ALTER TYPE instead
- **Always test migrations** - Run on development database first
- **Backup before migration** - Always backup production before applying
- **Check dependencies** - Ensure foreign key relationships are valid
- **RLS policies** - Some tables have RLS disabled (chat system) - access control at app layer
