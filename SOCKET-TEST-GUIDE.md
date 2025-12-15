# Socket.IO Real-time Test Guide

## 🔍 Vấn đề đã fix

### 1. Event Names Mismatch
- ❌ Backend: `booking:status-change`
- ✅ Fixed: `booking:status-changed`

- ❌ Backend: `booking:refund`
- ✅ Fixed: `booking:refund-received`

### 2. Namespace Missing
- ❌ Backend: No namespace config
- ✅ Fixed: Added `namespace: 'events'` to `@WebSocketGateway`

## 🧪 Test Steps

### Method 1: Using Test HTML File

1. Start backend:
```bash
cd e:\TOT_NGHIEP\smart-badminton-booking
npm run start:dev
```

2. Open test file:
```bash
start test-socket.html
```

3. Check logs:
   - Should see: ✅ Socket connected! Socket ID: xxxxx
   - If error, check backend console for CORS or connection issues

### Method 2: Using Frontend App

1. Start backend:
```bash
npm run start:dev
```

2. Start frontend:
```bash
cd frontend
npm run dev
```

3. Login to app: http://localhost:5173
   - Email: customer1@test.com
   - Password: password123

4. Open DevTools Console (F12)
   - Should see: ✅ Socket connected: xxxxx

5. Test booking flow:
   - Go to "Đặt sân" page
   - Create a booking
   - **Check console** for: 📢 Booking status changed
   - **Check UI** for blue notification banner

6. Test payment:
   - Go to "Lịch đặt sân của tôi"
   - Click "Thanh toán ngay" on a pending booking
   - Select "Ví tiền"
   - **Check console** for: 📢 Booking status changed
   - **Check UI** for banner: "✅ Payment successful!"

7. Test refund:
   - Cancel a booking (must be >24h before start time)
   - **Check console** for: 💰 Refund received
   - **Check UI** for:
     - Alert popup with refund details
     - Auto-redirect to wallet page after 2s

## 🔍 Debugging

### Check Backend Logs

```bash
# Should see these logs:
[EventsGateway] Client connected: SOCKET_ID, userId: USER_ID
[EventsGateway] Emitted status change to user X: Booking created: BK250115-XXXX
```

### Check Frontend Console

```javascript
// In browser console:
console.log(socketService.isConnected()) // Should be true
console.log(socketService.getSocket()?.id) // Should show socket ID
```

### Common Issues

1. **Connection Failed**
   - Check backend is running: http://localhost:3000
   - Check CORS settings in events.gateway.ts
   - Check namespace is 'events'

2. **No Events Received**
   - Check event names match: `booking:status-changed`
   - Check userId is passed correctly
   - Check backend emits to correct socketId

3. **UI Not Updating**
   - Check useBookingEvents is called in component
   - Check realtimeMessage state exists
   - Check banner render condition: `{realtimeMessage && ...}`

## ✅ Expected Results

### After Booking Created:
```
Backend Log: [EventsGateway] Emitted status change to user 1: Booking created: BK250115-XXXX
Frontend Console: 📢 Booking status changed: {bookingId: 1, newStatus: "PENDING_PAYMENT", message: "..."}
Frontend UI: Blue banner appears with "✅ Booking created: BK250115-XXXX"
```

### After Payment:
```
Backend Log: [EventsGateway] Emitted status change to user 1: Payment successful for booking BK250115-XXXX
Frontend Console: 📢 Booking status changed: {bookingId: 1, newStatus: "CONFIRMED", message: "..."}
Frontend UI: Blue banner "✅ Payment successful!"
Booking list auto-refreshes (invalidateQueries)
```

### After Cancel with Refund:
```
Backend Log: [EventsGateway] Emitted refund to user 1
Frontend Console: 💰 Refund received: {bookingId: 1, refundAmount: 200000, refundPercentage: 100, ...}
Frontend UI: 
  - Alert: "💰 Hoàn tiền: 200,000 VND (100%)"
  - Banner: "💰 Hoàn tiền 100%"
  - After 2s: Navigate to /wallet
```

## 🎯 Files Changed

1. `src/common/websocket/events.gateway.ts`
   - ✅ Added `namespace: 'events'`
   - ✅ Changed `booking:status-change` → `booking:status-changed`
   - ✅ Changed `booking:refund` → `booking:refund-received`

2. `test-socket.html` (NEW)
   - Standalone test tool for Socket.IO connection

## 🚀 Next Steps

If everything works:
1. ✅ Real-time notifications appear on UI
2. ✅ Multi-tab sync works
3. ✅ Auto-redirect to wallet after refund works

If issues persist:
1. Check backend logs for EventsGateway messages
2. Check frontend console for socket connection
3. Use test-socket.html to isolate connection issues
