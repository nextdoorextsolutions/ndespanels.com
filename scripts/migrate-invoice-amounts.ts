import { getDb } from "../server/db";
import { sql } from "drizzle-orm";

async function migrateInvoiceAmounts() {
  console.log("Starting migration: Convert invoice amounts to cents...");
  
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    // Step 1: Add new integer columns
    console.log("Step 1: Adding new integer columns...");
    await db.execute(sql`
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS amount_cents INTEGER;
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax_amount_cents INTEGER;
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS total_amount_cents INTEGER;
    `);

    // Step 2: Migrate existing data from string dollars to integer cents
    // CRITICAL: Use ROUND() to avoid floating point errors (e.g., 19.99 * 100 = 1998.9999999)
    console.log("Step 2: Converting existing data to cents with proper rounding...");
    await db.execute(sql`
      UPDATE invoices 
      SET 
        amount_cents = ROUND((CAST(amount AS NUMERIC) * 100))::INTEGER,
        tax_amount_cents = ROUND((CAST(tax_amount AS NUMERIC) * 100))::INTEGER,
        total_amount_cents = ROUND((CAST(total_amount AS NUMERIC) * 100))::INTEGER
      WHERE amount_cents IS NULL;
    `);

    // Step 3: Make new columns NOT NULL
    console.log("Step 3: Setting NOT NULL constraints...");
    await db.execute(sql`
      ALTER TABLE invoices ALTER COLUMN amount_cents SET NOT NULL;
      ALTER TABLE invoices ALTER COLUMN tax_amount_cents SET NOT NULL;
      ALTER TABLE invoices ALTER COLUMN total_amount_cents SET NOT NULL;
    `);

    // Step 4: Drop old string columns
    console.log("Step 4: Dropping old columns...");
    await db.execute(sql`
      ALTER TABLE invoices DROP COLUMN IF EXISTS amount;
      ALTER TABLE invoices DROP COLUMN IF EXISTS tax_amount;
      ALTER TABLE invoices DROP COLUMN IF EXISTS total_amount;
    `);

    // Step 5: Rename new columns
    console.log("Step 5: Renaming columns...");
    await db.execute(sql`
      ALTER TABLE invoices RENAME COLUMN amount_cents TO amount;
      ALTER TABLE invoices RENAME COLUMN tax_amount_cents TO tax_amount;
      ALTER TABLE invoices RENAME COLUMN total_amount_cents TO total_amount;
    `);

    // Add comments
    console.log("Step 6: Adding column comments...");
    await db.execute(sql`
      COMMENT ON COLUMN invoices.amount IS 'Invoice amount in cents (integer)';
      COMMENT ON COLUMN invoices.tax_amount IS 'Tax amount in cents (integer)';
      COMMENT ON COLUMN invoices.total_amount IS 'Total amount in cents (integer)';
    `);

    console.log("✅ Migration completed successfully!");
    console.log("Invoice amounts are now stored as integers (cents)");
    
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
}

// Run migration
migrateInvoiceAmounts()
  .then(() => {
    console.log("Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
