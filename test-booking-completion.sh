#!/bin/bash
# Test script for Booking Completion Flow

echo "🧪 Testing Booking Completion Flow"
echo "=================================="

# Backend URL
BASE_URL="http://localhost:3000/api"

# Test credentials (change as needed)
STAFF_EMAIL="staff1@test.com"
STAFF_PASSWORD="password123"

echo ""
echo "1. Login as Staff..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$STAFF_EMAIL\",\"password\":\"$STAFF_PASSWORD\"}")

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.access_token')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Login failed. Check credentials."
  exit 1
fi

echo "✅ Login successful. Token: ${TOKEN:0:20}..."

echo ""
echo "2. Get all bookings..."
BOOKINGS=$(curl -s -X GET "$BASE_URL/bookings" \
  -H "Authorization: Bearer $TOKEN")

echo "✅ Retrieved bookings:"
echo $BOOKINGS | jq '.[] | {id, bookingCode, status, startTime, endTime}'

echo ""
echo "3. Find a CHECKED_IN booking for testing..."
CHECKED_IN_ID=$(echo $BOOKINGS | jq -r '.[] | select(.status=="CHECKED_IN") | .id' | head -1)

if [ -z "$CHECKED_IN_ID" ] || [ "$CHECKED_IN_ID" == "null" ]; then
  echo "⚠️  No CHECKED_IN booking found. Create one first."
  echo ""
  echo "📝 To create a test booking:"
  echo "   1. Login as customer"
  echo "   2. Create a booking"
  echo "   3. Pay for it (status becomes CONFIRMED)"
  echo "   4. Staff check-in (status becomes CHECKED_IN)"
  echo ""
  exit 0
fi

echo "✅ Found CHECKED_IN booking: ID=$CHECKED_IN_ID"

echo ""
echo "4. Manually finish the booking..."
FINISH_RESPONSE=$(curl -s -X POST "$BASE_URL/bookings/$CHECKED_IN_ID/finish" \
  -H "Authorization: Bearer $TOKEN")

echo $FINISH_RESPONSE | jq '.'

# Check if finish was successful
NEW_STATUS=$(echo $FINISH_RESPONSE | jq -r '.booking.status')

if [ "$NEW_STATUS" == "COMPLETED" ]; then
  echo ""
  echo "✅ SUCCESS! Booking manually completed"
  echo "   - Booking ID: $CHECKED_IN_ID"
  echo "   - New Status: COMPLETED"
  echo "   - Finished By: $(echo $FINISH_RESPONSE | jq -r '.finishedBy')"
else
  echo ""
  echo "❌ FAILED to complete booking"
  echo "   - Response: $FINISH_RESPONSE"
fi

echo ""
echo "5. Verify court status updated..."
COURT_STATUS=$(curl -s -X GET "$BASE_URL/courts/realtime-status" \
  -H "Authorization: Bearer $TOKEN")

echo $COURT_STATUS | jq '.courts[] | {courtName, status, currentBooking}'

echo ""
echo "=================================="
echo "✅ Test completed!"
echo ""
echo "📊 Next steps:"
echo "   1. Check Staff Dashboard: http://localhost:5173/staff"
echo "   2. Verify COMPLETED badge (gray, ✅)"
echo "   3. Check court monitor shows available"
echo "   4. Wait 5 min for cron to auto-complete other bookings"
