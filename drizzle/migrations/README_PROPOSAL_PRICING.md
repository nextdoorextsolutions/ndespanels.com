# Proposal Pricing Migration

## Overview
This migration adds proposal pricing and negotiation workflow fields to the `report_requests` table.

## What's Added

### New Enum: `price_status`
- `draft` - Initial state, no pricing set
- `pending_approval` - Sales rep submitted price < $500/sq, awaiting owner approval
- `negotiation` - Owner countered with different price
- `approved` - Price approved and ready for proposal generation

### New Columns in `report_requests`
- `price_per_sq` (NUMERIC(10,2)) - Price per square foot
- `total_price` (NUMERIC(10,2)) - Total calculated job price
- `counter_price` (NUMERIC(10,2)) - Owner's counter-offer price per square
- `price_status` (price_status) - Current status of pricing workflow

## How to Apply

### Using psql:
```bash
psql -U your_username -d your_database -f drizzle/migrations/add_proposal_pricing.sql
```

### Using Supabase Dashboard:
1. Go to SQL Editor
2. Copy contents of `add_proposal_pricing.sql`
3. Run the SQL

## Workflow States

### 1. DRAFT (Sales Rep)
- Rep enters price per square
- If ≥ $500: Auto-approved
- If $450-$499: Requires owner approval
- If < $450: Blocked (minimum floor)

### 2. PENDING_APPROVAL (Owner)
- Owner sees rep's requested price
- Can approve or counter with different price

### 3. NEGOTIATION (Sales Rep)
- Rep sees owner's counter-offer
- Can accept counter or deny/reset

### 4. APPROVED (All)
- Final price locked in
- Ready for proposal generation

## Verification

After running the migration, verify with:

```sql
-- Check enum was created
SELECT enumlabel FROM pg_enum WHERE enumtypid = 'price_status'::regtype;

-- Check columns were added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'report_requests'
AND column_name IN ('price_per_sq', 'total_price', 'counter_price', 'price_status');

-- Check index was created
SELECT indexname FROM pg_indexes WHERE tablename = 'report_requests' AND indexname = 'idx_report_requests_price_status';
```

## Rollback

If you need to rollback this migration:

```sql
-- Remove columns
ALTER TABLE report_requests
DROP COLUMN price_per_sq,
DROP COLUMN total_price,
DROP COLUMN counter_price,
DROP COLUMN price_status;

-- Drop index
DROP INDEX IF EXISTS idx_report_requests_price_status;

-- Drop enum
DROP TYPE IF EXISTS price_status;
```

## Notes

- All columns are nullable to support existing records
- Default `price_status` is 'draft'
- Pricing is stored as NUMERIC(10,2) for precision
- Index added on `price_status` for efficient filtering
