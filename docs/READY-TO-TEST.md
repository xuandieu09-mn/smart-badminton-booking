# ✅ SẴN SÀNG TEST - Hướng dẫn nhanh

## 🎯 Đã hoàn thành 100%

✅ **Email**: Đã cấu hình (yunodarknight0000@gmail.com)  
✅ **UI Customer**: Có menu "Đặt lịch cố định" → `/fixed-booking`  
✅ **UI Admin**: Badge màu tím + Modal chi tiết  
✅ **Backend**: API hoàn chỉnh với email service  

---

## 🚀 Test ngay (5 phút)

### Bước 1: Khởi động (1 phút)

```bash
# Terminal 1: Backend
npm run start:dev

# Terminal 2: Frontend  
cd frontend
npm run dev
```

Đợi đến khi thấy:
- Backend: `Application is running on: http://localhost:3000`
- Frontend: `Local: http://localhost:5173`

---

### Bước 2: Test Đặt Lịch Cố Định (3 phút)

#### 2.1. Login Customer
1. Mở: http://localhost:5173
2. Login:
   - Email: `customer@test.com`
   - Password: `password`

#### 2.2. Nạp Tiền
1. Click **"Ví tiền"** trên menu
2. Click **"Nạp tiền"**
3. Nhập: **2,000,000đ**
4. Xác nhận

#### 2.3. Đặt Lịch Cố Định
1. Click **"Đặt lịch cố định"** trên menu (menu mới bên cạnh "Đặt sân")
2. Điền form:
   ```
   Sân: Court 1
   Từ ngày: 01/01/2025
   Đến ngày: 31/01/2025
   Các ngày: [x] Thứ 2  [x] Thứ 4  [x] Thứ 6
   Giờ: 18:00 - 20:00
   ```
3. Click **"Kiểm tra khả dụng"**
4. Xem kết quả:
   ```
   ✅ Tìm thấy 13 buổi
   💰 Giá gốc: 1,300,000đ
   🎁 Giảm giá 10%: -130,000đ
   💳 Tổng: 1,170,000đ
   ```
5. Click **"Xác nhận đặt lịch"**
6. Nhập password xác nhận

#### 2.4. Kiểm tra Email (QUAN TRỌNG!)
1. Mở email: **yunodarknight0000@gmail.com**
2. Tìm email mới nhất (tiêu đề: "🎉 Xác nhận đặt 13 buổi...")
3. Kiểm tra:
   - ✅ Có tên khách hàng
   - ✅ Có bảng giá (gốc, giảm, tổng)
   - ✅ Có bảng 13 buổi với mã booking

**📧 Email sẽ được gửi TỰ ĐỘNG sau khi đặt thành công!**

---

### Bước 3: Test Admin Dashboard (2 phút)

#### 3.1. Login Admin
1. Logout customer
2. Login admin:
   - Email: `admin@test.com`
   - Password: `password`

#### 3.2. Xem Badge "Lịch tháng"
1. Vào **Admin** → **Bookings**
2. Tìm booking vừa tạo (tên customer)
3. Kiểm tra:
   - ✅ Có **badge màu tím** bên cạnh tên
   - ✅ Badge hiển thị số: **"13"**
   - ✅ Icon calendar: **📆**

#### 3.3. Mở Modal Chi Tiết
1. Click vào **badge màu tím**
2. Modal hiển thị:
   ```
   ┌─────────────────────────────────┐
   │ Chi tiết lịch cố định #1        │
   ├─────────────────────────────────┤
   │ [Tổng: 13] [Sắp tới: 13]       │
   │                                 │
   │ Khách: customer@test.com        │
   │ Sân: Court 1                    │
   │ Lịch: T2, T4, T6 (18:00-20:00)  │
   │                                 │
   │ ┌────────────────────────────┐  │
   │ │ # │ Ngày │ Giờ │ Trạng thái│ │
   │ └────────────────────────────┘  │
   │                                 │
   │ [Hủy cả chuỗi]                  │
   └─────────────────────────────────┘
   ```

#### 3.4. Test Hủy Cả Chuỗi (Optional)
1. Kéo xuống phần **"Hủy cả chuỗi"**
2. Điền:
   - Lý do: "Test hủy"
   - ✅ Hoàn tiền vào ví
3. Click **"Hủy cả chuỗi"**
4. Xác nhận popup
5. Kiểm tra: 13 bookings → CANCELLED

---

## ✅ Checklist Kết Quả

### Customer UI
- [ ] Menu có mục **"Đặt lịch cố định"** (📆)
- [ ] Form hiển thị đầy đủ các trường
- [ ] Chọn được nhiều ngày trong tuần
- [ ] Tính đúng giảm giá (10% cho 13 buổi)
- [ ] Tạo thành công 13 bookings

### Email
- [ ] Nhận được email tự động
- [ ] Email có subject chứa "13 buổi"
- [ ] Email có bảng pricing đầy đủ
- [ ] Email có bảng 13 buổi với mã booking
- [ ] Email có nút "Xem lịch đặt"

### Admin UI
- [ ] Badge màu tím hiển thị bên cạnh tên customer
- [ ] Badge hiển thị số "13"
- [ ] Click badge mở modal
- [ ] Modal hiển thị 4 thống kê
- [ ] Modal có bảng 13 buổi
- [ ] Modal có form "Hủy cả chuỗi"
- [ ] Hủy thành công → 13 bookings CANCELLED

---

## 🐛 Nếu gặp lỗi

### Email không nhận được
1. Check backend console → Tìm "📧 Confirmation email sent"
2. Check spam folder
3. Verify SMTP config trong `.env`

### Badge không hiển thí
1. F12 → Console → Xem lỗi
2. Check network tab → API `/api/bookings` có trả `bookingGroupId`?

### Modal không mở
1. Check console error
2. Verify `selectedGroupId` state

---

## 📊 Kết quả mong đợi

**Backend Console:**
```
✅ Fixed schedule booking created: Group #1 with 13 bookings
📧 Confirmation email sent to customer@test.com for booking group #1
```

**Email nhận được:**
```
🎉 Xác nhận đặt 13 buổi cầu lông tại Court 1

Giá gốc: 1,300,000đ
Giảm giá 10%: -130,000đ
Tổng tiền: 1,170,000đ

[Bảng 13 buổi]
```

**Admin Dashboard:**
```
Customer Name [Lịch tháng 🟣 13]
```

---

## 🎉 Thành công!

Nếu tất cả checklist ✅ → **HOÀN THÀNH 100%!**

Có lỗi gì báo lại tôi nhé! 🚀
