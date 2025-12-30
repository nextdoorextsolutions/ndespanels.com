-- Add finance system tables for NDEsbooks integration
-- Bank Transactions, Inventory, and Bills Payable

-- Bank Transactions Table
CREATE TABLE IF NOT EXISTS bank_transactions (
  id SERIAL PRIMARY KEY,
  transaction_date DATE NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  category VARCHAR(100),
  project_id INTEGER REFERENCES report_requests(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reconciled', 'ignored')),
  bank_account VARCHAR(100),
  reference_number VARCHAR(100),
  notes TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_transactions_date ON bank_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_status ON bank_transactions(status);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_project ON bank_transactions(project_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_category ON bank_transactions(category);

-- Inventory/Materials Table
CREATE TABLE IF NOT EXISTS inventory (
  id SERIAL PRIMARY KEY,
  item_name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  sku VARCHAR(100) UNIQUE,
  quantity INTEGER DEFAULT 0,
  unit_of_measure VARCHAR(50) DEFAULT 'unit',
  unit_cost NUMERIC(10, 2),
  reorder_level INTEGER DEFAULT 0,
  supplier_name VARCHAR(255),
  supplier_contact TEXT,
  location VARCHAR(255),
  last_restocked DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory(category);
CREATE INDEX IF NOT EXISTS idx_inventory_sku ON inventory(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_quantity ON inventory(quantity);

-- Inventory Transactions (for tracking stock movements)
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id SERIAL PRIMARY KEY,
  inventory_id INTEGER REFERENCES inventory(id) ON DELETE CASCADE,
  transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('purchase', 'usage', 'adjustment', 'return')),
  quantity INTEGER NOT NULL,
  unit_cost NUMERIC(10, 2),
  project_id INTEGER REFERENCES report_requests(id) ON DELETE SET NULL,
  reference_number VARCHAR(100),
  notes TEXT,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_inventory ON inventory_transactions(inventory_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_date ON inventory_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_project ON inventory_transactions(project_id);

-- Bills Payable Table
CREATE TABLE IF NOT EXISTS bills_payable (
  id SERIAL PRIMARY KEY,
  bill_number VARCHAR(100) UNIQUE,
  vendor_name VARCHAR(255) NOT NULL,
  vendor_email VARCHAR(320),
  vendor_phone VARCHAR(50),
  bill_date DATE NOT NULL,
  due_date DATE NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  tax_amount NUMERIC(12, 2) DEFAULT 0,
  total_amount NUMERIC(12, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'overdue', 'cancelled')),
  category VARCHAR(100),
  project_id INTEGER REFERENCES report_requests(id) ON DELETE SET NULL,
  payment_method VARCHAR(50),
  payment_date DATE,
  payment_reference VARCHAR(100),
  line_items JSONB,
  notes TEXT,
  attachment_url TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bills_payable_status ON bills_payable(status);
CREATE INDEX IF NOT EXISTS idx_bills_payable_due_date ON bills_payable(due_date);
CREATE INDEX IF NOT EXISTS idx_bills_payable_vendor ON bills_payable(vendor_name);
CREATE INDEX IF NOT EXISTS idx_bills_payable_project ON bills_payable(project_id);

-- Add triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_bank_transactions_updated_at BEFORE UPDATE ON bank_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON inventory
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bills_payable_updated_at BEFORE UPDATE ON bills_payable
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
