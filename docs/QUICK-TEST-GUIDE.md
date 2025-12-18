# 🧪 Quick Test Guide - Notification System

## ⚡ Quick Start

### 1. Services Running
✅ Backend: http://localhost:3000  
✅ Frontend: http://localhost:5174

### 2. Test Cancellation Notification (Main Feature)

#### Step A: Create Booking as Customer
1. Open browser: http://localhost:5174
2. Login as CUSTOMER
3. Create a booking
4. Note the booking code/ID

#### Step B: Cancel Booking
1. Still as CUSTOMER
2. Go to "My Bookings"
3. Click "Cancel" on the booking
4. Confirm cancellation

#### Step C: Verify as Staff/Admin
1. Open **new incognito window**: http://localhost:5174
2. Login as STAFF or ADMIN
3. **Check notifications**:
   - 🔔 Red badge on bell icon (unread count)
   - 📢 Toast popup: "⚠️ Hủy lịch đặt sân"
   - 📄 Message: "Khách hàng [Name] đã hủy lịch đặt sân #[Code] lúc [Time]"

#### Step D: Mark as Read
1. Click bell icon
2. Dropdown opens with notification
3. Click notification → Badge count -1
4. Or click "Mark all as read" → All cleared

---

## 🔍 Verification Checklist

### Backend (✅ All Complete)
- [x] No TypeScript errors
- [x] Server running on port 3000
- [x] WebSocket Gateway initialized
- [x] Notification routes registered

### Frontend (✅ All Complete)
- [x] Server running on port 5174
- [x] SocketProvider wrapping app
- [x] Toaster configured
- [x] NotificationBell in header

### End-to-End (⏳ Ready to Test)
- [ ] Socket connects (check browser console)
- [ ] Cancel booking → Notification sent
- [ ] Staff sees toast notification
- [ ] Bell shows unread badge
- [ ] Click notification → Mark as read
- [ ] Database has notification record

---

## 📝 Test Accounts

Create test accounts if needed:

```bash
# In browser console or Prisma Studio
# CUSTOMER account:
email: customer@test.com
password: password123

# STAFF account:
email: staff@test.com
password: password123

# ADMIN account:
email: admin@test.com
password: password123
```

---

## 🐛 Debug Commands

### Check Socket Connection (Browser Console)
```javascript
// Should see connected socket
window.socket

// Check notifications
localStorage.getItem('token')

// Manual test notification
fetch('http://localhost:3000/api/notifications/test-email', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  }
})
```

### Check Database (Terminal)
```bash
# Open Prisma Studio
npx prisma studio

# Navigate to Notification table
# Verify new records after cancel
```

### Check Backend Logs
Look for these logs after cancellation:
```
[BookingsService] Booking cancelled: #BOOK123
[NotificationsService] Sending cancel notification to staff/admin
[EventsGateway] Emitting to staff-room: notification:new
```

---

## ✅ Success Indicators

1. **Toast appears** with orange warning icon
2. **Bell badge** shows "1" (or increases)
3. **Notification list** shows cancel message
4. **Database record** created with type=WARNING
5. **No errors** in browser console or backend logs

---

## 🎯 Expected Behavior

### Customer Side
- Sees "Booking cancelled successfully" message
- Booking status changes to CANCELLED
- No notification bell (customer doesn't need to know)

### Staff/Admin Side
- Instantly sees toast popup (within 1 second)
- Bell badge updates in real-time
- Can click to see full notification details
- Can mark as read to clear badge

---

## 🚨 Common Issues

### No Toast Appearing
**Check**: Browser console for errors  
**Fix**: Ensure SocketContext connected (`connected: true`)

### Badge Not Updating
**Check**: unreadCount state in SocketContext  
**Fix**: Verify `notification:new` event handler executing

### Socket Not Connecting
**Check**: Token in localStorage  
**Fix**: Re-login to get fresh JWT token

---

## 📊 Test Data

Create a booking with:
- Court: Any available court
- Date: Today
- Time: Any available slot
- Duration: 1 hour

Cancel within 24 hours (no penalty) for easier testing.

---

## 🎉 Done!

If all checks pass → **NOTIFICATION SYSTEM WORKING** ✅

Next: Test other notification types (payment, refund, maintenance)
