# Revenue Tracking & Shift Management

## 📊 Overview

Hệ thống theo dõi doanh thu và quản lý ca làm việc cho Staff/Admin.

### Features
- ✅ Daily revenue report (all transactions)
- ✅ Shift revenue tracking (per staff)
- ✅ Payment method breakdown (Cash vs Bank Transfer)
- ✅ Shift closing with summary
- ✅ Booking + POS unified reporting

---

## 🔧 Backend APIs

### 1. Get Daily Revenue
```http
GET /api/revenue/daily?date=2025-12-16
Authorization: Bearer <token>
Roles: STAFF, ADMIN
```

**Response**:
```json
{
  "date": "2025-12-16",
  "summary": {
    "totalRevenue": 2500000,
    "bookingRevenue": 1800000,
    "posRevenue": 700000,
    "cashRevenue": 1500000,
    "transferRevenue": 1000000
  },
  "breakdown": {
    "bookings": {
      "count": 15,
      "cash": 10,
      "transfer": 5,
      "items": [...]
    },
    "sales": {
      "count": 20,
      "cash": 15,
      "transfer": 5,
      "items": [...]
    }
  }
}
```

### 2. Get Shift Revenue (Current Staff)
```http
GET /api/revenue/shift
Authorization: Bearer <token>
Roles: STAFF
```

**Response**:
```json
{
  "staffId": 2,
  "shiftDate": "2025-12-16",
  "bookingsCount": 8,
  "salesCount": 12,
  "bookingRevenue": 900000,
  "posRevenue": 400000,
  "totalRevenue": 1300000,
  "bookings": [...],
  "sales": [...]
}
```

### 3. Close Shift
```http
POST /api/revenue/close-shift
Authorization: Bearer <token>
Roles: STAFF
```

**Response**:
```json
{
  "message": "Shift closed successfully",
  "staffId": 2,
  "shiftDate": "2025-12-16",
  "bookingsCount": 8,
  "salesCount": 12,
  "totalRevenue": 1300000,
  ...
}
```

---

## 💾 Database Structure

### Existing Tables
```prisma
model Booking {
  paymentMethod PaymentMethod? // CASH, BANK_TRANSFER, VNPAY, WALLET
  createdByStaffId Int? // Track which staff created booking
  // ...
}

model Sale {
  paymentMethod String @default("CASH") // "CASH" | "BANK_TRANSFER"
  staffId Int // Track which staff processed sale
  // ...
}
```

### Revenue Calculation Logic
```typescript
// Booking Revenue
WHERE status NOT IN ('CANCELLED', 'EXPIRED')
AND createdAt BETWEEN startOfDay AND endOfDay

// POS Revenue
WHERE createdAt BETWEEN startOfDay AND endOfDay

// Cash vs Transfer
CASH: paymentMethod = 'CASH'
TRANSFER: paymentMethod IN ('BANK_TRANSFER', 'VNPAY')
```

---

## 🎯 Frontend Integration

### Staff Courts Page Updates
✅ Auto-fill staff name from profile (`GET /api/users/profile`)
✅ Payment method selector (Cash/Bank Transfer)
✅ Payment method saved to booking

### POS Page Updates
✅ Payment method selector (Cash/Bank Transfer)
✅ Payment method saved to sale

---

## 📈 Future Features (Prepared)

### 1. Shift Closing UI
```tsx
// Staff Dashboard - End of Shift
const handleCloseShift = async () => {
  const { data } = await API.post('/revenue/close-shift');
  
  alert(`
    ✅ Ca làm việc đã đóng
    Số booking: ${data.bookingsCount}
    Số đơn hàng: ${data.salesCount}
    Tổng doanh thu: ${formatCurrency(data.totalRevenue)}
  `);
};
```

### 2. Admin Revenue Dashboard
```tsx
// Admin Dashboard
const { data } = await API.get('/revenue/daily?date=2025-12-16');

// Display charts:
- Line chart: Revenue trend (7 days)
- Pie chart: Cash vs Transfer ratio
- Bar chart: Booking vs POS revenue
- Table: Top selling products
- Table: Staff performance
```

### 3. Reconciliation Report
```typescript
// Compare actual cash with system records
interface CashReconciliation {
  systemCash: number; // From database
  actualCash: number; // Counted by staff
  difference: number; // actualCash - systemCash
  notes: string;
}
```

---

## 🔍 Testing

### Test Daily Revenue
```bash
# 1. Create test bookings (Staff Courts)
- Create 2 bookings with CASH
- Create 1 booking with BANK_TRANSFER

# 2. Create test sales (POS)
- Sell 3 products with CASH
- Sell 2 products with BANK_TRANSFER

# 3. Check revenue
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/revenue/daily?date=2025-12-16
```

### Test Shift Tracking
```bash
# 1. Login as STAFF
# 2. Create bookings and sales
# 3. Check shift revenue
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/revenue/shift

# 4. Close shift
curl -X POST -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/revenue/close-shift
```

---

## 🎨 UI Components (Ready to Build)

### 1. Revenue Dashboard
```tsx
<RevenueDashboard>
  <StatCard title="Doanh thu hôm nay" value={totalRevenue} />
  <StatCard title="Booking" value={bookingRevenue} />
  <StatCard title="POS" value={posRevenue} />
  
  <PaymentBreakdown cash={cashRevenue} transfer={transferRevenue} />
  
  <RecentTransactions bookings={...} sales={...} />
</RevenueDashboard>
```

### 2. Shift Summary
```tsx
<ShiftSummary>
  <h2>Ca làm việc - {staffName}</h2>
  <div>Số booking: {bookingsCount}</div>
  <div>Số đơn hàng: {salesCount}</div>
  <div>Tổng thu: {totalRevenue}</div>
  
  <button onClick={handleCloseShift}>
    🔒 Đóng ca
  </button>
</ShiftSummary>
```

---

## ✅ Checklist

### Backend
- [x] Revenue tracking service
- [x] Daily revenue endpoint
- [x] Shift revenue endpoint
- [x] Close shift endpoint
- [x] Payment method in Booking
- [x] Payment method in Sale
- [x] Staff ID tracking

### Frontend
- [x] Payment method selector (Staff Courts)
- [x] Payment method selector (POS)
- [x] Auto-fill staff info
- [ ] Revenue dashboard UI
- [ ] Shift closing UI
- [ ] Admin reports

### Testing
- [ ] Create test bookings with different payment methods
- [ ] Create test sales with different payment methods
- [ ] Verify revenue calculations
- [ ] Test shift closing
- [ ] Verify database records

---

**Status**: ✅ Backend Complete, Frontend Partially Complete
**Next Steps**: Build Revenue Dashboard UI for Staff/Admin
