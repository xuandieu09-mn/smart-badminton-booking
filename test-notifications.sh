#!/bin/bash

# Test Notification System
echo "🧪 Testing Notification System..."
echo ""

# Get token (assumes user is logged in)
TOKEN=$(cat <<EOF | node
const fs = require('fs');
// This would need actual token from localStorage or API login
// For testing, user should manually set this
console.log(process.env.AUTH_TOKEN || 'YOUR_TOKEN_HERE');
EOF
)

API_URL="http://localhost:3000/api"

echo "📝 Testing endpoints:"
echo "1. GET /notifications - Get user notifications"
echo "2. GET /notifications/unread-count - Get unread count"
echo ""

# Test 1: Get notifications
echo "🔍 Test 1: Fetching notifications..."
curl -X GET "$API_URL/notifications?limit=5" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  | json_pp || echo "❌ Failed"

echo ""
echo "---"
echo ""

# Test 2: Get unread count
echo "🔍 Test 2: Fetching unread count..."
curl -X GET "$API_URL/notifications/unread-count" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  | json_pp || echo "❌ Failed"

echo ""
echo "---"
echo ""

echo "✅ Test completed!"
echo ""
echo "📋 To test real-time notifications:"
echo "1. Open browser as STAFF/ADMIN"
echo "2. Login and watch notification bell"
echo "3. In another browser (incognito), login as CUSTOMER"
echo "4. Create a booking"
echo "5. Pay for the booking"
echo "6. Check STAFF/ADMIN browser - should see 2 notifications"
echo ""
echo "🐛 Debug logs to watch:"
echo "Backend: Look for these logs:"
echo "  - 📤 Calling notifyNewBooking..."
echo "  - 🎯 Creating new booking notification..."
echo "  - ✅ New booking notification sent..."
echo "  - 📤 Calling notifyPaymentSuccess..."
echo "  - 💰 Creating payment notification..."
echo "  - ✅ Payment notification sent..."
echo ""
echo "Frontend: Open browser console and look for:"
echo "  - 🔔 New notification:"
echo "  - Connected to socket server"
echo "  - Subscription confirmed"
