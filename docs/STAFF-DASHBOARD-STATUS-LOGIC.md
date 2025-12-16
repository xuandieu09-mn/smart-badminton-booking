# Staff Dashboard - Status Logic Implementation ✅

## 🎯 Tổng quan cập nhật

Đã cập nhật logic hiển thị trạng thái trong Staff Dashboard để phân biệt rõ 3 trường hợp quan trọng:

### 1. **⏳ WAITING (Chờ khách đến)**
- **Điều kiện**: `status === 'CONFIRMED'` + `checkInAt === null` + `now < startTime`
- **Màu sắc**: Blue badge (`bg-blue-100 text-blue-800`)
- **Icon**: ⏳
- **Action**: Hiển thị nút **"✅ Check-in"** (màu xanh dương)

### 2. **🎾 PLAYING (Đang chơi)**
- **Điều kiện**: `status === 'CHECKED_IN'` HOẶC `checkInAt !== null`
- **Màu sắc**: Green badge (`bg-green-100 text-green-800`)
- **Icon**: 🎾
- **Action**: Hiển thị text **"🎾 Đang chơi"** (không có nút)

### 3. **⚠️ LATE (Trễ giờ / No-show)**
- **Điều kiện**: `status === 'CONFIRMED'` + `checkInAt === null` + `now > startTime`
- **Màu sắc**: Orange badge (`bg-orange-100 text-orange-800`)
- **Icon**: ⚠️
- **Action**: Hiển thị nút **"✅ Check-in"** (màu cam cảnh báo)

---

## 🔧 Cấu trúc Code

### Interface Booking (Updated)
```typescript
interface Booking {
  id: number;
  bookingCode: string;
  courtId: number;
  startTime: string;
  endTime: string;
  status: string;
  totalPrice: number;
  guestName?: string;
  guestPhone?: string;
  checkInAt?: string | null; // ✅ NEW: Timestamp check-in
  user?: {
    id: number;
    name: string;
    email: string;
  };
  court?: {
    id: number;
    name: string;
    courtNumber: number;
  };
}
```

### Display Status Enum
```typescript
type DisplayStatus =
  | 'WAITING'    // Đã thanh toán, chờ khách đến
  | 'PLAYING'    // Đã check-in, đang chơi
  | 'LATE'       // Trễ giờ / No-show
  | 'PENDING'    // Chờ thanh toán
  | 'COMPLETED'  // Hoàn thành
  | 'CANCELLED'; // Đã hủy
```

### Status Config Object
```typescript
const DISPLAY_STATUS_CONFIG = {
  WAITING: {
    label: 'Chờ khách đến',
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    icon: '⏳',
    showCheckInBtn: true,
  },
  PLAYING: {
    label: 'Đang chơi',
    color: 'bg-green-100 text-green-800 border-green-300',
    icon: '🎾',
    showCheckInBtn: false,
  },
  LATE: {
    label: 'Trễ giờ',
    color: 'bg-orange-100 text-orange-800 border-orange-300',
    icon: '⚠️',
    showCheckInBtn: true,
  },
  // ... other statuses
};
```

### Logic Function
```typescript
const calculateDisplayStatus = (booking: Booking): DisplayStatus => {
  const now = new Date();
  const startTime = new Date(booking.startTime);
  const hasCheckedIn = !!booking.checkInAt;

  // Case 1: Đã check-in
  if (booking.status === 'CHECKED_IN' || hasCheckedIn) {
    return 'PLAYING';
  }

  // Case 2: CONFIRMED nhưng chưa check-in
  if (booking.status === 'CONFIRMED' && !hasCheckedIn) {
    if (now > startTime) {
      return 'LATE'; // ⚠️ Quá giờ
    }
    return 'WAITING'; // ⏳ Chờ khách
  }

  // ... other cases
};
```

---

## 📊 Stats Cards (NEW)

Đã thêm 4 stats cards chính:

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ 📅 Booking hôm  │  │ 🎾 Đang chơi    │  │ ⏳ Chờ khách     │  │ ⚠️ Trễ giờ      │
│      nay        │  │                 │  │                 │  │                 │
│      12         │  │       4         │  │       5         │  │       3         │
└─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘
```

### Code Stats Calculation
```typescript
const stats = useMemo(() => {
  const todayBookings = bookings.filter(b => isToday(new Date(b.startTime)));
  
  return {
    todayBookings: todayBookings.length,
    playingCount: todayBookings.filter(b => calculateDisplayStatus(b) === 'PLAYING').length,
    waitingCount: todayBookings.filter(b => calculateDisplayStatus(b) === 'WAITING').length,
    lateCount: todayBookings.filter(b => calculateDisplayStatus(b) === 'LATE').length,
  };
}, [bookings, totalBookings]);
```

---

## 🎨 UI Components

### Bảng Booking Table

#### Header
```
| Giờ         | Sân    | Khách hàng | SĐT        | Giá      | Trạng thái     | Hành động      |
|-------------|--------|------------|------------|----------|----------------|----------------|
```

#### Row Example 1: WAITING (Chờ khách)
```tsx
<tr>
  <td>09:00 - 10:00</td>
  <td>Sân 1</td>
  <td>Nguyễn Văn A</td>
  <td>0912345678</td>
  <td>150,000đ</td>
  <td>
    <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full border bg-blue-100 text-blue-800 border-blue-300">
      <span>⏳</span>
      <span>Chờ khách đến</span>
    </span>
  </td>
  <td>
    <button className="bg-blue-600 hover:bg-blue-700 text-white">
      ✅ Check-in
    </button>
  </td>
</tr>
```

#### Row Example 2: PLAYING (Đang chơi)
```tsx
<tr>
  <td>08:00 - 09:00</td>
  <td>Sân 2</td>
  <td>Trần Văn B</td>
  <td>0987654321</td>
  <td>150,000đ</td>
  <td>
    <span className="bg-green-100 text-green-800 border-green-300">
      <span>🎾</span>
      <span>Đang chơi</span>
    </span>
  </td>
  <td>
    <span className="text-green-600">🎾 Đang chơi</span>
  </td>
</tr>
```

#### Row Example 3: LATE (Trễ giờ)
```tsx
<tr>
  <td>07:00 - 08:00</td>
  <td>Sân 3</td>
  <td>Lê Văn C</td>
  <td>0901234567</td>
  <td>150,000đ</td>
  <td>
    <span className="bg-orange-100 text-orange-800 border-orange-300">
      <span>⚠️</span>
      <span>Trễ giờ</span>
    </span>
  </td>
  <td>
    <button className="bg-orange-600 hover:bg-orange-700 text-white">
      ✅ Check-in
    </button>
  </td>
</tr>
```

---

## 🧪 Test Cases

### Test Case 1: Booking chưa đến giờ (WAITING)
```sql
-- Setup data
UPDATE bookings 
SET status = 'CONFIRMED', 
    checkInAt = NULL,
    startTime = NOW() + INTERVAL '30 minutes'
WHERE id = 1;
```

**Expected Result:**
- Badge: ⏳ Chờ khách đến (Blue)
- Button: ✅ Check-in (Blue button)
- Stats Card "Chờ khách": +1

---

### Test Case 2: Booking đã check-in (PLAYING)
```sql
-- Setup data
UPDATE bookings 
SET status = 'CHECKED_IN', 
    checkInAt = NOW(),
    startTime = NOW() - INTERVAL '10 minutes'
WHERE id = 2;
```

**Expected Result:**
- Badge: 🎾 Đang chơi (Green)
- Action: 🎾 Đang chơi (text only, no button)
- Stats Card "Đang chơi": +1

---

### Test Case 3: Booking trễ giờ (LATE)
```sql
-- Setup data
UPDATE bookings 
SET status = 'CONFIRMED', 
    checkInAt = NULL,
    startTime = NOW() - INTERVAL '30 minutes'
WHERE id = 3;
```

**Expected Result:**
- Badge: ⚠️ Trễ giờ (Orange)
- Button: ✅ Check-in (Orange button - warning color)
- Stats Card "Trễ giờ": +1

---

### Test Case 4: Booking chờ thanh toán (PENDING)
```sql
UPDATE bookings 
SET status = 'PENDING_PAYMENT'
WHERE id = 4;
```

**Expected Result:**
- Badge: 💳 Chờ thanh toán (Yellow)
- Action: "Chờ thanh toán" (italic text, no button)

---

## 🎯 Checklist Hoàn thành

- [x] ✅ Thêm `checkInAt` field vào Booking interface
- [x] ✅ Tạo `DisplayStatus` enum
- [x] ✅ Tạo `DISPLAY_STATUS_CONFIG` object
- [x] ✅ Viết `calculateDisplayStatus()` function
- [x] ✅ Cập nhật Stats Cards với Playing/Waiting/Late counts
- [x] ✅ Cập nhật Badge hiển thị với icon + label
- [x] ✅ Cập nhật Action button có điều kiện
- [x] ✅ Nút Check-in có màu khác nhau (Blue vs Orange)
- [x] ✅ Xóa old helper functions (getStatusColor, getStatusLabel)
- [x] ✅ Test compilation (No TypeScript errors)

---

## 🚀 How to Test

### 1. Start Frontend
```bash
cd frontend
npm run dev
```

### 2. Login as Staff
- URL: http://localhost:5173/auth/login
- Email: `staff1@test.com`
- Password: `password123`

### 3. Navigate to Staff Dashboard
- URL: http://localhost:5173/staff

### 4. Verify Stats Cards
- Check "Đang chơi" count
- Check "Chờ khách" count
- Check "Trễ giờ" count

### 5. Verify Booking Table
- Click tab "Danh sách booking"
- Check badge colors match status
- Check action buttons appear correctly
- Verify late bookings show orange badge + orange button

### 6. Test Time-based Logic
To test LATE status, you can:

**Option A: Update database directly**
```sql
UPDATE bookings 
SET startTime = NOW() - INTERVAL '30 minutes',
    status = 'CONFIRMED',
    checkInAt = NULL
WHERE id = <booking_id>;
```

**Option B: Create new booking in the past** (via Postman/API)
```bash
curl -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <staff_token>" \
  -d '{
    "courtId": 1,
    "startTime": "2025-12-16T07:00:00",
    "endTime": "2025-12-16T08:00:00",
    "paymentMethod": "WALLET"
  }'
```

---

## 📈 Performance Notes

- **useMemo**: Stats được cache và chỉ recalculate khi `bookings` hoặc `totalBookings` thay đổi
- **Auto-refresh**: Data tự động refresh mỗi 30 giây
- **Client-side filtering**: Tất cả logic trạng thái được xử lý tại client để giảm tải server

---

## 🔮 Future Enhancements

### Phase 2 (Optional):
1. **Auto-mark LATE as NO_SHOW**: Sau 15 phút không check-in → tự động đánh dấu no-show
2. **Notification**: Push notification cho staff khi có booking trễ giờ
3. **Bulk Check-in**: Check-in nhiều booking cùng lúc
4. **QR Scanner**: Integrate QR scanner trực tiếp trong dashboard

---

## ✅ Summary

Staff Dashboard giờ đây có thể:
- ✅ Phân biệt rõ 3 trạng thái quan trọng (WAITING, PLAYING, LATE)
- ✅ Hiển thị badge với màu sắc và icon phù hợp
- ✅ Hiển thị action button có điều kiện
- ✅ Track real-time stats với 4 metrics
- ✅ Cảnh báo staff về bookings trễ giờ (màu cam)

**Ready for production!** 🚀
