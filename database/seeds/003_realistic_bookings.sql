-- =====================================================
-- SEED DATA 003: Realistic Booking Data
-- Xpress Ops Tower - Philippine Ridesharing Bookings
-- =====================================================

-- =====================================================
-- BOOKING SEED DATA (200 realistic bookings)
-- With actual Manila routes and realistic fares
-- =====================================================

-- Common Manila routes table (temporary)
CREATE TEMP TABLE common_manila_routes AS
SELECT * FROM (VALUES
  -- Format: (name_from, lat_from, lon_from, name_to, lat_to, lon_to, distance_km, duration_min, base_fare)
  ('SM North EDSA', 14.6566, 121.0295, 'Ayala Triangle', 14.6537, 121.0170, 15.2, 35, 285),
  ('NAIA Terminal 3', 14.5086, 121.0196, 'Makati CBD', 14.5547, 121.0244, 9.8, 25, 220),
  ('Quezon City Circle', 14.6546, 121.0505, 'BGC', 14.5517, 121.0484, 17.5, 40, 350),
  ('Mall of Asia', 14.5361, 120.9822, 'EDSA Shangri-La', 14.5794, 121.0564, 21.3, 50, 450),
  ('Trinoma', 14.6558, 121.0330, 'Greenbelt', 14.5524, 121.0210, 13.7, 32, 270),
  ('UP Diliman', 14.6537, 121.0645, 'SM Mall of Asia', 14.5361, 120.9822, 19.2, 45, 390),
  ('Eastwood City', 14.6090, 121.0778, 'Ortigas Center', 14.5866, 121.0567, 6.5, 18, 140),
  ('Manila Ocean Park', 14.5797, 120.9736, 'Intramuros', 14.5920, 120.9736, 2.1, 8, 65),
  ('Bonifacio High Street', 14.5506, 121.0477, 'Market! Market!', 14.5485, 121.0555, 1.8, 7, 55),
  ('SM Megamall', 14.5847, 121.0567, 'Rockwell Center', 14.5655, 121.0363, 4.2, 15, 95),
  ('Araneta Center', 14.6186, 121.0516, 'Greenhills', 14.6029, 121.0508, 3.5, 12, 80),
  ('Makati Medical Center', 14.5552, 121.0193, 'Philippine General Hospital', 14.5781, 120.9897, 5.8, 18, 125),
  ('NAIA Terminal 1', 14.5117, 120.9936, 'Quezon City Hall', 14.6504, 121.0499, 18.7, 42, 380),
  ('Newport Mall', 14.5137, 121.0197, 'Robinson Place Manila', 14.5858, 120.9972, 9.2, 23, 210),
  ('Gateway Mall', 14.6203, 121.0555, 'Power Plant Mall', 14.5655, 121.0363, 8.4, 22, 190),
  ('Glorietta', 14.5491, 121.0240, 'Eastwood Mall', 14.6090, 121.0778, 10.3, 28, 245),
  ('Alabang Town Center', 14.4188, 121.0427, 'SM North EDSA', 14.6566, 121.0295, 24.5, 55, 520),
  ('SM Fairview', 14.7330, 121.0606, 'Intramuros', 14.5920, 120.9736, 22.8, 52, 485),
  ('Venice Grand Canal', 14.5485, 121.0553, 'SM Aura', 14.5470, 121.0517, 0.8, 5, 45),
  ('Divisoria', 14.6025, 120.9769, 'SM Megamall', 14.5847, 121.0567, 8.9, 24, 205)
) AS routes(
  pickup_name, pickup_lat, pickup_lon,
  dropoff_name, dropoff_lat, dropoff_lon,
  distance_km, duration_min, base_fare
);

-- Generate 200 realistic bookings
INSERT INTO bookings (
  booking_reference,
  service_type,
  status,
  customer_id,
  customer_name,
  customer_phone,
  customer_email,
  customer_rating,
  driver_id,
  pickup_location,
  pickup_address,
  dropoff_location,
  dropoff_address,
  region_id,
  service_details,
  base_fare,
  surge_multiplier,
  total_fare,
  payment_status,
  payment_method,
  requested_at,
  assigned_at,
  accepted_at,
  estimated_pickup_time,
  actual_pickup_time,
  estimated_completion_time,
  completed_at,
  customer_rating_value,
  driver_rating_value,
  created_at,
  updated_at
)
SELECT
  -- Booking reference
  'XPR-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(generate_series(1, 200)::text, 4, '0'),

  -- Service type (60% ride_4w, 25% ride_2w, 15% delivery)
  CASE
    WHEN random() < 0.60 THEN 'ride_4w'::service_type
    WHEN random() < 0.85 THEN 'ride_2w'::service_type
    ELSE 'send_delivery'::service_type
  END,

  -- Status (70% completed, 10% in_progress, 15% pending, 5% cancelled)
  CASE
    WHEN random() < 0.70 THEN 'completed'::booking_status
    WHEN random() < 0.80 THEN 'in_progress'::booking_status
    WHEN random() < 0.95 THEN 'pending'::booking_status
    ELSE 'cancelled'::booking_status
  END AS status,

  -- Customer ID (reference existing passengers)
  'PSG' || LPAD((1 + floor(random() * 50))::text, 4, '0'),

  -- Customer name
  (SELECT first_name || ' ' || last_name FROM passengers
   WHERE passenger_code = 'PSG' || LPAD((1 + floor(random() * 50))::text, 4, '0')
   LIMIT 1),

  -- Customer phone
  '+639' || (900000000 + floor(random() * 99999999))::bigint,

  -- Customer email
  'customer' || generate_series(1, 200) || '@example.com',

  -- Customer rating
  (4.0 + random() * 1.0)::NUMERIC(3,1),

  -- Driver ID (reference existing drivers)
  CASE
    WHEN random() < 0.85 THEN 'XPR' || LPAD((1001 + floor(random() * 40))::text, 4, '0')
    ELSE NULL -- 15% not yet assigned
  END,

  -- Pickup location (PostGIS POINT)
  (SELECT ST_SetSRID(ST_MakePoint(pickup_lon, pickup_lat), 4326)
   FROM common_manila_routes
   OFFSET floor(random() * 20)
   LIMIT 1) AS pickup_location,

  -- Pickup address
  (SELECT pickup_name || ', Metro Manila'
   FROM common_manila_routes
   OFFSET floor(random() * 20)
   LIMIT 1),

  -- Dropoff location
  (SELECT ST_SetSRID(ST_MakePoint(dropoff_lon, dropoff_lat), 4326)
   FROM common_manila_routes
   OFFSET floor(random() * 20)
   LIMIT 1) AS dropoff_location,

  -- Dropoff address
  (SELECT dropoff_name || ', Metro Manila'
   FROM common_manila_routes
   OFFSET floor(random() * 20)
   LIMIT 1),

  -- Region ID (Metro Manila)
  (SELECT id FROM regions WHERE code = 'MMD' LIMIT 1),

  -- Service details (JSON)
  jsonb_build_object(
    'passenger_count', floor(random() * 4 + 1),
    'vehicle_preference', (ARRAY['sedan', 'suv', 'any', 'motorcycle'])[floor(random() * 4 + 1)],
    'special_requests', CASE
      WHEN random() > 0.8 THEN 'Air conditioning required'
      WHEN random() > 0.9 THEN 'Child seat needed'
      ELSE NULL
    END,
    'route_type', CASE
      WHEN random() > 0.7 THEN 'fastest'
      ELSE 'shortest'
    END
  ),

  -- Base fare (from routes table)
  (SELECT base_fare FROM common_manila_routes OFFSET floor(random() * 20) LIMIT 1),

  -- Surge multiplier (30% chance of surge)
  CASE
    WHEN random() > 0.70 THEN (1.2 + random() * 0.8)::NUMERIC(3,1)
    ELSE 1.0
  END AS surge_multiplier,

  -- Total fare (calculated)
  (
    (SELECT base_fare FROM common_manila_routes OFFSET floor(random() * 20) LIMIT 1) *
    CASE WHEN random() > 0.70 THEN (1.2 + random() * 0.8) ELSE 1.0 END
  )::NUMERIC(10,2),

  -- Payment status
  CASE
    WHEN random() < 0.70 THEN 'completed'::payment_status
    WHEN random() < 0.90 THEN 'processing'::payment_status
    ELSE 'pending'::payment_status
  END,

  -- Payment method (60% GCash, 25% Cash, 10% Credit Card, 5% Maya)
  CASE
    WHEN random() < 0.60 THEN 'gcash'::payment_method
    WHEN random() < 0.85 THEN 'cash'::payment_method
    WHEN random() < 0.95 THEN 'credit_card'::payment_method
    ELSE 'maya'::payment_method
  END,

  -- Requested at (last 7 days)
  NOW() - (random() * INTERVAL '7 days') AS requested_at,

  -- Assigned at (2-5 minutes after request)
  (NOW() - (random() * INTERVAL '7 days')) + (random() * INTERVAL '5 minutes') AS assigned_at,

  -- Accepted at (1-3 minutes after assignment)
  (NOW() - (random() * INTERVAL '7 days')) + (random() * INTERVAL '8 minutes') AS accepted_at,

  -- Estimated pickup time (5-15 minutes after request)
  (NOW() - (random() * INTERVAL '7 days')) + (random() * INTERVAL '15 minutes') AS estimated_pickup_time,

  -- Actual pickup time (for completed bookings)
  CASE
    WHEN random() < 0.70 THEN
      (NOW() - (random() * INTERVAL '7 days')) + (random() * INTERVAL '18 minutes')
    ELSE NULL
  END,

  -- Estimated completion time (from routes table)
  (NOW() - (random() * INTERVAL '7 days')) +
  ((SELECT duration_min FROM common_manila_routes OFFSET floor(random() * 20) LIMIT 1) * INTERVAL '1 minute'),

  -- Completed at (for completed bookings)
  CASE
    WHEN random() < 0.70 THEN
      (NOW() - (random() * INTERVAL '7 days')) +
      ((SELECT duration_min FROM common_manila_routes OFFSET floor(random() * 20) LIMIT 1) * INTERVAL '1 minute')
    ELSE NULL
  END,

  -- Customer rating (4-5 stars for completed)
  CASE WHEN random() < 0.70 THEN floor(random() * 2 + 4)::INTEGER ELSE NULL END,

  -- Driver rating (4-5 stars for completed)
  CASE WHEN random() < 0.70 THEN floor(random() * 2 + 4)::INTEGER ELSE NULL END,

  -- Created at
  NOW() - (random() * INTERVAL '7 days'),

  -- Updated at
  NOW() - (random() * INTERVAL '1 day')

FROM generate_series(1, 200);

-- Clean up temporary table
DROP TABLE IF EXISTS common_manila_routes;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_driver ON bookings(driver_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_pickup_location ON bookings USING GIST(pickup_location);
CREATE INDEX IF NOT EXISTS idx_bookings_dropoff_location ON bookings USING GIST(dropoff_location);

-- Update statistics
ANALYZE bookings;

-- Verify seed data
DO $$
DECLARE
  booking_count INTEGER;
  completed_count INTEGER;
  gcash_count INTEGER;
  avg_fare NUMERIC;
BEGIN
  SELECT COUNT(*) INTO booking_count FROM bookings WHERE booking_reference LIKE 'XPR-%';
  SELECT COUNT(*) INTO completed_count FROM bookings WHERE status = 'completed';
  SELECT COUNT(*) INTO gcash_count FROM bookings WHERE payment_method = 'gcash';
  SELECT AVG(total_fare) INTO avg_fare FROM bookings;

  RAISE NOTICE '✅ Seeded % bookings successfully', booking_count;
  RAISE NOTICE '   - Completed: %', completed_count;
  RAISE NOTICE '   - GCash payments: %', gcash_count;
  RAISE NOTICE '   - Average fare: ₱%', ROUND(avg_fare, 2);
END $$;

COMMENT ON TABLE bookings IS 'Realistic Philippine ridesharing bookings with actual Manila routes';
