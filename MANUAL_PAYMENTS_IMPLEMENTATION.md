# Manual Payments System Implementation

## Overview
Removed Stripe integration and implemented a manual payment recording system for tracking checks, cash, and wire transfers.

## Changes Made

### 1. Environment Configuration ✅
**File:** `server/_core/env.ts`
- Stripe keys (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) were already optional
- No changes needed - server won't fail if Stripe keys are missing

### 2. Database Schema
**Files:**
- `drizzle/schema.ts` - Added `paymentMethodEnum` and `payments` table
- `drizzle/migrations/add_payments_table.sql` - Migration file

**New Enum:**
```typescript
payment_method: 'check' | 'cash' | 'wire' | 'credit_card' | 'other'
```

**New Table: `payments`**
- `id` - Primary key
- `report_request_id` - Foreign key to jobs (CASCADE delete)
- `amount` - Amount in cents (INTEGER)
- `payment_date` - Date payment was received
- `payment_method` - Payment method enum
- `check_number` - Optional check number (VARCHAR 100)
- `notes` - Optional notes (TEXT)
- `created_by` - User who recorded the payment
- `created_at`, `updated_at` - Timestamps

**Indexes:**
- `idx_payments_report_request_id`
- `idx_payments_payment_date`
- `idx_payments_created_by`

### 3. Backend API
**File:** `server/api/routers/payments.ts`

**Endpoints:**
1. **`recordPayment`** - Record a new payment
   - Input: jobId, amount (dollars), paymentDate, paymentMethod, checkNumber?, notes?
   - Converts amount to cents
   - Updates job's `amountPaid` field automatically
   - Logs activity in timeline
   
2. **`getJobPayments`** - Get all payments for a job
   - Returns payments ordered by date (newest first)
   
3. **`deletePayment`** - Delete a payment
   - Recalculates job's `amountPaid` after deletion
   - Logs activity
   
4. **`getPaymentSummary`** - Get payment summary
   - Returns total paid and payment count

**Router Registration:** `server/routers.ts`
- Added `payments: paymentsRouter` to Finance & Operations section

### 4. Frontend UI
**File:** `client/src/components/crm/job-detail/JobPaymentsTab.tsx`

**Features:**
- **Payment Summary Card** - Shows total collected and payment count
- **Record Payment Dialog** - Form with:
  - Amount input (dollars)
  - Payment date picker
  - Payment method dropdown (Check, Cash, Wire, Credit Card, Other)
  - Check number field (shown only for checks)
  - Notes textarea
- **Payment History List** - Shows all payments with:
  - Amount, method, date
  - Check number (if applicable)
  - Notes
  - Delete button (with confirmation)
- **Permissions** - Only users with edit permissions can record/delete payments

**Integration:** `client/src/pages/crm/JobDetail.tsx`
- Added "Payments" tab to job detail page
- Positioned between "Production Report" and "Documents"
- Imported `JobPaymentsTab` component

**Tab Configuration:** `client/src/components/crm/job-detail/JobDetailTabs.tsx`
- Added "Payments" to tabs list
- Excluded from search bar (like Overview and Proposal)

## How It Works

### Recording a Payment
1. User opens job detail page → Payments tab
2. Clicks "Record Payment" button
3. Fills out form:
   - Amount: $1,500.00
   - Date: Today's date (default)
   - Method: Check
   - Check Number: 12345
   - Notes: "Deposit payment"
4. System:
   - Converts $1,500 → 150,000 cents
   - Inserts payment record
   - Calculates total payments for job
   - Updates `report_requests.amountPaid` field
   - Logs activity: "Payment received: $1,500.00 via check (Check #12345)"

### Automatic Revenue Tracking
- Job's `amountPaid` field is automatically updated when:
  - New payment is recorded
  - Payment is deleted
- This field feeds into:
  - Commission calculations
  - Bonus system
  - Revenue reports
  - Dashboard analytics

## Migration Instructions

### Run Migration
```bash
# Apply the migration
psql $DATABASE_URL -f drizzle/migrations/add_payments_table.sql
```

### Verify Migration
```sql
-- Check enum exists
SELECT enumlabel FROM pg_enum WHERE enumtypid = 'payment_method'::regtype;

-- Check table exists
\d payments

-- Check indexes
\di payments*
```

## Stripe Removal (Optional)
If you want to completely remove Stripe:

1. **Remove Stripe SDK** (optional):
   ```bash
   npm uninstall stripe
   ```

2. **Remove Stripe fields from schema** (optional, but not recommended):
   - `stripePaymentIntentId`
   - `stripeCheckoutSessionId`
   - `stripeCustomerId`
   
   These can be left in place for historical data.

## Benefits

1. **No Payment Processor Fees** - Save 2.9% + $0.30 per transaction
2. **Simple Tracking** - Record checks/cash as they're received
3. **Automatic Revenue Updates** - Job totals update automatically
4. **Activity Logging** - All payments logged in timeline
5. **Bonus System Integration** - Revenue tracked for commission calculations
6. **Audit Trail** - Who recorded payment, when, and notes

## Future Enhancements

Consider adding:
- Payment receipts (PDF generation)
- Payment reminders
- Partial payment tracking
- Payment plans
- Bank deposit reconciliation
- Export to accounting software (QuickBooks, Xero)
