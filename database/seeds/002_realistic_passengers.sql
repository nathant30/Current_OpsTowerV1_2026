-- =====================================================
-- SEED DATA 002: Realistic Passenger Data
-- Xpress Ops Tower - Philippine Passenger Profiles
-- =====================================================

-- Create passengers table if not exists (for reference)
-- Actual table creation should be in migrations

-- =====================================================
-- PASSENGER SEED DATA (50 realistic passengers)
-- =====================================================

-- Function to generate realistic Filipino names
CREATE OR REPLACE FUNCTION generate_filipino_name(gender TEXT, seed INTEGER)
RETURNS TEXT AS $$
DECLARE
  male_first_names TEXT[] := ARRAY[
    'Juan', 'Jose', 'Pedro', 'Miguel', 'Carlos', 'Roberto', 'Antonio', 'Francisco',
    'Ricardo', 'Ramon', 'Fernando', 'Eduardo', 'Manuel', 'Rafael', 'Gabriel'
  ];
  female_first_names TEXT[] := ARRAY[
    'Maria', 'Ana', 'Rosa', 'Carmen', 'Luz', 'Elena', 'Sofia', 'Isabel',
    'Patricia', 'Cristina', 'Angela', 'Teresa', 'Josefina', 'Lucia', 'Beatriz'
  ];
  last_names TEXT[] := ARRAY[
    'Santos', 'Reyes', 'Cruz', 'Bautista', 'Garcia', 'Gonzales', 'Flores', 'Mendoza',
    'Torres', 'Ramos', 'Lopez', 'Perez', 'Dela Cruz', 'Rivera', 'Fernandez', 'Villanueva'
  ];
  first_name TEXT;
  last_name TEXT;
BEGIN
  IF gender = 'male' THEN
    first_name := male_first_names[1 + MOD(seed, array_length(male_first_names, 1))];
  ELSE
    first_name := female_first_names[1 + MOD(seed, array_length(female_first_names, 1))];
  END IF;

  last_name := last_names[1 + MOD(seed * 7, array_length(last_names, 1))];

  RETURN first_name || ' ' || last_name;
END;
$$ LANGUAGE plpgsql;

-- Insert 50 realistic passengers for Metro Manila
INSERT INTO passengers (
  passenger_code,
  first_name,
  last_name,
  email,
  phone,
  address,
  total_bookings,
  total_spent,
  average_rating,
  cancellation_rate,
  account_status,
  tier,
  payment_methods,
  preferences,
  created_at,
  updated_at
)
SELECT
  'PSG' || LPAD(generate_series(1, 50)::text, 4, '0'),

  -- First name
  split_part(
    generate_filipino_name(
      CASE WHEN MOD(generate_series(1, 50), 2) = 0 THEN 'male' ELSE 'female' END,
      generate_series(1, 50)
    ),
    ' ',
    1
  ),

  -- Last name
  split_part(
    generate_filipino_name(
      CASE WHEN MOD(generate_series(1, 50), 2) = 0 THEN 'male' ELSE 'female' END,
      generate_series(1, 50)
    ),
    ' ',
    2
  ),

  -- Email
  lower(
    replace(
      split_part(
        generate_filipino_name(
          CASE WHEN MOD(generate_series(1, 50), 2) = 0 THEN 'male' ELSE 'female' END,
          generate_series(1, 50)
        ),
        ' ',
        1
      ),
      ' ',
      ''
    ) || '.' ||
    replace(
      split_part(
        generate_filipino_name(
          CASE WHEN MOD(generate_series(1, 50), 2) = 0 THEN 'male' ELSE 'female' END,
          generate_series(1, 50)
        ),
        ' ',
        2
      ),
      ' ',
      ''
    ) || generate_series(1, 50) || '@example.com'
  ),

  -- Phone number
  '+639' || (900000000 + floor(random() * 99999999))::bigint,

  -- Address (JSON)
  jsonb_build_object(
    'street', floor(random() * 999 + 1) || ' ' ||
      (ARRAY[
        'EDSA', 'Quezon Avenue', 'Commonwealth Avenue', 'Taft Avenue',
        'Roxas Boulevard', 'Ayala Avenue', 'Ortigas Avenue', 'C5 Road',
        'Shaw Boulevard', 'Katipunan Avenue'
      ])[floor(random() * 10 + 1)],
    'barangay', 'Barangay ' || floor(random() * 50 + 1),
    'city', (ARRAY[
      'Quezon City', 'Manila', 'Makati', 'Taguig', 'Pasig',
      'Mandaluyong', 'Pasay', 'Parañaque'
    ])[floor(random() * 8 + 1)],
    'province', 'Metro Manila',
    'postal_code', '1' || LPAD(floor(random() * 699 + 100)::text, 3, '0')
  ),

  -- Total bookings
  floor(random() * 495 + 5)::INTEGER,

  -- Total spent (₱1,000 - ₱50,000)
  (random() * 49000 + 1000)::NUMERIC(10,2),

  -- Average rating (4.0 - 5.0)
  (4.0 + random() * 1.0)::NUMERIC(3,1),

  -- Cancellation rate (0% - 15%)
  (random() * 15.0)::NUMERIC(5,1),

  -- Account status
  (ARRAY['active', 'active', 'active', 'active', 'suspended'])[
    floor(random() * 5 + 1)
  ]::VARCHAR,

  -- Tier (Regular, Premium, VIP)
  (ARRAY['Regular', 'Regular', 'Regular', 'Premium', 'VIP'])[
    floor(random() * 5 + 1)
  ]::VARCHAR,

  -- Payment methods (JSON array)
  jsonb_build_array(
    jsonb_build_object(
      'type', 'gcash',
      'primary', true,
      'verified', true
    ),
    jsonb_build_object(
      'type', 'cash',
      'primary', false,
      'verified', true
    )
  ),

  -- Preferences (JSON)
  jsonb_build_object(
    'preferred_vehicle_type', (ARRAY['car', 'motorcycle', 'any'])[floor(random() * 3 + 1)],
    'preferred_payment_method', (ARRAY['gcash', 'cash', 'credit_card'])[floor(random() * 3 + 1)],
    'receive_promotions', random() > 0.3,
    'language', 'en-PH',
    'accessibility_needs', CASE WHEN random() > 0.9 THEN 'wheelchair' ELSE 'none' END
  ),

  -- Created at (between 6 months to 2 years ago)
  NOW() - (random() * INTERVAL '730 days'),

  -- Updated at (recently)
  NOW() - (random() * INTERVAL '30 days')

FROM generate_series(1, 50);

-- Clean up temporary function
DROP FUNCTION IF EXISTS generate_filipino_name(TEXT, INTEGER);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_passengers_phone ON passengers(phone);
CREATE INDEX IF NOT EXISTS idx_passengers_email ON passengers(email);
CREATE INDEX IF NOT EXISTS idx_passengers_status ON passengers(account_status);
CREATE INDEX IF NOT EXISTS idx_passengers_tier ON passengers(tier);

-- Update statistics
ANALYZE passengers;

-- Verify seed data
DO $$
DECLARE
  passenger_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO passenger_count FROM passengers WHERE passenger_code LIKE 'PSG%';
  RAISE NOTICE '✅ Seeded % passengers successfully', passenger_count;
END $$;

COMMENT ON TABLE passengers IS 'Realistic Philippine passenger profiles for OpsTower';
