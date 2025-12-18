# 🔔 REAL-TIME NOTIFICATIONS SYSTEM

**Date**: December 17, 2025  
**Stack**: NestJS + Socket.io + React + react-hot-toast

---

## 📋 OVERVIEW

Hệ thống thông báo realtime hoàn chỉnh với:
- ✅ WebSocket connection với JWT auth
- ✅ Role-based rooms (admin-room, staff-room, user-{userId})
- ✅ Database persistence (Notification model)
- ✅ Toast notifications (react-hot-toast)
- ✅ Notification Bell UI với unread count
- ✅ Trigger events từ business logic (bookings, payments, etc.)

---

## 🎯 NOTIFICATION EVENTS

### 1️⃣ **Đặt lịch mới** (New Booking)
- **Trigger**: POST /api/bookings success
- **Target**: Staff Room + Admin Room
- **Type**: SUCCESS
- **Icon**: 🎯
- **Message**: "Đơn đặt sân mới #ABC123 - Sân 1 - Nguyễn Văn A"

### 2️⃣ **Thanh toán thành công** (Payment Success)
- **Trigger**: Payment confirmed (VNPay/MOMO/Wallet)
- **Target**: Staff Room + Admin Room + Customer
- **Type**: SUCCESS
- **Icon**: 💰
- **Message**: "Thanh toán nhận được: 500,000đ - Booking #ABC123"

### 3️⃣ **Hủy lịch** (Booking Cancelled) ⭐ NEW
- **Trigger**: POST /api/bookings/:id/cancel success
- **Target**: Staff Room + Admin Room
- **Type**: WARNING
- **Icon**: ⚠️
- **Message**: "Khách hàng Nguyễn Văn A đã hủy lịch đặt sân #ABC123 lúc 14:30"

### 4️⃣ **Hoàn tiền** (Refund)
- **Trigger**: Cancellation with refund
- **Target**: Customer
- **Type**: SUCCESS
- **Icon**: 💸
- **Message**: "Yêu cầu hoàn tiền 250,000đ đã được xử lý"

### 5️⃣ **Bảo trì sân** (Maintenance)
- **Trigger**: Admin schedules maintenance
- **Target**: Broadcast (All users)
- **Type**: INFO
- **Icon**: 🔧
- **Message**: "Sân 1 sẽ bảo trì từ 14:00 - 16:00"

### 6️⃣ **Quá giờ check-in** (Late Check-in)
- **Trigger**: Cron job or manual trigger
- **Target**: Staff Room
- **Type**: WARNING
- **Icon**: ⏰
- **Message**: "Booking #ABC123 đã quá giờ check-in"

---

## 🏗️ ARCHITECTURE

```
┌─────────────────────────────────────────────────────────┐
│                   BACKEND (NestJS)                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │       EventsGateway (Socket.io)                 │  │
│  │  - JWT Authentication                           │  │
│  │  - Room Management                              │  │
│  │  - emit() methods                               │  │
│  └─────────────────────────────────────────────────┘  │
│                     ▲                                   │
│                     │ inject                            │
│  ┌─────────────────────────────────────────────────┐  │
│  │     NotificationsService                        │  │
│  │  - createAndEmitNotification()                  │  │
│  │  - notifyNewBooking()                           │  │
│  │  - notifyBookingCancelled() ⭐                  │  │
│  │  - notifyPaymentSuccess()                       │  │
│  │  - notifyRefund()                               │  │
│  │  - notifyMaintenanceScheduled()                 │  │
│  └─────────────────────────────────────────────────┘  │
│                     ▲                                   │
│                     │ inject                            │
│  ┌──────────────────┴──────────────────────────────┐  │
│  │  BookingsService | PaymentsService | ...        │  │
│  │  → Call notificationsService.notify*()          │  │
│  └─────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │       Notification Model (Prisma)               │  │
│  │  - id, userId, title, message, type             │  │
│  │  - isRead, metadata, createdAt                  │  │
│  └─────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                            │
                            │ WebSocket (Socket.io)
                            ▼
┌─────────────────────────────────────────────────────────┐
│                FRONTEND (React + Vite)                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │         SocketContext                           │  │
│  │  - Auto-connect with JWT                        │  │
│  │  - Listen to events                             │  │
│  │  - notifications[] state                        │  │
│  │  - unreadCount state                            │  │
│  └─────────────────────────────────────────────────┘  │
│                     │                                   │
│                     │ useSocket()                       │
│                     ▼                                   │
│  ┌─────────────────────────────────────────────────┐  │
│  │      NotificationBell Component                 │  │
│  │  - Show unread count badge                      │  │
│  │  - Dropdown with notifications                  │  │
│  │  - Mark as read / Mark all                      │  │
│  └─────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │        Toast Notifications                      │  │
│  │  - react-hot-toast                              │  │
│  │  - Auto-show on 'notification:new' event        │  │
│  │  - Color-coded by type                          │  │
│  └─────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 🔌 WEBSOCKET ROOMS

| Role | Room | Description |
|------|------|-------------|
| **ADMIN** | `admin-room` + `staff-room` | Admin sees all staff notifications too |
| **STAFF** | `staff-room` | Staff-specific notifications |
| **CUSTOMER** | `user-{userId}` | Personal notifications per user |
| **ALL** | Broadcast | Maintenance, system-wide announcements |

---

## 🛠️ SETUP INSTRUCTIONS

### Backend Setup

**1. Install dependencies** (Already installed):
```bash
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
```

**2. Files Created/Modified**:
- ✅ `src/common/websocket/events.gateway.ts` - Upgraded with JWT auth + rooms
- ✅ `src/common/websocket/websocket.module.ts` - Import JwtModule + PrismaModule
- ✅ `src/modules/notifications/notifications.service.ts` - Added notify*() methods
- ✅ `src/modules/notifications/notifications.controller.ts` - Added GET/PATCH endpoints
- ✅ `src/modules/notifications/notifications.module.ts` - Import WebsocketModule
- ✅ `src/modules/bookings/bookings.service.ts` - Call notifyBookingCancelled()

**3. Database Schema** (Already exists):
```prisma
model Notification {
  id        Int              @id @default(autoincrement())
  userId    Int?             // Null = broadcast
  user      User?            @relation(...)
  
  title     String
  message   String           @db.Text
  type      NotificationType @default(INFO)
  metadata  Json?
  
  isRead    Boolean          @default(false)
  readAt    DateTime?
  createdAt DateTime         @default(now())
}

enum NotificationType {
  INFO | SUCCESS | WARNING | ERROR
}
```

---

### Frontend Setup

**1. Install dependencies**:
```bash
cd frontend
npm install socket.io-client react-hot-toast date-fns
```

**2. Files Created**:
- ✅ `src/contexts/SocketContext.tsx` - Socket.io client + state management
- ✅ `src/components/common/NotificationBell.tsx` - Notification UI

**3. Setup in App**:

```typescript
// frontend/src/App.tsx
import { Toaster } from 'react-hot-toast';
import { SocketProvider } from './contexts/SocketContext';
import NotificationBell from './components/common/NotificationBell';

function App() {
  return (
    <SocketProvider>
      {/* Toast Container */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#333',
            color: '#fff',
            padding: '16px',
            borderRadius: '8px',
          },
          success: {
            iconTheme: {
              primary: '#10B981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#EF4444',
              secondary: '#fff',
            },
          },
        }}
      />

      {/* Your App Routes */}
      <YourAppContent />
    </SocketProvider>
  );
}
```

**4. Add NotificationBell to Navbar**:

```typescript
// In your Header/Navbar component
import NotificationBell from '@/components/common/NotificationBell';

function Header() {
  return (
    <header className="flex items-center gap-4">
      {/* Other nav items */}
      <NotificationBell />
      {/* User menu, etc. */}
    </header>
  );
}
```

---

## 🧪 TESTING

### Test 1: Đặt lịch mới
```bash
# Customer creates booking
POST http://localhost:3000/api/bookings
{
  "courtId": 1,
  "startTime": "2025-12-18T14:00:00",
  "endTime": "2025-12-18T16:00:00",
  "paymentMethod": "VNPAY"
}

✅ Expected:
- Staff sees toast: "🎯 Đơn đặt sân mới"
- Admin sees toast: "🎯 Đơn đặt sân mới"
- Bell unread count +1
```

### Test 2: Hủy lịch (Cancel Booking)
```bash
# Customer cancels booking
POST http://localhost:3000/api/bookings/1/cancel

✅ Expected:
- Staff sees toast: "⚠️ Hủy lịch đặt sân"
- Admin sees toast: "⚠️ Hủy lịch đặt sân"
- Message includes customer name + time
```

### Test 3: Thanh toán thành công
```bash
# Complete VNPay payment
GET http://localhost:3000/api/payments/vnpay/callback?vnp_ResponseCode=00&...

✅ Expected:
- Staff sees: "💰 Thanh toán nhận được: 500,000đ"
- Admin sees: "💰 Thanh toán nhận được: 500,000đ"
- Customer sees: "✅ Thanh toán thành công"
```

### Test 4: Bảo trì sân
```bash
# Admin schedules maintenance
POST http://localhost:3000/api/bookings
{
  "courtId": 1,
  "type": "MAINTENANCE",
  ...
}

✅ Expected:
- ALL users see: "🔧 Lịch bảo trì sân"
- Broadcast to everyone online
```

### Test 5: Check Notification Bell
1. Login as STAFF or ADMIN
2. Check bell icon has red badge with count
3. Click bell → Dropdown shows notifications
4. Click notification → Mark as read
5. Unread count decreases

---

## 📡 WEBSOCKET EVENTS

### Client → Server
| Event | Payload | Description |
|-------|---------|-------------|
| `connect` | `{ auth: { token } }` | Connect with JWT |
| `subscribe:notifications` | - | Subscribe to notifications |
| `notification:mark-read` | `{ notificationId }` | Mark as read |

### Server → Client
| Event | Payload | Target |
|-------|---------|--------|
| `connected` | `{ userId, role }` | Self |
| `notification:new` | `{ title, message, type, ... }` | Room/User |
| `booking:status-changed` | `{ bookingId, newStatus, message }` | User |
| `booking:refund-received` | `{ refundAmount, ... }` | User |
| `court:status-update` | `{ courtId, status }` | Broadcast |

---

## 🎨 NOTIFICATION UI COLORS

| Type | Toast | Badge | Icon |
|------|-------|-------|------|
| **SUCCESS** | Green | `bg-green-50 text-green-800` | ✅ |
| **WARNING** | Orange | `bg-yellow-50 text-yellow-800` | ⚠️ |
| **ERROR** | Red | `bg-red-50 text-red-800` | ❌ |
| **INFO** | Blue | `bg-blue-50 text-blue-800` | ℹ️ |

---

## 🔐 SECURITY

1. **JWT Authentication**: Socket connection requires valid JWT token
2. **Room Isolation**: Customers only receive personal notifications (user-{userId})
3. **Role-based Access**: Staff/Admin join respective rooms
4. **Database Persistence**: All notifications stored for audit trail

---

## 🚀 DEPLOYMENT NOTES

### Backend
1. Ensure `JWT_SECRET` in `.env`
2. Enable WebSocket in production CORS:
   ```typescript
   cors: {
     origin: ['https://yourdomain.com'],
     credentials: true,
   }
   ```
3. Use Redis adapter for horizontal scaling:
   ```bash
   npm install @socket.io/redis-adapter redis
   ```

### Frontend
1. Update socket URL for production:
   ```typescript
   const socket = io('https://api.yourdomain.com/events', { ... });
   ```
2. Store notifications in IndexedDB for offline support
3. Add service worker for push notifications

---

## 📊 MONITORING

### Logs to Watch
- `✅ Socket connected` - User connects
- `📤 Emitted 'notification:new' to staff-room` - Notification sent
- `🔔 Notification created` - Database record created

### Metrics
- Active socket connections
- Notifications per minute
- Unread notification count per user
- Toast click-through rate

---

## 🐛 TROUBLESHOOTING

### Issue: Socket không kết nối
**Solution**:
- Check token in localStorage
- Verify JWT_SECRET matches backend
- Check CORS configuration

### Issue: Không nhận notification
**Solution**:
- Check room join logic (role-based)
- Verify user role in JWT payload
- Check EventsGateway emit targets

### Issue: Toast spam
**Solution**:
- Adjust toast duration
- Implement rate limiting
- Group similar notifications

---

## 🎯 NEXT STEPS

Optional enhancements:
1. **Push Notifications** - Add service worker + FCM
2. **Notification Preferences** - Let users choose notification types
3. **Sound Alerts** - Add audio for important notifications
4. **Desktop Notifications** - Use Notification API
5. **Email Digest** - Send unread notifications via email
6. **Notification Archive** - Full-page notification history

---

**Status**: ✅ **COMPLETE & READY FOR TESTING**  
**Next**: Restart backend, test cancel booking, check staff notification bell!
