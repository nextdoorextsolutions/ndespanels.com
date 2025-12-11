-- Seed clients table with sample roofing clients
-- These are example clients with realistic addresses and coordinates

INSERT INTO clients (id, name, email, phone, address, latitude, longitude, status, notes, created_at, updated_at)
VALUES
  (
    gen_random_uuid()::text,
    'Michael Anderson',
    'michael.anderson@email.com',
    '(555) 123-4567',
    '124 Maple Ave, Springfield, IL 62701',
    39.7817,
    -89.6501,
    'Customer',
    'Full roof replacement completed Oct 2023. Shingle roof.',
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid()::text,
    'Sarah Jenkins',
    'sarah.j@email.com',
    '(555) 234-5678',
    '882 Oak Lane, Springfield, IL 62702',
    39.7990,
    -89.6440,
    'Customer',
    'Gutter repair completed Nov 2023.',
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid()::text,
    'Highland Estates HOA',
    'contact@highlandestates.com',
    '(555) 345-6789',
    '500 Highland Dr, Springfield, IL 62703',
    39.8100,
    -89.6300,
    'Customer',
    'Commercial flat roof seal - Building B.',
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid()::text,
    'Robert Vance',
    'rvance@email.com',
    '(555) 456-7890',
    '402 Pine St, Springfield, IL 62704',
    39.7700,
    -89.6600,
    'Lead',
    'Requested estimate for shingle repair. Follow up needed.',
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid()::text,
    'The Hendersons',
    'henderson.family@email.com',
    '(555) 567-8901',
    '902 Beverly Rd, Springfield, IL 62705',
    39.8200,
    -89.6200,
    'Customer',
    'Shingle roof replacement in progress.',
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid()::text,
    'West Warehouse Inc',
    'maintenance@westwarehouse.com',
    '(555) 678-9012',
    '1200 Industrial Pkwy, Springfield, IL 62706',
    39.7600,
    -89.6700,
    'Lead',
    'Commercial flat roof - waiting on material order.',
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid()::text,
    'Oakwood Apartments',
    'manager@oakwoodapts.com',
    '(555) 789-0123',
    '8800 Main St, Springfield, IL 62707',
    39.8300,
    -89.6100,
    'Customer',
    'Multi-building flat roof project.',
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid()::text,
    'Miller Residence',
    'sarah.miller@email.com',
    '(555) 890-1234',
    '404 Pine Ln, Springfield, IL 62708',
    39.7500,
    -89.6800,
    'Customer',
    'Metal roof installation completed.',
    NOW(),
    NOW()
  );

-- Display summary
SELECT 
  COUNT(*) as total_clients,
  COUNT(CASE WHEN status = 'Lead' THEN 1 END) as leads,
  COUNT(CASE WHEN status = 'Customer' THEN 1 END) as customers,
  COUNT(CASE WHEN latitude IS NOT NULL THEN 1 END) as clients_with_location
FROM clients;
