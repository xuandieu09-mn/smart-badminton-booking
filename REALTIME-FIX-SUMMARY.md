# ✅ SOCKET.IO REAL-TIME - ĐÃ SỬA XONG

## 🔧 Các Lỗi Đã Sửa

### 1. ❌ Event Names Không Khớp
**Vấn đề**: Backend emit event names khác với frontend listen

**Đã sửa**:
```typescript
// Backend (events.gateway.ts)
- emit('booking:status-change') ❌
+ emit('booking:status-changed') ✅

- emit('booking:refund') ❌
+ emit('booking:refund-received') ✅
```

### 2. ❌ Thiếu Namespace Config
**Vấn đề**: Frontend connect tới `/events` nhưng backend không config namespace

**Đã sửa**:
```typescript
// src/common/websocket/events.gateway.ts
@WebSocketGateway({
  namespace: 'events', // ✅ ADDED
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  },
})
```

## 🚀 Cách Test

### Bước 1: Kill Port Cũ (nếu đang chạy)

**Windows**:
```bash
# Option 1: Ctrl+C trong terminal đang chạy backend
# Option 2: Dùng Task Manager
#   - Tìm Node.js process
#   - End Task
# Option 3: Command line
netstat -ano | findstr :3000
taskkill /PID <PID_NUMBER> /F
```

### Bước 2: Start Backend

```bash
cd e:\TOT_NGHIEP\smart-badminton-booking
npm run start:dev
```

**Check log phải thấy**:
```
[EventsGateway] Client connected: <socket-id>, userId: <user-id>
```

### Bước 3: Start Frontend

```bash
cd frontend
npm run dev
```

### Bước 4: Test Real-time

#### Option A: Dùng Test HTML
1. Mở file: `e:\TOT_NGHIEP\smart-badminton-booking\test-socket.html`
2. Click "Connect"
3. Check console log: ✅ Socket connected!

#### Option B: Dùng App Thật

1. **Login**: http://localhost:5173
   - Email: `customer1@test.com`
   - Password: `password123`

2. **Mở DevTools Console** (F12)
   - Phải thấy: `✅ Socket connected: <socket-id>`

3. **Test Đặt Sân**:
   - Vào trang "Đặt sân"
   - Chọn sân + thời gian
   - Click "Đặt sân"
   - **Xem console**: `📢 Booking status changed: {...}`
   - **Xem UI**: Banner màu xanh xuất hiện với text "✅ Đặt sân thành công!"

4. **Test Thanh Toán**:
   - Vào "Lịch đặt sân của tôi"
   - Tìm booking có status PENDING_PAYMENT
   - Click "Thanh toán ngay"
   - Chọn "Ví tiền"
   - **Xem console**: `📢 Booking status changed: {...}`
   - **Xem UI**: Banner "✅ Thanh toán thành công!"
   - Booking tự động refresh thành CONFIRMED

5. **Test Hủy + Hoàn Tiền**:
   - Tìm booking CONFIRMED (phải >24h trước giờ chơi)
   - Click "Hủy booking"
   - Confirm popup
   - **Xem console**: `💰 Refund received: {...}`
   - **Xem UI**: 
     - Alert popup: "Hoàn tiền: 200,000 VND (100%)"
     - Banner: "💰 Hoàn tiền 100%"
     - Sau 2 giây tự động chuyển đến trang /wallet

## 🔍 Debug Nếu Vẫn Không Xuất Hiện

### Check 1: Socket Connected?

**Frontend Console**:
```javascript
// Paste vào console:
console.log('Connected:', socketService.isConnected())
console.log('Socket ID:', socketService.getSocket()?.id)
```

**Kết quả mong đợi**:
```
Connected: true
Socket ID: "AbcDef123456"
```

### Check 2: Backend Emitting Events?

**Backend Terminal** - Phải thấy log khi đặt sân:
```
[EventsGateway] Emitted status change to user 1: Booking created: BK250115-XXXX
```

Nếu **KHÔNG THẤY** log này → Backend không emit event → Check:
- EventsGateway có được inject vào BookingsService không?
- Line emit có được gọi không?

### Check 3: Frontend Listening?

**Frontend Console** khi đặt sân phải thấy:
```
📢 Booking status changed: {bookingId: 1, newStatus: "PENDING_PAYMENT", message: "..."}
```

Nếu **KHÔNG THẤY** → Frontend không nhận event → Check:
- useBookingEvents có được gọi trong MyBookingsPage không?
- Event name có đúng là `booking:status-changed` không?

### Check 4: UI Banner Render?

**Inspect Element** tìm div với class `border-l-4 border-blue-500`

Nếu **KHÔNG TÌM THẤY** → Banner không render → Check:
- `realtimeMessage` state có giá trị không?
- Conditional render `{realtimeMessage && ...}` có đúng không?

## 📁 Files Đã Thay Đổi

### Backend
1. ✅ `src/common/websocket/events.gateway.ts`
   - Added `namespace: 'events'`
   - Changed event names to match frontend

### Frontend
- ✅ Không cần thay đổi (đã đúng từ trước)

### New Files
1. ✅ `test-socket.html` - Standalone test tool
2. ✅ `SOCKET-TEST-GUIDE.md` - Detailed test guide
3. ✅ `REALTIME-FIX-SUMMARY.md` - This file

## 🎯 Expected Flow

```
User Action (Đặt sân)
  ↓
BookingsService.createBooking()
  ↓
EventsGateway.emitBookingStatusChange(userId, payload)
  ↓
Socket.IO emits to room: user:{userId}
  ↓
Frontend socket.on('booking:status-changed', callback)
  ↓
useBookingEvents.onStatusChange() called
  ↓
setRealtimeMessage("✅ Booking created...")
  ↓
UI renders blue banner with message
  ↓
Auto-clear after 5 seconds
```

## ✅ Checklist Hoàn Thành

- [x] Fix event names mismatch
- [x] Add namespace config
- [x] Backend builds successfully
- [x] Frontend code correct
- [x] Created test tools
- [x] Created documentation

## 🚨 Manual Test Required

**User cần làm**:
1. Kill process port 3000 cũ
2. Restart backend: `npm run start:dev`
3. Test theo hướng dẫn Bước 4 ở trên
4. Verify UI banner xuất hiện khi đặt sân/thanh toán

**Nếu vẫn không xuất hiện, report back với**:
- Backend log khi đặt sân
- Frontend console log
- Screenshot UI

---

**Date**: December 15, 2025
**Status**: ✅ Code Fixed - Ready for Testing
