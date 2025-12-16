# Staff Dashboard Upgrade - Real Data Implementation

## ✅ Hoàn thành: Nâng cấp StaffDashboard từ Dummy Data → Real Data

### 📊 Tổng quan thay đổi

Đã nâng cấp [StaffDashboard.tsx](../frontend/src/features/staff/pages/StaffDashboard.tsx) từ giao diện tĩnh (dummy data) sang giao diện động (real data) với các tính năng sau:

---

## 🎯 Các tính năng đã triển khai

### 1. **Real-time Data Fetching**
- ✅ Gọi API `GET /api/bookings` để lấy tất cả bookings
- ✅ Auto-refetch mỗi 30 giây để cập nhật data
- ✅ Xử lý loading state với spinner animation

### 2. **Client-side Stats Calculation** (useMemo optimization)

#### 📅 Booking hôm nay
```typescript
// Lọc và đếm bookings có startTime = today
const todayBookingsCount = bookings.filter(isToday).length;
```

#### ⏰ Chờ thanh toán
```typescript
// Đếm tất cả bookings có status PENDING_PAYMENT
const pendingPayments = bookings.filter(b => b.status === 'PENDING_PAYMENT').length;
```

#### 📊 Tổng booking
```typescript
// Tổng số bookings trong hệ thống
const totalBookings = bookings.length;
```

#### 📈 Công suất (Occupancy Rate)
```typescript
// Giả định: 8 sân, mỗi sân mở 12 giờ/ngày (8:00 - 20:00)
const TOTAL_COURTS = 8;
const HOURS_PER_DAY = 12;
const totalAvailableHours = 96; // 8 * 12

// Tính tổng số giờ đã đặt hôm nay
const hoursBookedToday = todayBookings.reduce((total, booking) => {
  const hours = differenceInHours(endTime, startTime);
  return total + hours;
}, 0);

// Công suất = (Giờ đã đặt / Tổng giờ available) * 100
const occupancyRate = Math.round((hoursBookedToday / totalAvailableHours) * 100);
```

---

## 📋 Bảng booking chi tiết (Tab "Danh sách booking")

### Cột hiển thị:
| Cột | Mô tả | Ví dụ |
|-----|-------|-------|
| **Giờ** | Thời gian booking | `09:00 - 10:00` |
| **Sân** | Tên sân hoặc số sân | `Sân 1` / `Court A` |
| **Khách hàng** | Tên khách (user hoặc guest) | `Nguyễn Văn A` |
| **SĐT** | Số điện thoại | `0912345678` |
| **Giá** | Tổng tiền booking | `150,000đ` |
| **Trạng thái** | Badge màu theo status | `Đã xác nhận` |
| **Hành động** | Nút Check-in (nếu CONFIRMED) | [✅ Check-in] |

### Logic hiển thị:
```typescript
// Chỉ hiển thị bookings hôm nay, sắp xếp theo thời gian
const todayBookingsList = bookings
  .filter(booking => isToday(new Date(booking.startTime)))
  .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
```

---

## 🎨 Status Badge Colors (Theo yêu cầu)

| Status | Màu | CSS Class | Label tiếng Việt |
|--------|-----|-----------|------------------|
| **CONFIRMED** | 🔵 Blue | `bg-blue-100 text-blue-800` | Đã xác nhận |
| **PENDING_PAYMENT** | 🟡 Yellow | `bg-yellow-100 text-yellow-800` | Chờ thanh toán |
| **CHECKED_IN** | 🟢 Green | `bg-green-100 text-green-800` | Đã check-in |
| **COMPLETED** | 🟢 Green | `bg-green-100 text-green-800` | Hoàn thành |
| **CANCELLED** | ⚪ Gray | `bg-gray-100 text-gray-800` | Đã hủy |
| **EXPIRED** | ⚪ Gray | `bg-gray-100 text-gray-600` | Hết hạn |

---

## 🔘 Hành động trên từng booking

### Nút Check-in (CONFIRMED status)
```tsx
{booking.status === 'CONFIRMED' && (
  <button onClick={() => navigate('/staff/checkin')}>
    ✅ Check-in
  </button>
)}
```

### Trạng thái khác:
- **PENDING_PAYMENT**: Hiển thị text "Chờ thanh toán" (italic, gray)
- **CHECKED_IN**: Hiển thị "✓ Đã check-in" (green, bold)
- **Trạng thái khác**: Không có action button

---

## 🚀 Thao tác nhanh (Quick Actions) - Có Navigation

### 3 nút thao tác nhanh đã được thêm navigation:

1. **✅ Check-in khách**
   - Click → Navigate to `/staff/checkin`
   - Màu hover: Blue

2. **🏟️ Trạng thái sân**
   - Click → Navigate to `/staff/courts`
   - Màu hover: Green

3. **🛒 POS**
   - Click → Navigate to `/staff/pos`
   - Màu hover: Purple

---

## 🔧 Dependencies sử dụng

### Đã có sẵn trong project:
- ✅ `date-fns` (v4.1.0) - Xử lý date/time
- ✅ `react-router-dom` (v7.10.1) - Navigation
- ✅ `@tanstack/react-query` (v5.90.12) - Data fetching
- ✅ `axios` (v1.13.2) - HTTP client

### Import statements:
```typescript
import { isToday, format, startOfDay, endOfDay, differenceInHours } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
```

---

## 📊 Data Flow

```
1. Component Mount
   ↓
2. useQuery → GET /api/bookings (with auto-refetch 30s)
   ↓
3. Response: { bookings: Booking[] }
   ↓
4. useMemo → Calculate stats (client-side)
   - todayBookings
   - totalBookings
   - pendingPayments
   - occupancyRate
   ↓
5. useMemo → Filter today's bookings for table
   ↓
6. Render UI với real data
```

---

## 🎯 Test Scenarios

### Scenario 1: Staff login và xem dashboard
1. Login với tài khoản Staff
2. Dashboard hiển thị:
   - ✅ 4 card stats với số liệu thực
   - ✅ Bảng booking hôm nay (nếu có)
   - ✅ Empty state nếu chưa có booking

### Scenario 2: Có bookings hôm nay
1. Tạo booking cho ngày hôm nay
2. Dashboard tự động update sau 30s (hoặc refresh)
3. Kiểm tra:
   - ✅ Card "Booking hôm nay" tăng +1
   - ✅ Bảng hiển thị booking mới
   - ✅ Status badge đúng màu
   - ✅ Nút Check-in xuất hiện (nếu CONFIRMED)

### Scenario 3: Click quick actions
1. Click "Check-in khách" → Navigate to `/staff/checkin`
2. Click "Trạng thái sân" → Navigate to `/staff/courts`
3. Click "POS" → Navigate to `/staff/pos`

### Scenario 4: Click Check-in button trong table
1. Tìm booking có status CONFIRMED
2. Click nút "✅ Check-in"
3. Navigate to `/staff/checkin` page

---

## 🐛 Lưu ý khi test

### 1. Công suất (Occupancy Rate)
- Giả định: **8 sân**, **12 giờ/ngày** (8:00 - 20:00)
- Nếu số sân khác, cần update constants:
  ```typescript
  const TOTAL_COURTS = 8; // ← Update ở đây
  const HOURS_PER_DAY = 12; // ← Update ở đây
  ```

### 2. API Response Format
- API phải trả về: `{ bookings: Booking[] }`
- Nếu format khác, cần update:
  ```typescript
  const bookings = bookingsResponse?.bookings || [];
  ```

### 3. Empty State
- Nếu chưa có booking hôm nay:
  - ✅ Hiển thị icon 📅
  - ✅ Text: "Chưa có booking nào hôm nay"
  - ✅ Subtext: "Danh sách sẽ tự động cập nhật..."

---

## ✅ Checklist hoàn thành

- [x] ✅ Fetch real data từ API `/api/bookings`
- [x] ✅ Client-side calculation cho 4 stats
- [x] ✅ Bảng booking chi tiết với 7 cột
- [x] ✅ Status badge với đúng màu sắc theo yêu cầu
- [x] ✅ Nút Check-in cho bookings CONFIRMED
- [x] ✅ Navigation cho Quick Actions (3 nút)
- [x] ✅ Auto-refetch mỗi 30 giây
- [x] ✅ Loading state với spinner
- [x] ✅ Empty state khi chưa có booking
- [x] ✅ Vietnamese labels cho status
- [x] ✅ Giữ nguyên layout hiện tại (Sidebar + Header)

---

## 🎉 Kết quả

Staff Dashboard giờ đây hiển thị **real-time data** với:
- ✅ Stats cards cập nhật theo bookings thực tế
- ✅ Bảng booking chi tiết với đầy đủ thông tin
- ✅ Navigation hoàn chỉnh cho các thao tác nhanh
- ✅ UI/UX đẹp và responsive

**Ready for testing!** 🚀
