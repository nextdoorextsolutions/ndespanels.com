-- Create invoice_status enum
DO $$ BEGIN
  CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create expense_category enum
DO $$ BEGIN
  CREATE TYPE expense_category AS ENUM (
    'materials',
    'labor',
    'equipment',
    'vehicle',
    'insurance',
    'utilities',
    'marketing',
    'office',
    'professional_services',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  invoice_number VARCHAR(50) NOT NULL UNIQUE,
  report_request_id INTEGER REFERENCES report_requests(id),
  
  -- Client info
  client_name VARCHAR(255) NOT NULL,
  client_email VARCHAR(320),
  client_phone VARCHAR(50),
  address TEXT,
  
  -- Financial details
  amount NUMERIC(10, 2) NOT NULL,
  tax_amount NUMERIC(10, 2) DEFAULT 0.00,
  total_amount NUMERIC(10, 2) NOT NULL,
  
  -- Status and dates
  status invoice_status DEFAULT 'draft' NOT NULL,
  invoice_date TIMESTAMP NOT NULL,
  due_date TIMESTAMP NOT NULL,
  paid_date TIMESTAMP,
  
  -- Payment tracking
  payment_method VARCHAR(50),
  payment_reference VARCHAR(100),
  
  -- Line items and notes
  line_items JSONB,
  notes TEXT,
  internal_notes TEXT,
  
  -- Metadata
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id SERIAL PRIMARY KEY,
  
  -- Expense details
  date TIMESTAMP NOT NULL,
  category expense_category NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  description TEXT NOT NULL,
  
  -- Optional links
  report_request_id INTEGER REFERENCES report_requests(id),
  vendor_name VARCHAR(255),
  
  -- Payment tracking
  payment_method VARCHAR(50),
  receipt_url VARCHAR(500),
  
  -- Tax and accounting
  is_tax_deductible BOOLEAN DEFAULT true NOT NULL,
  tax_category VARCHAR(100),
  
  -- Metadata
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_report_request_id ON invoices(report_request_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_report_request_id ON expenses(report_request_id);

-- Enable RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for invoices
CREATE POLICY "Enable read access for authenticated users" ON invoices
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON invoices
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON invoices
  FOR UPDATE USING (auth.role() = 'authenticated');

-- RLS Policies for expenses
CREATE POLICY "Enable read access for authenticated users" ON expenses
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON expenses
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON expenses
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Grant permissions
GRANT ALL ON invoices TO authenticated;
GRANT ALL ON expenses TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE invoices_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE expenses_id_seq TO authenticated;
