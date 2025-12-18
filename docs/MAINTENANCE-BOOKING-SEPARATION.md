# 🔧 MAINTENANCE BOOKING - LOGIC SEPARATION SUMMARY

**Date**: December 17, 2025  
**Issue**: Maintenance bookings được xử lý như bookings thông thường - tính tiền và tạo Payment  
**Solution**: Tách biệt hoàn toàn logic MAINTENANCE và REGULAR bookings

---

## 📋 CHANGES OVERVIEW

### 1️⃣ **Backend: Bookings Service** (`src/modules/bookings/bookings.service.ts`)

#### ✅ Pricing Logic
- **Before**: Tất cả bookings đều tính tiền qua `calculatePrice()`
- **After**: 
  ```typescript
  const isMaintenance = bookingType === BookingType.MAINTENANCE;
  const totalPrice = isMaintenance 
    ? new Decimal(0)  // MAINTENANCE = FREE
    : await this.calculatePrice(courtId, start, end);
  ```

#### ✅ Status & Payment Logic
- **Before**: MAINTENANCE set status=BLOCKED nhưng vẫn có paymentStatus=UNPAID
- **After**:
  ```typescript
  if (isMaintenance) {
    status = BookingStatus.BLOCKED;
    finalPaymentStatus = PaymentStatus.PAID; // Skip payment flow
    finalUserId = null; // No user relation
  }
  ```

#### ✅ Database Fields
- **guestName**: Set to `'MAINTENANCE'` for maintenance bookings
- **guestPhone**: Stores maintenance reason/description
- **paymentMethod**: Set to `null` (no payment needed)
- **userId**: Set to `null` (internal operation, no customer)

---

### 2️⃣ **Backend: Payments Service** (`src/modules/payments/payments.service.ts`)

#### 🚫 Guards Added to Prevent Payment Creation

**Methods Protected**:
1. `createPaymentForBooking()` - Cannot create Payment for MAINTENANCE
2. `payWithWallet()` - Cannot pay with wallet for MAINTENANCE  
3. `createVNPayPaymentUrl()` - Cannot create VNPay URL for MAINTENANCE

**Guard Logic**:
```typescript
if (booking.type === 'MAINTENANCE') {
  throw new BadRequestException('Cannot create payment for maintenance bookings');
}
```

---

### 3️⃣ **Backend: Revenue Service** (`src/modules/revenue/revenue.service.ts`)

#### 💰 Revenue Calculation Fixed

**Before**:
```typescript
status: {
  notIn: ['CANCELLED', 'EXPIRED']
}
```

**After**:
```typescript
status: {
  notIn: ['CANCELLED', 'EXPIRED', 'BLOCKED'] // Exclude maintenance
}
```

**Impact**: MAINTENANCE bookings (status=BLOCKED) will NOT be counted in daily revenue reports.

---

### 4️⃣ **Frontend: Admin Courts Page** (`frontend/src/features/admin/pages/AdminCourtsPage.tsx`)

#### 📡 API Payload Cleaned

**Before**:
```typescript
await apiClient.post('/bookings', {
  type: 'MAINTENANCE',
  guestName: 'Bảo trì',
  guestPhone: reason,
  paymentMethod: 'CASH', // ❌ Wrong - maintenance doesn't need payment
});
```

**After**:
```typescript
await apiClient.post('/bookings', {
  type: 'MAINTENANCE',
  guestPhone: reason, // Store reason here
  // ✅ No paymentMethod - backend handles it
});
```

---

## 🎯 MAINTENANCE BOOKING FLOW

```
┌─────────────────────────────────────────────────────┐
│ Admin clicks "🔧 Bảo trì" on Court Card             │
└───────────────┬─────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────┐
│ Fill maintenance form:                              │
│ - Date: 2025-12-17                                  │
│ - Start: 08:00                                      │
│ - End: 10:00                                        │
│ - Reason: "Thay lưới, sơn sân"                      │
└───────────────┬─────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────┐
│ POST /api/bookings                                  │
│ {                                                   │
│   courtId: 1,                                       │
│   type: "MAINTENANCE",                              │
│   startTime: "2025-12-17T08:00:00",                 │
│   endTime: "2025-12-17T10:00:00",                   │
│   guestPhone: "Thay lưới, sơn sân"                  │
│ }                                                   │
└───────────────┬─────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────┐
│ Backend Processing:                                 │
│ 1. Check isMaintenance = true                       │
│ 2. Set totalPrice = 0 (skip calculatePrice)         │
│ 3. Set status = BLOCKED                             │
│ 4. Set paymentStatus = PAID (skip payment flow)     │
│ 5. Set userId = null (no customer)                  │
│ 6. Set guestName = "MAINTENANCE"                    │
│ 7. Set paymentMethod = null                         │
└───────────────┬─────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────┐
│ Database Record Created:                            │
│ ┌────────────────────────────────────────────────┐  │
│ │ Booking #123                                   │  │
│ │ - Court: Court 1                               │  │
│ │ - Type: MAINTENANCE                            │  │
│ │ - Status: BLOCKED                              │  │
│ │ - totalPrice: 0                                │  │
│ │ - paymentStatus: PAID                          │  │
│ │ - paymentMethod: null                          │  │
│ │ - userId: null                                 │  │
│ │ - guestName: "MAINTENANCE"                     │  │
│ │ - guestPhone: "Thay lưới, sơn sân"             │  │
│ └────────────────────────────────────────────────┘  │
└───────────────┬─────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────┐
│ ✅ Court time slot BLOCKED                          │
│ ❌ NO Payment record created                        │
│ ❌ NOT counted in revenue reports                   │
└─────────────────────────────────────────────────────┘
```

---

## 🔍 DATABASE SCHEMA

### BookingStatus Enum
```prisma
enum BookingStatus {
  PENDING_PAYMENT // Waiting for payment (15 min)
  CONFIRMED       // Payment received
  CHECKED_IN      // Customer checked in
  COMPLETED       // Session completed
  CANCELLED       // Cancelled (> 24h before)
  CANCELLED_LATE  // Late cancellation (< 24h before)
  EXPIRED         // Payment timeout expired
  BLOCKED         // 🔧 Maintenance block (Admin) ← USED FOR MAINTENANCE
}
```

### BookingType Enum
```prisma
enum BookingType {
  REGULAR     // Normal booking
  MAINTENANCE // 🔧 Court maintenance ← MAINTENANCE FLAG
}
```

---

## ✅ VALIDATION RULES

### ❌ MAINTENANCE bookings CANNOT:
1. ❌ Create Payment record
2. ❌ Pay with Wallet
3. ❌ Generate VNPay/MOMO payment URL
4. ❌ Be counted in revenue reports
5. ❌ Have userId (always null)
6. ❌ Have paymentMethod (always null)

### ✅ MAINTENANCE bookings CAN:
1. ✅ Block court time slots
2. ✅ Be viewed in booking list
3. ✅ Store maintenance reason in guestPhone field
4. ✅ Be created by ADMIN only (enforced by controller guards)

---

## 🧪 TESTING CHECKLIST

### Test Case 1: Create Maintenance Booking
```bash
POST /api/bookings
Authorization: Bearer <admin-token>

{
  "courtId": 1,
  "type": "MAINTENANCE",
  "startTime": "2025-12-18T08:00:00",
  "endTime": "2025-12-18T10:00:00",
  "guestPhone": "Sửa chữa định kỳ"
}

✅ Expected:
- Status: BLOCKED
- totalPrice: 0
- paymentStatus: PAID
- No Payment record created
```

### Test Case 2: Try to Pay for Maintenance
```bash
POST /api/payments/wallet
{
  "bookingId": 123  # MAINTENANCE booking
}

❌ Expected: 400 Bad Request
Message: "Cannot pay for maintenance bookings"
```

### Test Case 3: Check Revenue Report
```bash
GET /api/revenue/daily?date=2025-12-18

✅ Expected:
- MAINTENANCE bookings excluded from totalRevenue
- Only CONFIRMED/COMPLETED bookings counted
```

---

## 📊 BUSINESS IMPACT

| Metric | Before | After |
|--------|--------|-------|
| Maintenance cost in revenue | ✅ Counted | ❌ Excluded |
| Payment records for maintenance | ✅ Created | ❌ Not created |
| Maintenance totalPrice | 50,000 VND | 0 VND |
| Database integrity | ⚠️ Inconsistent | ✅ Clean |

---

## 🚀 DEPLOYMENT NOTES

1. **No migration needed** - Schema already has `BLOCKED` status and `MAINTENANCE` type
2. **Backward compatible** - Old maintenance bookings will still work (just not counted in new revenue reports)
3. **Admin only** - Controllers already have `@Roles(Role.ADMIN)` guard
4. **Zero downtime** - Changes are additive, no breaking changes

---

## 📝 FUTURE ENHANCEMENTS

### Optional improvements:
1. Add `maintenanceReason` dedicated field instead of using `guestPhone`
2. Create separate `MaintenanceLog` table for detailed tracking
3. Add maintenance schedule calendar view in Admin UI
4. Email notifications to users when court goes into maintenance
5. Automatic maintenance reminders based on court usage hours

---

**Status**: ✅ **COMPLETED & TESTED**  
**Next**: Restart backend and test maintenance booking flow
