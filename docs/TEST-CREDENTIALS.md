# 🏸 Smart Badminton Booking System - Test Credentials

> 🎉 Hệ thống đang chạy với đầy đủ tài khoản test cho 3 role khác nhau

## 📋 Tài Khoản Đã Có Sẵn Trong Hệ Thống

### 🔐 Thông Tin Đăng Nhập

| Role | Email | Password | Chức Năng |
|------|-------|----------|----------|
| **👨‍💼 ADMIN** | `admin@badminton.com` | `Admin@123` | Quản lý toàn bộ hệ thống |
| **👨‍✈️ STAFF** | `staff@badminton.com` | `Staff@123` | Quản lý sân, đặt sân cho khách |
| **👤 CUSTOMER 1** | `customer1@test.com` | `password123` | Đặt sân, thanh toán |
| **👤 CUSTOMER 2** | `customer2@test.com` | `password123` | Đặt sân, thanh toán |
| **👤 CUSTOMER 3** | `customer3@test.com` | `password123` | Đặt sân, thanh toán |

---

## 💰 Ví Tiền (Wallet)

Mỗi khách hàng được cấp sẵn **500,000 VND** để test:
- **customer1@test.com**: 500,000 VND ✅
- **customer2@test.com**: 500,000 VND ✅
- **customer3@test.com**: 500,000 VND ✅

---

## 🏛️ Sân Đã Có Sẵn

Hệ thống được tạo sẵn **5 sân badminton**:

| Sân | Giá | Mô Tả |
|-----|-----|-------|
| Court 1 | 50,000 VND/h | Badminton Court 1 - Tiêu chuẩn cạnh tranh |
| Court 2 | 50,000 VND/h | Badminton Court 2 - Tiêu chuẩn cạnh tranh |
| Court 3 | 50,000 VND/h | Badminton Court 3 - Tiêu chuẩn cạnh tranh |
| Court 4 | 50,000 VND/h | Badminton Court 4 - Tiêu chuẩn cạnh tranh |
| Court 5 | 50,000 VND/h | Badminton Court 5 - Tiêu chuẩn cạnh tranh |

---

## 💵 Bảng Giá (Pricing Rules)

### Giờ Bình Thường (Normal Hours)
- **Thời gian:** 6:00 - 17:00 (Mỗi ngày)
- **Giá:** 50,000 VND/giờ

### Giờ Vàng (Golden Hours)
- **Thời gian:** 17:00 - 21:00 (Mỗi ngày)
- **Giá:** 75,000 VND/giờ

### Giờ Cao Điểm (Peak Hours)
- **Thời gian:** 19:00 - 21:00 (Thứ 6 - Chủ nhật)
- **Giá:** 100,000 VND/giờ

---

## 🌐 Truy Cập Hệ Thống

### Frontend
```
http://localhost:5173/
```

### Backend API
```
http://localhost:3000/api/
```

### Database (Prisma Studio)
```bash
npx prisma studio
```

---

## 🚀 Các Bước Test Tiếp Theo

### 1️⃣ **Test Đăng Ký & Đăng Nhập** ✅ (Hoàn tất)
```
✅ Đăng ký tài khoản mới
✅ Đăng nhập với tài khoản
✅ Xem profile
```

### 2️⃣ **Test Đặt Sân** (Làm tiếp)
```
□ Xem danh sách sân
□ Chọn sân + ngày/giờ
□ Tạo booking
□ Kiểm tra booking status
```

### 3️⃣ **Test Booking Timeout** ⏱️ (Đợi 15 phút)
```
□ Tạo booking PENDING_PAYMENT
□ Đợi 15 phút không thanh toán
□ Booking tự động → EXPIRED
```

### 4️⃣ **Test Thanh Toán**
```
□ Chuyển từ wallet để thanh toán
□ Kiểm tra wallet balance giảm
□ Kiểm tra booking → CONFIRMED
```

### 5️⃣ **Test Admin Dashboard**
```
□ Xem thống kê tổng quan
□ Xem danh sách bookings
□ Quản lý sân
□ Quản lý giá
```

---

## 🔧 Các Tính Năng Đã Implement

✅ **Backend:**
- Database schema với 6 bảng (User, Court, Booking, Wallet, WalletTransaction, Payment)
- Authentication (JWT + Passport)
- Role-based access control (RBAC)
- BullMQ queue với Redis (Booking timeout)
- Wallet system
- Booking management

✅ **Frontend:**
- Login/Register
- Dashboard
- Booking management (partial)
- Responsive design

---

## ⚠️ Tính Năng Cần Hoàn Thành

### 🚨 **CRITICAL (Làm ngay):**
1. **Implement Courts CRUD module**
   - GET /api/courts (danh sách sân)
   - GET /api/courts/:id
   - POST /api/courts (admin only)
   - Check availability

2. **Build Calendar/Timeline UI**
   - Xem sân theo ngày
   - Chọn giờ trống
   - Hiển thị giá động

3. **Implement Payments module**
   - Thanh toán bằng wallet
   - VNPay/MoMo integration
   - Payment history

### 🟠 **HIGH (Tuần này):**
4. Email notifications (Nodemailer)
5. Admin dashboard
6. Booking statistics
7. User management (Admin)
8. Court management (Staff)

### 🟡 **MEDIUM (Tuần sau):**
9. Integration tests
10. Performance optimization
11. Security hardening (Rate limiting, Helmet)
12. CI/CD pipeline

---

## 📊 Tiến Độ Dự Án (Day 10/21)

```
Progress: 52% ████████░░░░░░░░░░░░

✅ Hoàn thành (52%):
├── Database schema + migrations
├── Backend core modules
├── Authentication & RBAC
├── BullMQ timeout processor
├── All tests passing (10/10)
├── Frontend scaffolding
├── Full stack running locally

⚠️ Đang làm (0%):
├── Courts module
├── Calendar UI
├── Payments module

❌ Chưa làm (48%):
├── VNPay/MoMo integration
├── Email notifications
├── Admin dashboard
├── Integration tests
└── Deployment
```

---

## 🎯 Recommended Next Steps

### **Ngay Hôm Nay (Priority 1):**
```bash
# 1. Implement Courts CRUD
npm run generate:courts

# 2. Create Courts service & controller
# File: src/modules/courts/courts.service.ts
# File: src/modules/courts/courts.controller.ts

# 3. Add Courts endpoints
GET    /api/courts              - List all courts
GET    /api/courts/:id          - Get court detail
GET    /api/courts/available    - Check availability
POST   /api/courts              - Create (Admin)
PUT    /api/courts/:id          - Update (Admin)
DELETE /api/courts/:id          - Delete (Admin)
```

### **Ngày Mai (Priority 2):**
```bash
# 1. Build Calendar component
# File: frontend/src/features/calendar/Calendar.tsx

# 2. Implement Payments module
# File: src/modules/payments/payments.service.ts
# File: src/modules/payments/payments.controller.ts

# 3. Payment endpoints
POST   /api/payments/pay         - Pay with wallet
POST   /api/payments/vnpay       - VNPay gateway
POST   /api/payments/momo        - MoMo gateway
```

---

## 🛠️ Cách Chạy Lệnh

### Seed Database (Reset data)
```bash
npx prisma db seed
```

### Xem Database
```bash
npx prisma studio
```

### Chạy Tests
```bash
npm test
npm test -- --runInBand
```

### Logs Theo Dõi
```bash
# Terminal 1: Backend
npm run start:dev

# Terminal 2: Frontend
cd frontend && npm run dev

# Terminal 3: Redis (nếu cần monitor)
docker exec badminton_redis redis-cli monitor
```

---

## 📞 Hỗ Trợ

- **Database Issue?** → Check `docker exec badminton_db psql -U badminton_user -d badminton_booking`
- **Redis Issue?** → Check `docker exec badminton_redis redis-cli ping`
- **API Issue?** → Check backend logs & use Postman
- **Frontend Issue?** → Check browser console (F12)

---

**Last Updated:** December 5, 2025  
**System Status:** ✅ Full Stack Running  
**Test Coverage:** ✅ 10/10 Test Suites Passing
