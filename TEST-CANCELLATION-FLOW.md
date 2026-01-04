# Hướng dẫn Test Chức năng Hủy Booking

## Chuẩn bị

### 1. Start Backend
```bash
npm run start:dev
```
Đợi xuất hiện: `Nest application successfully started on http://localhost:3000`

### 2. Start Frontend
```bash
cd frontend
npm run dev
```
Frontend chạy tại: http://localhost:5173

## Test Case 1: Hủy Booking Chưa Thanh Toán (PENDING_PAYMENT)

### Mục tiêu
- Booking chưa thanh toán phải hủy được ngay
- KHÔNG có notification gửi đi

### Các bước
1. Đăng nhập với tài khoản customer:
   - Email: `customer@badminton.com`
   - Password: `Customer@123`

2. Đặt booking mới:
   - Vào **"Đặt sân"**
   - Chọn ngày mai
   - Chọn giờ: 08:00 - 10:00
   - Click **"Đặt sân"**
   - **KHÔNG thanh toán** (để trạng thái PENDING_PAYMENT)

3. Vào **"Booking của tôi"**
   - Thấy booking với badge vàng "⏱️ Chờ thanh toán"

4. Click nút **"❌ Hủy booking"**
   - Thấy popup confirm đơn giản: "Bạn có chắc muốn hủy booking này?"
   - Click **OK**

5. Kiểm tra kết quả:
   - ✅ Thông báo "✅ Đã hủy booking!"
   - ✅ Booking biến mất khỏi danh sách (hoặc chuyển sang CANCELLED)
   - ✅ KHÔNG có modal điều khoản hoàn tiền xuất hiện
   - ✅ KHÔNG có notification/email gửi đi

### Kiểm tra Database
```sql
SELECT 
  id, "bookingCode", status, 
  "totalPrice", "paidAmount",
  "createdAt"
FROM "Booking"
WHERE status = 'CANCELLED'
  AND "paidAmount" = 0
ORDER BY "createdAt" DESC
LIMIT 1;
```

## Test Case 2: Hủy Booking Đã Thanh Toán - Hoàn 100% (>24h)

### Mục tiêu
- Booking đã thanh toán phải yêu cầu xác nhận
- Hiển thị modal điều khoản hoàn tiền
- Hoàn 100% nếu hủy >24h trước giờ đặt

### Các bước
1. Đăng nhập customer: `customer@badminton.com` / `Customer@123`

2. Đặt booking:
   - Chọn ngày **3 ngày sau** (>24h)
   - Chọn giờ: 10:00 - 12:00
   - Tổng giá: 200,000 VND
   - Click **"Đặt sân"**

3. Thanh toán booking:
   - Chọn **"Ví điện tử"**
   - Xác nhận thanh toán
   - Đợi trạng thái chuyển sang **"✅ Đã xác nhận"**

4. Hủy booking:
   - Vào **"Booking của tôi"**
   - Tìm booking vừa thanh toán
   - Click **"❌ Hủy booking"**

5. Kiểm tra modal xuất hiện:
   - ✅ Tiêu đề: **"⚠️ Xác nhận hủy booking"**
   - ✅ Hiển thị mã booking
   - ✅ Hiển thị thời gian đặt
   - ✅ Hiển thị số tiền đã thanh toán: **200,000 VND**
   - ✅ Bảng chính sách hoàn tiền với 3 mức
   - ✅ Dòng ">24 giờ" được **highlight màu xanh** với badge "Hiện tại"
   - ✅ Hiển thị: **"✅ Bạn sẽ được hoàn tiền"**
   - ✅ Tỷ lệ hoàn: **100%**
   - ✅ Số tiền hoàn: **200,000 VND**
   - ✅ Note: "💡 Tiền sẽ được hoàn vào ví điện tử..."

6. Click **"✅ Xác nhận hủy booking"**

7. Kiểm tra kết quả:
   - ✅ Thông báo "✅ Đã hủy booking!"
   - ✅ Booking chuyển sang CANCELLED
   - ✅ Vào **"Ví của tôi"** → Số dư tăng 200,000 VND
   - ✅ Lịch sử giao dịch có dòng REFUND: "Hoàn tiền 100%..."

### Kiểm tra Database
```sql
-- Booking bị hủy
SELECT * FROM "Booking" 
WHERE status = 'CANCELLED' 
  AND "paidAmount" > 0
ORDER BY "createdAt" DESC LIMIT 1;

-- Cancellation record
SELECT * FROM "Cancellation"
WHERE "bookingId" = <booking_id_above>;

-- Wallet transaction
SELECT * FROM "WalletTransaction"
WHERE type = 'REFUND'
  AND "bookingId" = <booking_id_above>;
```

## Test Case 3: Hủy Booking Đã Thanh Toán - Hoàn 50% (12-24h)

### Các bước
1. Đặt booking **ngày mai lúc 08:00** (khoảng 18-20h sau)
2. Thanh toán 300,000 VND
3. Hủy booking → Modal hiển thị:
   - ✅ Dòng "12-24 giờ" được highlight màu xanh
   - ✅ Tỷ lệ hoàn: **50%**
   - ✅ Số tiền hoàn: **150,000 VND**
4. Xác nhận hủy
5. Kiểm tra ví: Tăng **150,000 VND**

## Test Case 4: Hủy Booking Đã Thanh Toán - Không Hoàn (< 12h)

### Các bước
1. Đặt booking **trong vòng 6 giờ tới**
2. Thanh toán 250,000 VND
3. Hủy booking → Modal hiển thị:
   - ✅ Dòng "<12 giờ" được highlight **màu đỏ**
   - ✅ **"❌ Không được hoàn tiền"**
   - ✅ Tỷ lệ hoàn: **0%**
   - ✅ Hiển thị box màu vàng: **"⚠️ Trường hợp đặc biệt"**
   - ✅ Hướng dẫn liên hệ Admin:
     - 📧 Email: admin@smartcourt.vn
     - 📞 Hotline: 1900-xxxx
     - 💬 Chat với Admin
4. Xác nhận hủy
5. Kiểm tra ví: **KHÔNG thay đổi** (0 VND hoàn)

## Test Case 5: Từ Chối Hủy Booking

### Các bước
1. Đặt và thanh toán booking
2. Click "❌ Hủy booking"
3. Modal xuất hiện
4. Click **"🔙 Quay lại"**
5. Kiểm tra:
   - ✅ Modal đóng
   - ✅ Booking vẫn ở trạng thái CONFIRMED
   - ✅ Không có thay đổi gì

## Checklist Tổng Hợp

### UI/UX
- [ ] Booking PENDING_PAYMENT: Hiển thị confirm đơn giản
- [ ] Booking CONFIRMED: Hiển thị modal điều khoản đầy đủ
- [ ] Modal có thiết kế đẹp, dễ hiểu
- [ ] Highlight đúng mức hoàn tiền hiện tại
- [ ] Hiển thị số tiền chính xác
- [ ] Button "Xác nhận" màu đỏ nổi bật
- [ ] Button "Quay lại" để hủy bỏ

### Backend Logic
- [ ] PENDING_PAYMENT: Hủy ngay, không cần confirmCancellation
- [ ] CONFIRMED: Yêu cầu confirmCancellation = true
- [ ] Tính toán refund đúng theo thời gian:
  - [ ] >24h: 100%
  - [ ] 12-24h: 50%
  - [ ] <12h: 0%
- [ ] Hoàn tiền vào ví chính xác
- [ ] Tạo WalletTransaction REFUND
- [ ] PENDING_PAYMENT: KHÔNG gửi notification
- [ ] CONFIRMED: GỬI notification cho staff/admin

### Database
- [ ] Booking.status = CANCELLED
- [ ] Cancellation record được tạo
- [ ] Cancellation.refundAmount đúng
- [ ] Cancellation.refundMethod = WALLET (nếu có hoàn)
- [ ] WalletTransaction.type = REFUND
- [ ] Wallet.balance cập nhật đúng

## Lỗi Thường Gặp

### 1. Modal không hiển thị
**Nguyên nhân:** Import thiếu component
**Giải pháp:** Kiểm tra import CancellationConfirmModal

### 2. Lỗi "CONFIRMATION_REQUIRED"
**Nguyên nhân:** Gửi confirmCancellation = false cho booking CONFIRMED
**Giải pháp:** Đây là lỗi mong muốn - modal phải xuất hiện

### 3. Token 401 Unauthorized
**Nguyên nhân:** Backend không chạy hoặc token hết hạn
**Giải pháp:** Restart backend, đăng nhập lại

### 4. Refund amount sai
**Nguyên nhân:** Tính toán dựa trên totalPrice thay vì paidAmount
**Giải pháp:** Đã fix - dùng paidAmount

## Công Cụ Hỗ Trợ

### Debug Modal
Mở DevTools Console, gõ:
```javascript
// Kiểm tra state modal
console.log('Modal open:', document.querySelector('[role="dialog"]'));

// Kiểm tra booking data
console.log('Booking to cancel:', localStorage.getItem('bookingToCancel'));
```

### Debug API
Network Tab → Filter "cancel" → Xem request payload:
```json
{
  "confirmCancellation": true
}
```

### Debug Database
```sql
-- Xem tất cả booking đã hủy hôm nay
SELECT 
  b.id, b."bookingCode", b.status,
  b."totalPrice", b."paidAmount",
  c."refundAmount", c."refundMethod",
  c.reason
FROM "Booking" b
LEFT JOIN "Cancellation" c ON c."bookingId" = b.id
WHERE b.status = 'CANCELLED'
  AND b."createdAt" >= CURRENT_DATE
ORDER BY b."createdAt" DESC;
```

## Kết Luận

Sau khi test xong tất cả các case trên, hệ thống phải:
- ✅ Hủy booking chưa thanh toán: Đơn giản, không notification
- ✅ Hủy booking đã thanh toán: Yêu cầu xác nhận, hiển thị điều khoản
- ✅ Tính toán refund chính xác theo 3 mức
- ✅ Hoàn tiền đúng vào ví
- ✅ UX thân thiện, dễ hiểu
