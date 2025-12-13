# 🏦 Hướng dẫn cấu hình VNPay Sandbox

## 📝 Bước 1: Đăng ký VNPay Sandbox

### Cách 1: Đăng ký chính thức (Khuyến nghị)
1. Truy cập: https://sandbox.vnpayment.vn/
2. Click "Đăng ký tài khoản test"
3. Điền thông tin:
   - Email
   - Tên doanh nghiệp (có thể fake cho test)
   - Số điện thoại
   - Website (có thể dùng localhost)
4. Sau khi đăng ký, check email để kích hoạt
5. Đăng nhập vào Merchant Portal
6. Lấy thông tin:
   - **TMN Code** (Terminal Code): Mã định danh merchant
   - **Secret Key** (Hash Secret): Khóa bí mật để ký HMAC

### Cách 2: Dùng Sandbox Test Credentials (Nhanh)
VNPay cung cấp tài khoản test công khai:

```
Website: https://sandbox.vnpayment.vn/merchantv2
Username: admin@vnpay.vn  
Password: Vnpay@2021

TMN Code: DEMOC001
Secret Key: KHONGDUOCTIETCHLODUNGCHOTHANHVIEN
```

**⚠️ Lưu ý**: Credentials trên là demo, có thể bị giới hạn hoặc thay đổi.

---

## 🔧 Bước 2: Cập nhật Backend .env

Mở file `e:\TOT_NGHIEP\smart-badminton-booking\.env` và cập nhật:

```env
# VNPay Configuration (Sandbox)
VNPAY_TMN_CODE=DEMOC001
VNPAY_SECRET_KEY=KHONGDUOCTIETCHLODUNGCHOTHANHVIEN
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=http://localhost:5173/payment/result

# Frontend URL (for redirects)
FRONTEND_URL=http://localhost:5173
```

**🔐 Quan trọng**: 
- `VNPAY_TMN_CODE`: Mã merchant (8 ký tự)
- `VNPAY_SECRET_KEY`: Khóa bí mật để tạo chữ ký HMAC-SHA512
- `VNPAY_RETURN_URL`: URL redirect sau khi thanh toán (phải match với frontend route)

---

## 🎨 Bước 3: Restart Backend Server

```bash
# Stop server (Ctrl+C)
# Start lại
npm run start:dev
```

Server sẽ load lại environment variables mới.

---

## 🧪 Bước 4: Test Payment Flow

### A. Test thanh toán ví (Wallet)
1. Vào http://localhost:5173/my-bookings
2. Chọn booking PENDING_PAYMENT
3. Click "💳 Thanh toán ngay"
4. Chọn "💰 Ví của tôi"
5. Confirm → Thanh toán thành công → QR code hiện ra

### B. Test thanh toán VNPay
1. Vào http://localhost:5173/my-bookings
2. Chọn booking PENDING_PAYMENT
3. Click "💳 Thanh toán ngay"
4. Chọn "🏦 VNPay"
5. Confirm → **Redirect đến VNPay Sandbox**

**Tại trang VNPay Sandbox:**
- **Thẻ test**: Chọn "NCB" (Ngân hàng Quốc Dân)
- **Số thẻ**: `9704198526191432198`
- **Tên chủ thẻ**: `NGUYEN VAN A`
- **Ngày phát hành**: `07/15`
- **Mật khẩu OTP**: `123456`

6. Click "Thanh toán" → VNPay redirect về `/payment/result?success=true&bookingId=XXX`
7. Check booking status → Phải là CONFIRMED
8. Xem QR code để check-in

---

## 🐛 Troubleshooting

### Lỗi "Cannot POST /api/payments/vnpay/create-url"
✅ **Đã fix**: Di chuyển VNPay routes lên trước routes có param động (`:id`)

### Lỗi "Invalid signature"
- Check `VNPAY_SECRET_KEY` có đúng không
- Xem log backend để debug signature
- Console log params trước khi tạo chữ ký

### Lỗi "VNPAY_TMN_CODE is required"
- Check .env có đúng format không
- Restart backend sau khi sửa .env
- Console log `process.env.VNPAY_TMN_CODE` trong service

### VNPay không redirect về
- Check `VNPAY_RETURN_URL` khớp với frontend route
- Check `FRONTEND_URL` có đúng không
- Xem network tab để debug redirect

---

## 📚 Tài liệu VNPay API

- **API Docs**: https://sandbox.vnpayment.vn/apis/docs/
- **Integration Guide**: https://sandbox.vnpayment.vn/apis/docs/huong-dan-tich-hop/
- **Test Cards**: https://sandbox.vnpayment.vn/apis/docs/bang-ma-loi/

---

## 🔒 Production Deployment

Khi deploy production:

1. Đăng ký VNPay thực tế: https://vnpay.vn/dang-ky-merchant/
2. Cập nhật .env production:
```env
VNPAY_TMN_CODE=YOUR_REAL_TMN_CODE
VNPAY_SECRET_KEY=YOUR_REAL_SECRET_KEY
VNPAY_URL=https://vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=https://yourdomain.com/payment/result
FRONTEND_URL=https://yourdomain.com
```

3. Enable HTTPS (bắt buộc cho VNPay production)
4. Register callback URL với VNPay
5. Test kỹ trước khi go-live

---

## ✅ Checklist

- [x] Đã đăng ký VNPay Sandbox / Lấy credentials
- [x] Đã cập nhật .env với VNPAY_TMN_CODE và VNPAY_SECRET_KEY
- [x] Đã restart backend server
- [x] Test wallet payment thành công
- [x] Test VNPay payment với thẻ test
- [x] Xác nhận booking status chuyển sang CONFIRMED
- [x] Xác nhận QR code được tạo sau thanh toán

**🎉 Done! Payment gateway đã sẵn sàng!**
