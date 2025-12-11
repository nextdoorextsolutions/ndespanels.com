-- Migrate unique clients from invoices table to clients table
-- This script extracts unique client names and addresses from invoices
-- and inserts them into the new clients table

INSERT INTO clients (id, name, email, phone, address, status, created_at, updated_at)
SELECT 
  gen_random_uuid()::text AS id,
  client_name AS name,
  client_email AS email,
  client_phone AS phone,
  address,
  'Customer' AS status, -- Set as Customer since they have invoices
  NOW() AS created_at,
  NOW() AS updated_at
FROM (
  SELECT DISTINCT ON (client_name, address)
    client_name,
    client_email,
    client_phone,
    address
  FROM invoices
  WHERE client_name IS NOT NULL 
    AND client_name != ''
    AND address IS NOT NULL
    AND address != ''
  ORDER BY client_name, address, created_at DESC
) AS unique_clients
ON CONFLICT (id) DO NOTHING;

-- Display summary of migrated clients
SELECT 
  COUNT(*) as total_clients_migrated,
  COUNT(DISTINCT name) as unique_names,
  COUNT(DISTINCT address) as unique_addresses
FROM clients
WHERE status = 'Customer';
