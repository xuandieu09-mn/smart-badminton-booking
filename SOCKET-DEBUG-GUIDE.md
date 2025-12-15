# 🔧 SOCKET REAL-TIME DEBUG GUIDE

## ✅ Đã Fix

### 1. Navigation Issue
**Vấn đề**: `window.location.href` gây hard reload → mất socket connection
**Fix**: Dùng React Router `navigate()` → giữ socket alive

### 2. Event Timing Issue  
**Vấn đề**: Backend emit event trước khi frontend navigate xong
**Fix**: 
- Frontend invalidate queries trước khi navigate
- Backend thêm logging để debug

### 3. Socket Connection Tracking
**Thêm**: Debug panel hiển thị real-time socket events

---

## 🚀 Cách Test (QUAN TRỌNG)

### Bước 1: Start Backend với Logging
```bash
cd e:\TOT_NGHIEP\smart-badminton-booking
npm run start:dev
```

**Check log phải thấy khi start**:
```
[WebsocketModule] dependencies initialized
[EventsGateway] Listening...
```

### Bước 2: Start Frontend  
```bash
cd frontend
npm run dev
```

### Bước 3: Login và Xem Debug Panel

1. Mở: http://localhost:5173
2. Login: `customer1@test.com` / `password123`
3. **Xem góc dưới bên phải** → Phải thấy **Socket Debug Panel**

**Panel phải hiển thị**:
```
🟢 Socket Debug
User ID: 1 | Socket: AbcDef12
[14:30:15] ✅ Connected! Socket ID: AbcDef123456
```

### Bước 4: Test Booking Flow

#### A. Test Đặt Sân
1. Vào trang "Lịch đặt sân" (Calendar)
2. Chọn 1 slot bất kỳ
3. Click "✅ Xác nhận đặt sân"
4. **XEM DEBUG PANEL** - phải thấy:
   ```
   [14:30:20] 📢 Status Changed: {"bookingId":123,"newStatus":"PENDING_PAYMENT","message":"Booking created: BK..."}
   [14:30:20] 🎾 Court Update: {"courtId":1,"status":"booked"}
   ```
5. Click "OK" trong confirm dialog
6. **Trang tự động chuyển** sang "Lịch của tôi" (MyBookingsPage)
7. **XEM UI** - phải thấy banner màu xanh xuất hiện:
   ```
   🔄 ✅ Booking created: BK250115-XXXX
   ```

#### B. Test Thanh Toán
1. Ở trang "Lịch của tôi"
2. Tìm booking PENDING_PAYMENT
3. Click "Thanh toán ngay" → Chọn "Ví tiền"
4. **XEM DEBUG PANEL** - phải thấy:
   ```
   [14:31:00] 📢 Status Changed: {"bookingId":123,"newStatus":"CONFIRMED","message":"Payment successful..."}
   ```
5. **XEM UI** - banner xuất hiện:
   ```
   🔄 ✅ Thanh toán thành công!
   ```
6. Booking tự động refresh thành CONFIRMED

#### C. Test Hủy + Hoàn Tiền
1. Tìm booking CONFIRMED (>24h trước giờ chơi)
2. Click "❌ Hủy booking" → Confirm
3. **XEM DEBUG PANEL** - phải thấy:
   ```
   [14:32:00] 📢 Status Changed: {"bookingId":123,"newStatus":"CANCELLED"...}
   [14:32:00] 💰 Refund: {"refundAmount":200000,"refundPercentage":100...}
   ```
4. **XEM UI** - alert popup với chi tiết hoàn tiền
5. Sau 2s tự động chuyển đến trang /wallet

---

## 🐛 Nếu Vẫn Không Thấy Real-time

### Debug Checklist

#### 1. Check Socket Connection
**Debug Panel phải hiển thị**:
- 🟢 (màu xanh) = Connected ✅
- 🔴 (màu đỏ) = Disconnected ❌

**Nếu đỏ**:
- Click "Reconnect" trong panel
- Check backend log: `[EventsGateway] Client connected: ...`
- Check CORS: Phải allow `http://localhost:5173`

#### 2. Check Backend Emitting Events
**Backend terminal khi đặt sân phải thấy**:
```
[EventsGateway] ✅ Emitted 'booking:status-changed' to user 1 (socket: AbcDef12): Booking created: BK250115-XXXX
```

**Nếu KHÔNG THẤY**:
- Check BookingsService có inject EventsGateway không?
- Check line `this.eventsGateway.emitBookingStatusChange(...)` có được gọi không?
- Add breakpoint hoặc console.log tại dòng emit

**Nếu thấy cảnh báo**:
```
[EventsGateway] ⚠️ Cannot emit to user 1: Socket not found
```
→ User chưa connect hoặc đã disconnect
→ Check frontend debug panel xem có connected không

#### 3. Check Frontend Receiving Events
**Debug Panel khi đặt sân phải thấy**:
```
[14:30:20] 📢 Status Changed: {"bookingId":123,...}
```

**Nếu KHÔNG THẤY**:
- Check event name: Backend emit `booking:status-changed` (có 'd')
- Check socket.on() trong SocketDebugPanel
- Mở DevTools Console xem có error không

#### 4. Check UI Rendering
**Nếu Debug Panel thấy event nhưng UI không hiện banner**:

1. Check `useBookingEvents` có được gọi trong MyBookingsPage không?
2. Check `setRealtimeMessage()` có được gọi không?
3. Inspect Element tìm div: `border-l-4 border-blue-500`
4. Check conditional render: `{realtimeMessage && ...}`

**Debug trong Console**:
```javascript
// Check hooks
console.log('useBookingEvents loaded?', typeof useBookingEvents)

// Check socket service
console.log('Socket connected?', socketService.isConnected())
console.log('Socket ID:', socketService.getSocket()?.id)
```

---

## 📊 Expected Flow với Debug Logs

### Đặt Sân Flow
```
[User] Click "Xác nhận đặt sân"
  ↓
[Frontend] POST /bookings/bulk
  ↓
[Backend BookingsService] createBulkBookings()
  ↓
[Backend EventsGateway] emitBookingStatusChange(userId: 1, ...)
  ↓
[Backend Log] ✅ Emitted 'booking:status-changed' to user 1 (socket: AbcDef12)
  ↓
[Socket.IO] Sends event to socket AbcDef12
  ↓
[Frontend SocketService] Receives 'booking:status-changed'
  ↓
[Debug Panel] Shows: 📢 Status Changed: {...}
  ↓
[Frontend useBookingEvents] onStatusChange() callback
  ↓
[Frontend MyBookingsPage] setRealtimeMessage("✅ Booking created...")
  ↓
[UI] Banner xuất hiện màu xanh
  ↓
[After 5s] Banner tự động ẩn
```

### Thanh Toán Flow
```
[User] Click "Thanh toán ngay" → "Ví tiền"
  ↓
[Frontend] POST /wallet/pay/:bookingId
  ↓
[Backend PaymentsService] processWalletPayment()
  ↓
[Backend EventsGateway] emitBookingStatusChange(...)
  ↓
[Backend Log] ✅ Emitted 'booking:status-changed' to user 1
  ↓
[Frontend Debug Panel] 📢 Status Changed: {"newStatus":"CONFIRMED"...}
  ↓
[Frontend] setRealtimeMessage("✅ Thanh toán thành công!")
  ↓
[UI] Banner xuất hiện + booking list auto-refresh
```

---

## 🎯 Success Criteria

✅ **Debug Panel hiển thị**:
- 🟢 Connected status
- Socket ID hiện ra
- Events được log real-time

✅ **Backend Log hiển thị**:
- `[EventsGateway] Client connected: ...`
- `[EventsGateway] ✅ Emitted 'booking:status-changed' to user X`

✅ **UI Banner xuất hiện**:
- Màu xanh với border trái
- Text: "🔄 ✅ [Message]"
- Tự động ẩn sau 5s

✅ **Navigation hoạt động**:
- Calendar → MyBookings không reload page
- Socket connection persist

---

## 📝 Files Changed

### Backend
1. ✅ `events.gateway.ts`
   - Added `namespace: 'events'`
   - Fixed event names
   - Added detailed logging

### Frontend
1. ✅ `Calendar.tsx`
   - Changed `window.location.href` → `navigate()`
   - Added `queryClient.invalidateQueries()`
2. ✅ `MainLayout.tsx`
   - Added `<SocketDebugPanel />` (dev only)
3. ✅ `SocketDebugPanel.tsx` (NEW)
   - Real-time event viewer
   - Connection status indicator

---

## 🔑 Key Points

1. **Socket PHẢI connected** trước khi test
2. **Debug Panel** là tool chính để debug
3. **Backend logs** xác nhận events được emit
4. **Navigation** phải dùng React Router (không reload page)
5. **Event names** phải khớp chính xác

---

## 🚨 Nếu Vẫn Không Work

Report với thông tin sau:

1. **Screenshot Debug Panel** (góc dưới phải)
2. **Backend terminal logs** khi đặt sân
3. **Browser DevTools Console** (F12)
4. **Network tab**: Check WebSocket connection status

---

**Date**: December 15, 2025
**Status**: ✅ Ready for Testing with Debug Tools
