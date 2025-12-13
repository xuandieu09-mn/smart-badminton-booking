# 🧪 Hướng dẫn Test QR Check-in System

## Vấn đề
Làm sao test chức năng quét QR khi chưa có QR code thực tế từ hệ thống thanh toán?

## Giải pháp
Tạo tab "Tạo QR Code" để generate và test QR code từ booking có sẵn trong database.

---

## 📝 Các bước test

### Bước 1: Chuẩn bị dữ liệu test

Đảm bảo trong database có booking với status `CONFIRMED`:

```sql
-- Kiểm tra booking trong database
SELECT id, bookingCode, status, startTime, endTime 
FROM Booking 
WHERE status = 'CONFIRMED'
ORDER BY createdAt DESC
LIMIT 5;
```

**Hoặc tạo booking mới qua API:**

```bash
# Login as customer
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "customer1@test.com", "password": "password123"}'

# Create booking (lưu token từ response trên)
curl -X POST http://localhost:3000/api/bookings \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "courtId": 1,
    "startTime": "2025-12-14T10:00:00.000Z",
    "endTime": "2025-12-14T11:00:00.000Z",
    "type": "ONLINE",
    "paymentMethod": "WALLET"
  }'
```

---

### Bước 2: Generate QR Code

1. **Truy cập:** http://localhost:5174
2. **Login as Staff:** `staff@badminton.com` / `Staff@123`
3. **Navigate to:** `/staff/checkin`
4. **Chọn tab:** "🎫 Tạo QR Code" (tab đầu tiên)
5. **Click:** "📋 Tải danh sách booking"
6. **Chọn một booking** từ danh sách (click vào card)
7. **QR Code sẽ hiển thị** bên phải

---

### Bước 3: Test QR Scanner

#### Cách 1: Quét QR bằng camera (Khuyến nghị)

1. **Download QR code:** Click "💾 Tải xuống QR Code"
2. **Hiển thị QR trên màn hình khác:**
   - Mở file QR vừa tải trên điện thoại
   - Hoặc mở trên màn hình thứ 2
3. **Chuyển sang tab:** "📱 Quét QR"
4. **Click:** "🎥 Bật camera"
5. **Cho phép quyền camera** khi trình duyệt hỏi
6. **Đưa QR code vào khung camera**
7. **Kết quả:** Tự động check-in và hiển thị thông báo

#### Cách 2: Nhập mã thủ công

1. **Copy booking code:** Từ tab "Tạo QR Code", click "📋 Copy mã booking"
2. **Chuyển sang tab:** "📱 Quét QR"
3. **Paste vào ô nhập:** VD: `BOOK-20251213-A1B2`
4. **Click:** "✓ Check-in"
5. **Kết quả:** Check-in và hiển thị thông báo

---

### Bước 4: Kiểm tra kết quả

#### Kiểm tra UI:
- ✅ Thông báo "Check-in thành công!" màu xanh
- ✅ Hiển thị thông tin booking đã check-in
- ✅ Booking code, sân, thời gian

#### Kiểm tra Database:
```sql
-- Kiểm tra status đã đổi thành CHECKED_IN
SELECT bookingCode, status, startTime, endTime 
FROM Booking 
WHERE bookingCode = 'BOOK-20251213-XXXX';
```

#### Kiểm tra Court Monitor:
1. **Chuyển sang tab:** "🏟️ Theo dõi sân"
2. **Xem real-time status:**
   - Sân vừa check-in → màu đỏ (OCCUPIED)
   - Current booking hiển thị thông tin
   - Next booking (nếu có)

---

## 🎯 Test Scenarios

### Scenario 1: Happy Path ✅
- **Input:** Booking code CONFIRMED, trong thời gian check-in hợp lệ
- **Expected:** Check-in thành công, status → CHECKED_IN

### Scenario 2: Too Early ⏰
- **Input:** Booking code > 15 phút trước giờ bắt đầu
- **Expected:** Error "Too early to check in"

### Scenario 3: Expired ⏱️
- **Input:** Booking code đã quá giờ kết thúc
- **Expected:** Error "Booking time has expired"

### Scenario 4: Wrong Status ❌
- **Input:** Booking code có status CANCELLED/PENDING_PAYMENT
- **Expected:** Error "Booking cannot be checked in"

### Scenario 5: Invalid Code 🚫
- **Input:** Mã không đúng format (VD: "ABC123")
- **Expected:** Error "Invalid booking code format"

### Scenario 6: Not Found 🔍
- **Input:** Booking code không tồn tại
- **Expected:** Error "Booking not found"

---

## 🐛 Troubleshooting

### Camera không hoạt động:
```javascript
// Check browser camera permissions
navigator.mediaDevices.getUserMedia({ video: true })
  .then(() => console.log('Camera OK'))
  .catch(err => console.error('Camera error:', err));
```

**Solutions:**
1. Cấp quyền camera cho trình duyệt
2. Sử dụng HTTPS hoặc localhost
3. Thử trình duyệt khác (Chrome khuyến nghị)
4. Kiểm tra camera không bị app khác sử dụng

### QR không quét được:
1. **Tăng độ sáng màn hình** hiển thị QR
2. **Giữ khoảng cách 15-30cm** từ camera
3. **Đảm bảo QR code rõ nét** không bị mờ
4. **Thử download và in QR** trên giấy

### API Error:
```bash
# Check backend running
curl http://localhost:3000/api

# Check authentication
curl http://localhost:3000/api/bookings \
  -H "Authorization: Bearer <token>"
```

---

## 📱 Demo Video Script

### Script test nhanh (2 phút):

1. **[0:00]** Login staff → `/staff/checkin`
2. **[0:10]** Tab "Tạo QR Code" → "Tải danh sách"
3. **[0:15]** Chọn booking → QR hiển thị
4. **[0:20]** Download QR code
5. **[0:25]** Mở QR trên điện thoại
6. **[0:30]** Tab "Quét QR" → Bật camera
7. **[0:35]** Quét QR → Success!
8. **[0:40]** Tab "Theo dõi sân" → Xem status

---

## 🔗 Related APIs

### Generate QR Code (Alternative):
```bash
curl -X POST http://localhost:3000/api/bookings/1/generate-qr \
  -H "Authorization: Bearer <token>"
```

Response:
```json
{
  "qrCode": "data:image/png;base64,iVBORw0KGgo...",
  "bookingCode": "BOOK-20251213-A1B2"
}
```

### Check-in API:
```bash
curl -X POST http://localhost:3000/api/bookings/check-in \
  -H "Authorization: Bearer <staff_token>" \
  -H "Content-Type: application/json" \
  -d '{"bookingCode": "BOOK-20251213-A1B2"}'
```

---

## ✅ Checklist Test Completion

- [ ] Generate QR code từ booking CONFIRMED
- [ ] Download QR code thành công
- [ ] Camera scanner hoạt động
- [ ] Quét QR thành công
- [ ] Check-in manual bằng booking code
- [ ] Kiểm tra error messages (too early, expired, invalid)
- [ ] Xem real-time court monitor
- [ ] Database status updated to CHECKED_IN

---

## 🎓 Notes

**Tại sao cần tab "Tạo QR Code"?**
- ✅ Test QR scanner mà không cần hệ thống thanh toán hoàn chỉnh
- ✅ Staff có thể tạo QR cho customer không có app
- ✅ Demo và training nhân viên
- ✅ Backup solution khi email QR bị lỗi

**Production deployment:**
- QR code sẽ được tự động generate sau khi thanh toán thành công
- Gửi qua email với template đẹp
- Customer có thể xem lại trong "My Bookings"
- Staff vẫn giữ tab này để support customer
