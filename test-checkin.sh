# Test check-in API với curl
# Thay YOUR_TOKEN bằng token thực từ localStorage

# 1. Get token từ browser console:
# localStorage.getItem('access_token')

# 2. Test check-in (thay YOUR_TOKEN và booking code)
curl -X POST http://localhost:3000/api/bookings/check-in \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"bookingCode": "TEST04"}' \
  -v

# 3. Hoặc test với booking code khác từ database
curl -X POST http://localhost:3000/api/bookings/check-in \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"bookingCode": "BOOK-20251213-XXXX"}' \
  -v
