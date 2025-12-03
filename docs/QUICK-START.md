# 🚀 Quick Start: Booking Timeout với BullMQ

## ⚡ Cài đặt nhanh (5 phút)

### Bước 1: Cài Redis (Docker - khuyên dùng)

```bash
# Pull và chạy Redis
docker run -d -p 6379:6379 --name redis redis:alpine

# Kiểm tra Redis đã chạy chưa
docker ps | findstr redis
```

**Hoặc Windows native (không khuyên dùng):**
- Download Redis từ [https://github.com/microsoftarchive/redis/releases](https://github.com/microsoftarchive/redis/releases)
- Chạy `redis-server.exe`

### Bước 2: Tạo file .env

```bash
# Copy file .env.example
copy .env.example .env
```

**Nội dung file `.env`:**
```env
DATABASE_URL="postgresql://postgres:123456@localhost:5432/badminton_booking?schema=public"
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"

# Redis cho BullMQ
REDIS_HOST="localhost"
REDIS_PORT=6379

PORT=3000
```

### Bước 3: Chạy migration

```bash
npx prisma migrate dev
```

### Bước 4: Seed database (tạo Court mẫu)

```bash
npx prisma db seed
```

Hoặc tạo Court thủ công trong Prisma Studio:
```bash
npx prisma studio
```

### Bước 5: Chạy app

```bash
npm run start:dev
```

## 🧪 Test ngay

### 1. Tạo booking PENDING_PAYMENT

**Cách 1: REST API (Postman/Thunder Client)**

```http
POST http://localhost:3000/auth/register
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "123456",
  "name": "Test User"
}
```

Lưu lại `access_token`, sau đó:

```http
POST http://localhost:3000/bookings
Content-Type: application/json
Authorization: Bearer <your_access_token>

{
  "courtId": 1,
  "startTime": "2024-12-04T10:00:00Z",
  "endTime": "2024-12-04T11:00:00Z",
  "paymentMethod": "VNPAY"
}
```

**Cách 2: Script test tự động**

```bash
npx ts-node test/manual-booking-timeout.test.ts
```

### 2. Kiểm tra logs

Bạn sẽ thấy log:

```
⏰ Scheduled expiration job for booking #1 in 900s
```

### 3. Đợi 15 phút

Sau 15 phút, kiểm tra log:

```
[BookingTimeoutProcessor] Processing expiration for booking #1
[BookingTimeoutProcessor] ✅ Successfully expired booking #1 (BK241203-0001)
```

### 4. Kiểm tra database

```bash
npx prisma studio
```

Hoặc query trực tiếp:

```sql
SELECT id, booking_code, status, payment_status, expires_at
FROM "Booking"
WHERE status = 'EXPIRED';
```

## 🔍 Monitoring

### Xem jobs trong Redis Queue

```bash
# Kết nối Redis CLI
redis-cli

# Xem tất cả keys
KEYS bull:booking-timeout:*

# Xem jobs đang chờ
LRANGE bull:booking-timeout:wait 0 -1

# Xem jobs đang xử lý
LRANGE bull:booking-timeout:active 0 -1
```

### Optional: Cài Bull Board (Web UI)

```bash
npm install @bull-board/api @bull-board/nestjs @bull-board/express
```

Sau đó truy cập: `http://localhost:3000/admin/queues`

## 🎯 Test cases

### ✅ Test 1: Booking hết hạn
1. Tạo booking với `paymentMethod: "VNPAY"`
2. Không thanh toán
3. Đợi 15 phút
4. **Kết quả:** `status = EXPIRED`

### ✅ Test 2: Booking đã thanh toán (không hết hạn)
1. Tạo booking với `paymentMethod: "VNPAY"`
2. Thanh toán ngay (giả sử có API `/payments/:id/confirm`)
3. Đợi 15 phút
4. **Kết quả:** `status = CONFIRMED` (không đổi)

### ✅ Test 3: Booking CASH (không hết hạn)
1. Tạo booking với `paymentMethod: "CASH"`
2. **Kết quả:** `status = CONFIRMED` ngay lập tức, không có job timeout

### ✅ Test 4: Guest booking (không hết hạn)
1. Staff tạo booking với `guestName` và `guestPhone`
2. **Kết quả:** `status = CONFIRMED` ngay lập tức

## 🐛 Troubleshooting

### Lỗi: Redis connection refused

```bash
# Kiểm tra Redis đang chạy
docker ps | findstr redis

# Nếu không chạy, start lại
docker start redis
```

### Lỗi: Court not found

```bash
# Tạo Court trong Prisma Studio
npx prisma studio

# Hoặc seed database
npx prisma db seed
```

### Jobs không chạy sau 15 phút

```bash
# Kiểm tra logs app có lỗi không
npm run start:dev

# Xóa tất cả jobs cũ (cẩn thận!)
redis-cli FLUSHALL

# Restart app
```

## 📚 Tài liệu chi tiết

- [BOOKING-TIMEOUT-GUIDE.md](./BOOKING-TIMEOUT-GUIDE.md) - Hướng dẫn đầy đủ
- [BOOKING-TIMEOUT-CHECKLIST.md](./BOOKING-TIMEOUT-CHECKLIST.md) - Checklist kiểm tra

## ✨ Tóm tắt

```
┌─────────────────────────────────────────┐
│ Booking PENDING_PAYMENT được tạo        │
└────────────────┬────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────┐
│ Job được thêm vào Queue (delay 15 phút) │
└────────────────┬────────────────────────┘
                 │
                 ↓ (Sau 15 phút)
┌─────────────────────────────────────────┐
│ BookingTimeoutProcessor xử lý           │
└────────────────┬────────────────────────┘
                 │
                 ├─→ Đã thanh toán? → SKIP
                 │
                 └─→ Chưa thanh toán? → EXPIRED
```

**Chúc bạn code vui! 🚀**
