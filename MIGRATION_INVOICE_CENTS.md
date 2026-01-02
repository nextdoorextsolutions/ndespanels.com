# Invoice Amount Migration: String (Dollars) → Integer (Cents)

## Critical Issue
Invoices currently store amounts as `NUMERIC` (string dollars) while change orders use `INTEGER` (cents). This inconsistency causes data type mismatches and calculation errors.

## Migration Status
- ✅ Schema updated in `drizzle/schema.ts`
- ✅ Migration SQL created in `drizzle/migrations/convert_invoice_amounts_to_cents.sql`
- ⏳ Database migration needs to be run
- ⏳ Backend code needs updating to use cents
- ⏳ Frontend code needs updating to display cents as dollars

## Step 1: Run Database Migration

**IMPORTANT:** Run this migration when the server is running and has access to the database.

```bash
# Option A: Using the migration script
npx tsx scripts/migrate-invoice-amounts.ts

# Option B: Direct SQL (if you have psql access)
psql $DATABASE_URL -f drizzle/migrations/convert_invoice_amounts_to_cents.sql
```

The migration will:
1. Add new `amount_cents`, `tax_amount_cents`, `total_amount_cents` columns
2. Convert existing string dollar values to integer cents (multiply by 100)
3. Drop old columns
4. Rename new columns to replace old ones

## Step 2: Update Backend Code

### Files that need updating:
1. `server/api/routers/invoices.ts` - All invoice mutations
2. `server/api/routers/invoices.ts` - convertToInvoice mutation
3. `server/api/routers/invoices.ts` - generateBalanceInvoice mutation

### Changes needed:
- Input validation: Accept numbers (dollars), convert to cents before saving
- Database inserts: Multiply dollar amounts by 100 before insert
- Database reads: Divide cents by 100 when returning to frontend
- Calculations: All internal calculations should use cents

## Step 3: Update Frontend Code

### Files that need updating:
1. `client/src/components/crm/job-detail/financials/InvoiceManager.tsx`
2. `client/src/components/crm/job-detail/financials/FinancialLedger.tsx`
3. `client/src/components/crm/job-detail/overview/TotalJobValueCard.tsx`
4. `client/src/pages/finance/Invoices.tsx` (if exists)

### Changes needed:
- Display: Convert cents to dollars (divide by 100)
- Input: Convert dollars to cents before sending to backend (multiply by 100)
- Calculations: Use cents internally, display as dollars

## Step 4: Testing Checklist

After migration:
- [ ] Existing invoices display correct amounts
- [ ] New invoices can be created with correct amounts
- [ ] Invoice calculations match change order calculations
- [ ] Financial Ledger shows correct totals
- [ ] Generate Balance Invoice works correctly
- [ ] No data type errors in console

## Rollback Plan

If migration fails:
1. The migration script is wrapped in a transaction (BEGIN/COMMIT)
2. If any step fails, all changes are rolled back
3. Original data remains intact

## Data Consistency Check

After migration, verify:
```sql
-- Check that all amounts are integers
SELECT id, invoice_number, amount, tax_amount, total_amount 
FROM invoices 
WHERE amount IS NULL OR tax_amount IS NULL OR total_amount IS NULL;

-- Should return 0 rows

-- Verify amounts are reasonable (not accidentally multiplied twice)
SELECT id, invoice_number, amount / 100.0 as amount_dollars
FROM invoices
LIMIT 10;
```
