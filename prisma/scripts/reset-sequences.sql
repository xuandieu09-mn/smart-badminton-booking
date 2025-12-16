-- Reset all sequences to sync with current max IDs
-- Run this after seeding to fix "Unique constraint failed" errors

-- Reset Court sequence
SELECT setval(
  pg_get_serial_sequence('\"Court\"', 'id'),
  COALESCE((SELECT MAX(id) FROM "Court"), 1),
  true
);

-- Reset User sequence
SELECT setval(
  pg_get_serial_sequence('\"User\"', 'id'),
  COALESCE((SELECT MAX(id) FROM "User"), 1),
  true
);

-- Reset Booking sequence
SELECT setval(
  pg_get_serial_sequence('\"Booking\"', 'id'),
  COALESCE((SELECT MAX(id) FROM "Booking"), 1),
  true
);

-- Reset Payment sequence
SELECT setval(
  pg_get_serial_sequence('\"Payment\"', 'id'),
  COALESCE((SELECT MAX(id) FROM "Payment"), 1),
  true
);

-- Reset Product sequence
SELECT setval(
  pg_get_serial_sequence('\"Product\"', 'id'),
  COALESCE((SELECT MAX(id) FROM "Product"), 1),
  true
);

-- Reset PricingRule sequence
SELECT setval(
  pg_get_serial_sequence('\"PricingRule\"', 'id'),
  COALESCE((SELECT MAX(id) FROM "PricingRule"), 1),
  true
);

SELECT '✅ All sequences reset successfully!' as result;
