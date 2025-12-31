# 🧪 Hướng dẫn Test Tính năng Lịch Cố Định (Fixed Schedule Booking)

## 📋 Tổng quan

Tính năng cho phép khách hàng đặt lịch cố định (ví dụ: Mỗi thứ 2, 4, 6 từ 18:00-20:00 trong 1 tháng) với:
- ✅ Giảm giá tự động (5% cho >4 buổi, 10% cho >8 buổi)
- ✅ Email gộp liệt kê toàn bộ lịch
- ✅ Admin có thể xem và hủy cả chuỗi
- ✅ Badge "Lịch tháng" để nhận diện

---

## 🚀 Bước 1: Chuẩn bị môi trường

### 1.1. Cấu hình SMTP Email

Mở file `.env` và cập nhật thông tin email:

```env
# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com        # ← Thay bằng email của bạn
SMTP_PASS=your-app-password-here      # ← Thay bằng App Password
```

#### Lấy Gmail App Password:

1. Truy cập: https://myaccount.google.com/security
2. Bật **2-Step Verification** (xác minh 2 bước)
3. Vào **App passwords**: https://myaccount.google.com/apppasswords
4. Chọn **Mail** và thiết bị của bạn
5. Copy mã 16 ký tự (ví dụ: `abcd efgh ijkl mnop`)
6. Dán vào `SMTP_PASS` trong `.env`

### 1.2. Khởi động Backend

```bash
cd e:\TOT_NGHIEP\smart-badminton-booking
npm run start:dev
```

Kiểm tra console có thông báo:
```
[Nest] LOG [BootstrapConsole] Application is running on: http://localhost:3000
```

### 1.3. Khởi động Frontend

```bash
cd e:\TOT_NGHIEP\smart-badminton-booking\frontend
npm run dev
```

Truy cập: http://localhost:5173

---

## 🧪 Bước 2: Test Đặt Lịch Cố Định (Frontend)

### 2.1. Đăng nhập

1. Truy cập: http://localhost:5173/login
2. Đăng nhập với tài khoản customer:
   - Email: `customer@test.com`
   - Password: `password`

### 2.2. Nạp tiền vào Ví

Trước khi đặt lịch, đảm bảo ví có đủ tiền:

1. Vào **Dashboard** → **Wallet**
2. Click **Nạp tiền**
3. Nạp ít nhất **2,000,000đ** (đủ cho 16-20 buổi)

### 2.3. Đặt Lịch Cố Định

1. Vào trang **Booking** hoặc **Calendar**
2. Click tab **"Đặt cố định"** (thay vì "Đặt lẻ")
3. Điền thông tin:
   - **Sân**: Chọn Court 1
   - **Khoảng thời gian**: 01/01/2025 → 31/01/2025 (1 tháng)
   - **Các ngày trong tuần**: Chọn **Thứ 2, Thứ 4, Thứ 6**
   - **Giờ**: 18:00 → 20:00
4. Click **"Kiểm tra khả dụng"**

### 2.4. Xác nhận Kết quả

Hệ thống sẽ hiển thị:

```
✅ Tìm thấy 13 buổi khả dụng
📅 Lịch: T2, T4, T6 (18:00 - 20:00)
💰 Giá gốc: 1,300,000đ
🎁 Giảm giá 10%: -130,000đ
💳 Tổng tiền: 1,170,000đ
```

5. Click **"Xác nhận đặt lịch"**
6. Nhập mật khẩu để xác nhận thanh toán
7. Đợi hệ thống tạo booking (khoảng 2-3 giây)

### 2.5. Kiểm tra Email

1. Mở email của bạn (email đăng ký tài khoản)
2. Tìm email với tiêu đề: **"🎉 Xác nhận đặt 13 buổi cầu lông tại Court 1"**
3. Kiểm tra nội dung email:
   - ✅ Có tên khách hàng
   - ✅ Có thông tin sân, lịch, giờ
   - ✅ Có bảng giá (giá gốc, giảm giá, tổng tiền)
   - ✅ Có bảng liệt kê toàn bộ 13 buổi với mã booking
   - ✅ Có nút "Xem lịch đặt" link đến dashboard

---

## 👨‍💼 Bước 3: Test Admin Dashboard

### 3.1. Đăng nhập Admin

1. Đăng xuất tài khoản customer
2. Đăng nhập với tài khoản admin:
   - Email: `admin@test.com`
   - Password: `password`

### 3.2. Xem Danh sách Booking

1. Vào **Admin Dashboard** → **Bookings**
2. Tìm booking vừa tạo (tìm theo tên khách hàng)
3. Kiểm tra:
   - ✅ Bên cạnh tên khách có **badge màu tím** "Lịch tháng"
   - ✅ Badge hiển thị số buổi (ví dụ: "13")

### 3.3. Xem Chi tiết Nhóm

1. Click vào **badge màu tím** hoặc nút **"Xem nhóm"**
2. Modal sẽ hiển thị:

   **Thống kê:**
   ```
   ┌─────────────────────────────────────┐
   │ Tổng buổi: 13  │ Sắp tới: 13        │
   │ Đã hoàn thành: 0 │ Đã hủy: 0         │
   └─────────────────────────────────────┘
   ```

   **Chi tiết:**
   - Khách hàng: Nguyễn Văn A (customer@test.com)
   - Sân: Court 1
   - Lịch: T2, T4, T6 (18:00 - 20:00)
   - Giá gốc: 1,300,000đ
   - Giảm giá: 10% (-130,000đ)
   - Tổng tiền: 1,170,000đ

   **Bảng danh sách:**
   | # | Mã booking | Ngày       | Giờ         | Giá      | Trạng thái |
   |---|-----------|-----------|-------------|---------|-----------|
   | 1 | BK270125-XX | 02/01/2025 | 18:00-20:00 | 100,000đ | CONFIRMED |
   | 2 | BK270125-YY | 06/01/2025 | 18:00-20:00 | 100,000đ | CONFIRMED |
   | ... | ... | ... | ... | ... | ... |

### 3.4. Hủy Cả Chuỗi

1. Kéo xuống phần **"Hủy cả chuỗi"**
2. Điền:
   - **Lý do hủy**: "Khách yêu cầu hủy hợp đồng"
   - ✅ **Hoàn tiền vào ví** (checked)
   - ☐ **Chỉ hủy buổi tương lai** (unchecked)
3. Click **"Hủy cả chuỗi"**
4. Xác nhận trong popup:
   ```
   Bạn có chắc muốn hủy nhóm này?
   - 13 booking sẽ bị hủy
   - Hoàn 1,170,000đ vào ví
   ```
5. Click **"Xác nhận"**

### 3.5. Kiểm tra Kết quả

1. Modal sẽ đóng lại
2. Refresh trang Bookings
3. Tất cả 13 booking sẽ có status **CANCELLED**
4. Kiểm tra ví của khách:
   - Vào **Users** → Tìm customer
   - Xem wallet balance → Đã được hoàn tiền

---

## 🔬 Bước 4: Test API trực tiếp (Optional)

### 4.1. Test API Tạo Lịch Cố Định

```bash
# Lấy JWT token sau khi login
TOKEN="your-jwt-token-here"

# Gọi API
curl -X POST http://localhost:3000/bookings/fixed \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "courtId": 1,
    "startDate": "2025-02-01",
    "endDate": "2025-02-28",
    "daysOfWeek": [1, 3, 5],
    "startTime": "18:00",
    "endTime": "20:00"
  }'
```

**Kết quả mong đợi:**

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
    "status": "CONFIRMED"
  },
  "bookings": [ /* 12 bookings */ ],
  "wallet": {
    "newBalance": 920000
  },
  "summary": {
    "totalSessions": 12,
    "courtName": "Court 1",
    "schedule": "Mon, Wed, Fri 18:00-20:00",
    "period": "2025-02-01 to 2025-02-28",
    "discount": "10% off (saved 120000 VND)"
  }
}
```

### 4.2. Test API Lấy Chi tiết Nhóm

```bash
curl -X GET http://localhost:3000/bookings/groups/1 \
  -H "Authorization: Bearer $TOKEN"
```

### 4.3. Test API Hủy Nhóm

```bash
curl -X POST http://localhost:3000/bookings/groups/1/cancel \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Khách hủy hợp đồng",
    "refundToWallet": true,
    "cancelOnlyFuture": false
  }'
```

---

## ✅ Checklist Kiểm tra

### Backend
- [ ] Server khởi động thành công (port 3000)
- [ ] SMTP đã cấu hình đúng trong .env
- [ ] Email gửi thành công (kiểm tra console log)
- [ ] Prisma client đã generate (có BookingGroup model)

### Booking Creation
- [ ] Form "Đặt cố định" hiển thị đầy đủ các field
- [ ] Chọn được nhiều ngày trong tuần
- [ ] Tính toán đúng số buổi (ví dụ: T2, T4, T6 trong 1 tháng = ~13 buổi)
- [ ] Hiển thị đúng giá gốc và giảm giá:
  - 5-8 buổi → 5% discount
  - >8 buổi → 10% discount
- [ ] Check conflict (báo lỗi nếu có 1 buổi bị trùng)
- [ ] Trừ tiền ví đúng số tiền sau giảm giá
- [ ] Tạo đúng số lượng bookings
- [ ] Tất cả bookings có status CONFIRMED

### Email Notification
- [ ] Email gửi đến đúng địa chỉ khách hàng
- [ ] Subject email chính xác (có số buổi và tên sân)
- [ ] Email có header đẹp (gradient background)
- [ ] Hiển thị đúng thông tin khách hàng
- [ ] Bảng pricing hiển thị đầy đủ (gốc, giảm, tổng)
- [ ] Bảng lịch liệt kê đủ các buổi với:
  - Ngày (DD/MM/YYYY)
  - Thứ (Thứ 2, Thứ 3, ...)
  - Giờ (HH:mm - HH:mm)
  - Mã booking
- [ ] Có nút "Xem lịch đặt" link đến dashboard
- [ ] Email responsive (hiển thị tốt trên mobile)

### Admin Dashboard
- [ ] Badge "Lịch tháng" hiển thị màu tím
- [ ] Badge có icon calendar
- [ ] Badge hiển thị số buổi đúng
- [ ] Tooltip hiển thị thông tin nhóm khi hover
- [ ] Click badge mở modal

### Booking Group Modal
- [ ] Modal hiển thị 4 thống kê (tổng, sắp tới, hoàn thành, đã hủy)
- [ ] Hiển thị đầy đủ thông tin khách hàng (tên, email, phone)
- [ ] Hiển thị đúng thông tin lịch (sân, ngày, giờ)
- [ ] Hiển thị đúng pricing với badge giảm giá
- [ ] Bảng danh sách có đủ các cột
- [ ] Bảng scrollable (nếu >10 buổi)
- [ ] Status tags có màu sắc đúng
- [ ] Form hủy có 3 tùy chọn:
  - Lý do (textarea)
  - Hoàn tiền (checkbox)
  - Chỉ hủy tương lai (checkbox)
- [ ] Popconfirm hiển thị thông tin hủy
- [ ] Sau khi hủy, modal refresh dữ liệu

### Cancel Group Function
- [ ] Hủy tất cả bookings trong nhóm
- [ ] Cập nhật status nhóm thành CANCELLED
- [ ] Hoàn tiền vào ví (nếu chọn)
- [ ] Tạo wallet transaction record
- [ ] Hiển thị thông báo thành công
- [ ] Nếu chọn "chỉ hủy tương lai", chỉ hủy bookings sau hôm nay

---

## 🐛 Troubleshooting

### Lỗi: "Cannot send email"

**Nguyên nhân**: SMTP chưa cấu hình đúng

**Giải pháp**:
1. Kiểm tra `.env` có đầy đủ SMTP_HOST, SMTP_USER, SMTP_PASS
2. Với Gmail, đảm bảo đã bật 2FA và tạo App Password
3. Kiểm tra console log backend xem lỗi cụ thể

### Lỗi: "Property 'bookingGroup' does not exist"

**Nguyên nhân**: Prisma client chưa được generate lại

**Giải pháp**:
```bash
npx prisma generate
# Hoặc
npx prisma migrate dev
```

### Lỗi: "Cannot find module 'dayjs'"

**Nguyên nhân**: Package dayjs chưa được cài

**Giải pháp**:
```bash
npm install dayjs
```

### Badge không hiển thị

**Nguyên nhân**: Component chưa được import

**Giải pháp**:
1. Kiểm tra `AdminBookingsTable.tsx` đã import BookingGroupBadge
2. Kiểm tra booking có `bookingGroupId !== null`

### Email không nhận được

**Kiểm tra**:
1. Spam folder
2. Console log backend (có thông báo "📧 Confirmation email sent")
3. Email address đúng trong user profile
4. SMTP credentials đúng

---

## 📊 Test Cases Đầy Đủ

### Test Case 1: Đặt lịch thành công với giảm giá 5%

**Input**:
- Court: 1
- Period: 01/01/2025 - 31/01/2025
- Days: Thứ 7, Chủ nhật (2 ngày/tuần)
- Time: 08:00 - 10:00
- Expected sessions: ~8 buổi

**Expected**:
- ✅ Tạo 8 bookings
- ✅ Giảm giá 5%
- ✅ Email với 8 buổi
- ✅ Badge "8" trên admin

### Test Case 2: Đặt lịch thành công với giảm giá 10%

**Input**:
- Court: 1
- Period: 01/02/2025 - 28/02/2025
- Days: T2, T4, T6 (3 ngày/tuần)
- Time: 18:00 - 20:00
- Expected sessions: ~12 buổi

**Expected**:
- ✅ Tạo 12 bookings
- ✅ Giảm giá 10%
- ✅ Email với 12 buổi
- ✅ Tất cả có status CONFIRMED

### Test Case 3: Conflict detection

**Input**:
- Đã có booking: Court 1, 05/01/2025, 18:00-20:00
- Đặt lịch cố định: Court 1, 01-31/01, Thứ 6, 18:00-20:00

**Expected**:
- ❌ Báo lỗi conflict
- ❌ Không tạo booking nào
- ❌ Không trừ tiền

### Test Case 4: Hủy cả nhóm với hoàn tiền

**Input**:
- Booking group có 10 buổi
- Tổng tiền: 900,000đ
- Chọn: Hoàn tiền = true

**Expected**:
- ✅ 10 bookings → CANCELLED
- ✅ Wallet +900,000đ
- ✅ Wallet transaction record created

### Test Case 5: Hủy chỉ buổi tương lai

**Input**:
- Booking group có 15 buổi
- 5 buổi đã qua, 10 buổi sắp tới
- Chọn: cancelOnlyFuture = true

**Expected**:
- ✅ 10 bookings tương lai → CANCELLED
- ✅ 5 bookings quá khứ → giữ nguyên
- ✅ Hoàn tiền cho 10 buổi

---

**Chúc bạn test thành công! 🎉**

Nếu có lỗi, vui lòng check console log backend và báo cáo chi tiết.
