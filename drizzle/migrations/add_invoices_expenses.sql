-- Finance Dashboard Migration: Invoices and Expenses Tables
-- Applied: December 11, 2024

-- Enums
DO $$ BEGIN
  CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE expense_category AS ENUM (
    'materials', 'labor', 'equipment', 'vehicle', 'insurance',
    'utilities', 'marketing', 'office', 'professional_services', 'other'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  invoice_number VARCHAR(50) NOT NULL UNIQUE,
  report_request_id INTEGER REFERENCES report_requests(id),
  client_name VARCHAR(255) NOT NULL,
  client_email VARCHAR(320),
  client_phone VARCHAR(50),
  address TEXT,
  amount NUMERIC(10, 2) NOT NULL,
  tax_amount NUMERIC(10, 2) DEFAULT 0.00,
  total_amount NUMERIC(10, 2) NOT NULL,
  status invoice_status DEFAULT 'draft' NOT NULL,
  invoice_date TIMESTAMP NOT NULL,
  due_date TIMESTAMP NOT NULL,
  paid_date TIMESTAMP,
  payment_method VARCHAR(50),
  payment_reference VARCHAR(100),
  line_items JSONB,
  notes TEXT,
  internal_notes TEXT,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
  id SERIAL PRIMARY KEY,
  date TIMESTAMP NOT NULL,
  category expense_category NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  description TEXT NOT NULL,
  report_request_id INTEGER REFERENCES report_requests(id),
  vendor_name VARCHAR(255),
  payment_method VARCHAR(50),
  receipt_url VARCHAR(500),
  is_tax_deductible BOOLEAN DEFAULT true NOT NULL,
  tax_category VARCHAR(100),
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_report_request_id ON invoices(report_request_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_report_request_id ON expenses(report_request_id);

-- Row Level Security
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoices_select" ON invoices FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "invoices_insert" ON invoices FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "invoices_update" ON invoices FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "expenses_select" ON expenses FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "expenses_insert" ON expenses FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "expenses_update" ON expenses FOR UPDATE USING (auth.role() = 'authenticated');

-- Permissions
GRANT ALL ON invoices TO authenticated;
GRANT ALL ON expenses TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE invoices_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE expenses_id_seq TO authenticated;
