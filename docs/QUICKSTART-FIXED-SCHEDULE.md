# ⚡ QUICK START - Fixed Schedule Booking

## 🎯 Đã hoàn thành 100%

Tính năng **Đặt Lịch Cố Định** đã sẵn sàng để test!

---

## 🚀 3 Bước Để Bắt Đầu Test

### Bước 1: Cấu hình Email (2 phút)

Mở file `.env` và thay đổi:

```env
SMTP_USER=your-email@gmail.com       # ← Email của bạn
SMTP_PASS=xxxx xxxx xxxx xxxx        # ← App Password (16 ký tự)
```

**Lấy Gmail App Password:**
1. Vào: https://myaccount.google.com/apppasswords
2. Tạo mật khẩu ứng dụng cho "Mail"
3. Copy 16 ký tự vào `SMTP_PASS`

### Bước 2: Khởi động Server (1 phút)

```bash
# Terminal 1: Backend
npm run start:dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

### Bước 3: Test (5 phút)

1. **Login customer**: http://localhost:5173/login
   - Email: `customer@test.com`
   - Pass: `password`

2. **Nạp tiền**: Dashboard → Wallet → Nạp 2,000,000đ

3. **Đặt lịch cố định**:
   - Tab "Đặt cố định"
   - Chọn: T2, T4, T6 | 18:00-20:00 | 1 tháng
   - Click "Kiểm tra khả dụng"
   - Xác nhận

4. **Kiểm tra email** → Nhận 1 email với bảng đầy đủ ✅

5. **Login admin** → Xem badge màu tím "Lịch tháng" ✅

---

## 📖 Tài liệu đầy đủ

- **Test chi tiết**: [TEST-FIXED-SCHEDULE-GUIDE.md](./TEST-FIXED-SCHEDULE-GUIDE.md)
- **Tổng kết**: [COMPLETED-FIXED-SCHEDULE.md](./COMPLETED-FIXED-SCHEDULE.md)
- **Implementation**: [FIXED-SCHEDULE-ADMIN-EMAIL-GUIDE.md](./FIXED-SCHEDULE-ADMIN-EMAIL-GUIDE.md)

---

## ✅ Tính năng

- ✅ Đặt lịch cố định với giảm giá tự động (5% / 10%)
- ✅ Email gộp 1 lần (không 20 email riêng)
- ✅ Badge màu tím trên Admin Dashboard
- ✅ Modal xem chi tiết + hủy cả chuỗi
- ✅ Hoàn tiền tự động vào ví

---

**Bắt đầu test ngay!** 🚀
