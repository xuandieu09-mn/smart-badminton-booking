# ✅ Checklist Kiểm Tra Chức Năng Đặt Lịch Cố Định

## 📋 Tổng Quan
- **Endpoint Check Availability**: `POST /api/bookings/fixed/check`
- **Endpoint Create Booking**: `POST /api/bookings/fixed`
- **Endpoint Generate QR**: `POST /api/bookings/groups/:id/generate-qr`

---

## 🔧 Chuẩn Bị

### 1. Khởi động Backend
```bash
cd e:\TOT_NGHIEP\smart-badminton-booking
npm start
```
**Kiểm tra**: Backend chạy tại `http://localhost:3000`

### 2. Khởi động Frontend
```bash
cd frontend
npm run dev
```
**Kiểm tra**: Frontend chạy tại `http://localhost:5173`

### 3. Kiểm tra Database
- [ ] PostgreSQL đang chạy
- [ ] Database có ít nhất 1 sân (Court) active
- [ ] User test đã có ví (Wallet) với số dư đủ

---

## 🧪 Test Cases

### ✅ Test 1: Kiểm tra UI - Form Đặt Lịch Cố Định

**Bước thực hiện:**
1. Login với tài khoản customer: `customer@test.com` / `password123`
2. Truy cập `/fixed-booking`
3. Kiểm tra form hiển thị đầy đủ:
   - [ ] Dropdown chọn sân
   - [ ] Date Range Picker (từ ngày - đến ngày)
   - [ ] Time Range Picker (giờ bắt đầu - giờ kết thúc)
   - [ ] Checkbox chọn thứ trong tuần (T2-CN)
   - [ ] Button "Kiểm tra tình trạng"
   - [ ] Banner ưu đãi (>4 buổi: 5%, >8 buổi: 10%)

**Kết quả mong đợi:**
- Form hiển thị đẹp, không có lỗi console
- Tất cả controls hoạt động bình thường

---

### ✅ Test 2: Kiểm tra API - Check Availability (Trường hợp trống)

**Payload mẫu:**
```json
POST /api/bookings/fixed/check
{
  "courtId": 1,
  "startDate": "2025-01-06",
  "endDate": "2025-02-06",
  "daysOfWeek": [1, 3, 5],
  "startTime": "18:00",
  "endTime": "20:00"
}
```

**Kết quả mong đợi:**
```json
{
  "success": true,
  "summary": {
    "courtName": "Sân 1",
    "schedule": "T2, T4, T6 (18:00 - 20:00)",
    "period": "06/01/2025 - 06/02/2025",
    "totalSessions": 12,
    "originalPrice": 1200000,
    "discountRate": 10,
    "discountAmount": 120000,
    "finalPrice": 1080000,
    "walletBalance": 2000000,
    "hasEnoughBalance": true
  },
  "message": "All dates are available"
}
```

**Kiểm tra:**
- [ ] HTTP Status 200
- [ ] `success: true`
- [ ] Tính toán giá đúng
- [ ] Giảm giá 10% (>8 buổi)
- [ ] Hiển thị số dư ví

---

### ✅ Test 3: Kiểm tra API - Check Availability (Có xung đột)

**Chuẩn bị:**
- Tạo 1 booking trùng ngày (ví dụ: 08/01/2025 18:00-20:00)

**Payload:**
```json
POST /api/bookings/fixed/check
{
  "courtId": 1,
  "startDate": "2025-01-06",
  "endDate": "2025-02-06",
  "daysOfWeek": [1, 3, 5],
  "startTime": "18:00",
  "endTime": "20:00"
}
```

**Kết quả mong đợi:**
```json
{
  "success": false,
  "conflicts": [
    {
      "date": "2025-01-08",
      "day": "Thứ 4",
      "bookingCode": "BK250108-XXXX"
    }
  ],
  "message": "Found 1 conflicting date(s)"
}
```

**Kiểm tra:**
- [ ] HTTP Status 200
- [ ] `success: false`
- [ ] Array `conflicts` chứa thông tin ngày trùng
- [ ] Hiển thị mã booking bị xung đột

---

### ✅ Test 4: Frontend - Hiển thị Summary khi trống

**Bước thực hiện:**
1. Điền form với dữ liệu không xung đột
2. Click "Kiểm tra tình trạng"

**Kết quả mong đợi:**
- [ ] Card xanh hiển thị "Lịch trống - Sẵn sàng đặt!"
- [ ] Hiển thị đúng:
  - Tên sân
  - Lịch chơi (T2, T4, T6...)
  - Thời gian
  - Tổng số buổi
  - Tổng tiền gốc
  - Giảm giá (%)
  - Thành tiền
- [ ] Button "Xác nhận đặt lịch" màu đỏ

---

### ✅ Test 5: Frontend - Hiển thị Conflicts

**Bước thực hiện:**
1. Điền form với dữ liệu CÓ xung đột
2. Click "Kiểm tra tình trạng"

**Kết quả mong đợi:**
- [ ] Alert đỏ hiển thị "⚠️ Có ngày bị trùng lịch"
- [ ] Danh sách ngày xung đột với:
  - Ngày (DD/MM/YYYY)
  - Thứ trong tuần
  - Mã booking bị trùng
- [ ] Gợi ý "Vui lòng chọn sân khác hoặc đổi giờ chơi"
- [ ] KHÔNG hiển thị summary và button đặt lịch

---

### ✅ Test 6: Tạo Booking - Thành công

**Bước thực hiện:**
1. Kiểm tra availability → Trống
2. Click "Xác nhận đặt lịch"

**Kết quả mong đợi:**

**Backend Response:**
```json
{
  "message": "Fixed schedule booking created successfully! 🎉",
  "bookingGroup": {
    "id": 1,
    "totalSessions": 12,
    "originalPrice": 1200000,
    "discountRate": 10,
    "discountAmount": 120000,
    "finalPrice": 1080000,
    "status": "CONFIRMED",
    "qrCode": "data:image/png;base64,..."
  },
  "bookings": [...],
  "wallet": {
    "newBalance": 920000
  }
}
```

**Frontend:**
- [ ] Hiển thị card xanh "Đặt lịch thành công! 🎉"
- [ ] Hiển thị mã nhóm: `#1`
- [ ] Hiển thị tổng buổi và số tiền
- [ ] **Hiển thị QR Code (250x250px)**
- [ ] Text: "🎫 Mã QR Check-in (Dùng cho tất cả 12 buổi)"
- [ ] Gợi ý "Lưu mã QR này hoặc kiểm tra email"
- [ ] Button "Đặt lịch mới"

**Database:**
- [ ] Bảng `BookingGroup`: 1 record mới
- [ ] Bảng `Booking`: 12 records (1 cho mỗi buổi)
- [ ] Bảng `Wallet`: Số dư giảm 1,080,000 VND
- [ ] Bảng `WalletTransaction`: 1 record PAYMENT

**Email:**
- [ ] Email gửi đến `customer@test.com`
- [ ] Subject: "🎉 Xác nhận đặt lịch cố định - 12 buổi tại Sân 1"
- [ ] Body chứa:
  - Thông tin lịch
  - Danh sách 12 buổi
  - QR Code (250px)
  - Tổng tiền và giảm giá
- [ ] Link đến dashboard

---

### ✅ Test 7: Tạo Booking - Không đủ tiền

**Chuẩn bị:**
- Rút tiền ví còn 500,000 VND (ít hơn finalPrice)

**Bước thực hiện:**
1. Kiểm tra availability → Trống
2. Click "Xác nhận đặt lịch"

**Kết quả mong đợi:**
- [ ] HTTP Status 400
- [ ] Error: "Insufficient wallet balance. Required: 1080000 VND, Available: 500000 VND"
- [ ] Frontend hiển thị notification lỗi
- [ ] KHÔNG tạo booking
- [ ] Số dư ví KHÔNG thay đổi

---

### ✅ Test 8: Admin - Xem Booking Group

**Bước thực hiện:**
1. Login với tài khoản admin: `admin@test.com` / `password123`
2. Truy cập trang Admin Bookings
3. Tìm booking thuộc group (badge màu tím)
4. Click vào badge màu tím

**Kết quả mong đợi:**
- [ ] Modal hiển thị chi tiết booking group
- [ ] Thông tin:
  - Mã nhóm #X
  - Khách hàng
  - Sân
  - Lịch (T2, T4, T6...)
  - Tổng 12 buổi
  - Giá gốc, giảm giá, thành tiền
  - Trạng thái: CONFIRMED
- [ ] Danh sách 12 bookings
- [ ] **Card "🎫 Mã QR Check-in"** với:
  - Button "Tạo QR Code"
  - Khi click → Hiển thị QR (200x200px)
  - Text: "Mã QR này dùng cho tất cả 12 buổi"

---

### ✅ Test 9: Staff - QR Check-in (Group QR)

**Bước thực hiện:**
1. Login với tài khoản staff: `staff@test.com` / `password123`
2. Truy cập `/staff/checkin`
3. Nhập mã QR: `GROUP-1` (hoặc scan QR)
4. Click "Check-in"

**Kết quả mong đợi:**
- [ ] Hiển thị danh sách 12 buổi
- [ ] Mỗi buổi hiển thị:
  - Ngày (DD/MM/YYYY)
  - Thứ
  - Giờ (HH:mm - HH:mm)
  - Button "Check-in"
- [ ] Click vào buổi hôm nay → Check-in thành công
- [ ] Notification: "Check-in successful"
- [ ] Status booking → `CHECKED_IN`

---

### ✅ Test 10: Thông báo Real-time

**Scenario 1: Đặt lịch mới**
- [ ] Customer nhận notification: "Đặt lịch thành công"
- [ ] Staff nhận notification: "Khách đặt lịch mới"
- [ ] Admin nhận notification: "Khách đặt lịch mới"

**Scenario 2: Thanh toán**
- [ ] Customer nhận: "💸 Thanh toán thành công - -1,080,000đ"
- [ ] Staff/Admin nhận: "Thanh toán thành công"

**Scenario 3: Nạp tiền**
- [ ] Customer nhận: "💰 Nạp tiền thành công - +XXX đ"

---

## 🐛 Known Issues & Fixes

### Issue 1: DTO Validation
- ✅ Fixed: `CreateFixedBookingDto` có đầy đủ validators

### Issue 2: Module Dependencies
- ✅ Fixed: WalletModule export WalletService và import NotificationsModule

### Issue 3: Frontend QR Display
- ✅ Fixed: Component `FixedScheduleBooking` hiển thị QR sau khi đặt thành công

### Issue 4: Alert Deprecated Props
- ✅ Fixed: Đã thay `message` → `title` trong Alert components

---

## 📊 Kết Quả

### Backend
- [x] Compile thành công (0 errors)
- [ ] Endpoint `/fixed/check` hoạt động
- [ ] Endpoint `/fixed` tạo booking thành công
- [ ] QR code được generate
- [ ] Email được gửi
- [ ] Wallet transaction được tạo
- [ ] Notifications được gửi

### Frontend
- [x] Compile thành công
- [ ] Form validation hoạt động
- [ ] API calls thành công
- [ ] UI hiển thị đúng
- [ ] QR code hiển thị
- [ ] Real-time notifications

### Database
- [ ] BookingGroup được tạo
- [ ] Bookings (12 records) được tạo
- [ ] Wallet balance cập nhật đúng
- [ ] WalletTransaction ghi log

---

## 🚀 Deployment Checklist

- [ ] Environment variables đầy đủ (.env)
- [ ] SMTP config cho email
- [ ] PostgreSQL connection
- [ ] Frontend API URL đúng
- [ ] Socket.IO config
- [ ] CORS settings

---

**Ghi chú:** Sau khi test xong, báo cáo kết quả tại đây ✅
