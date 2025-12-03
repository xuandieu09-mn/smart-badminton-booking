# 📚 Hướng dẫn BullMQ Booking Timeout

## 🎯 Tổng quan

Hệ thống tự động hủy booking sau 15 phút nếu người dùng chưa thanh toán.

## 🏗️ Kiến trúc

```
BookingsService (tạo booking)
    ↓
    └─→ Thêm job vào Queue (delay 15 phút)
            ↓
            └─→ BookingTimeoutProcessor
                    ↓
                    └─→ Cập nhật status = EXPIRED
```

## 📦 Các thành phần

### 1. **BookingTimeoutProcessor** (`src/modules/bookings/processors/booking-timeout.processor.ts`)

```typescript
@Processor(QUEUE_NAMES.BOOKING_TIMEOUT)
export class BookingTimeoutProcessor {
  @Process(JOB_NAMES.EXPIRE_BOOKING)
  async handleBookingExpiration(job: Job<ExpireBookingJobData>) {
    // Xử lý logic hết hạn
  }
}
```

**Chức năng:**
- Nhận job từ queue sau 15 phút
- Kiểm tra booking còn PENDING_PAYMENT không
- Cập nhật status thành EXPIRED nếu chưa thanh toán

**Xử lý edge cases:**
- ✅ Booking không tồn tại (đã bị xóa)
- ✅ Booking đã được thanh toán
- ✅ Booking đã bị hủy
- ✅ Retry nếu có lỗi database

### 2. **BookingsModule** (`src/modules/bookings/bookings.module.ts`)

```typescript
@Module({
  imports: [
    BullModule.registerQueue({
      name: QUEUE_NAMES.BOOKING_TIMEOUT,
    }),
  ],
  providers: [BookingsService, BookingTimeoutProcessor],
  controllers: [BookingsController],
})
export class BookingsModule {}
```

**Lưu ý:**
- Queue chỉ được đăng ký **1 lần** trong BookingsModule
- Không đăng ký lại trong QueueModule (chỉ cấu hình Redis connection)

### 3. **BookingsService** (`src/modules/bookings/bookings.service.ts`)

```typescript
// Tạo booking với PENDING_PAYMENT
const booking = await this.prisma.booking.create({
  data: {
    status: BookingStatus.PENDING_PAYMENT,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 phút
  },
});

// Thêm job vào queue
await this.bookingQueue.add(
  JOB_NAMES.EXPIRE_BOOKING,
  { bookingId: booking.id },
  {
    delay: 15 * 60 * 1000, // 15 phút
    jobId: `expire-booking-${booking.id}`, // Unique job ID
    removeOnComplete: true,
    removeOnFail: false,
  },
);
```

### 4. **QueueModule** (`src/modules/queue/queue.module.ts`)

```typescript
@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
        },
        defaultJobOptions: {
          removeOnComplete: true,
          removeOnFail: false,
          attempts: 3, // Retry 3 lần nếu fail
        },
      }),
    }),
  ],
})
export class QueueModule {}
```

## 🚀 Cài đặt và chạy

### 1. Cài đặt dependencies

```bash
npm install @nestjs/bull bull @types/bull
```

### 2. Cài đặt Redis

**Windows (sử dụng Docker):**
```bash
docker run -d -p 6379:6379 --name redis redis:alpine
```

**Mac/Linux:**
```bash
brew install redis
redis-server
```

### 3. Cấu hình môi trường

Copy file `.env.example` thành `.env`:

```bash
copy .env.example .env
```

Sửa file `.env`:

```env
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 4. Chạy ứng dụng

```bash
npm run start:dev
```

## 🧪 Test chức năng

### Test 1: Tạo booking PENDING_PAYMENT

```bash
POST http://localhost:3000/bookings
Content-Type: application/json
Authorization: Bearer <your-jwt-token>

{
  "courtId": 1,
  "startTime": "2024-12-04T10:00:00Z",
  "endTime": "2024-12-04T11:00:00Z",
  "paymentMethod": "VNPAY"
}
```

**Expected response:**
```json
{
  "message": "Booking created successfully",
  "booking": {
    "id": 1,
    "bookingCode": "BK241203-0001",
    "status": "PENDING_PAYMENT",
    "expiresAt": "2024-12-03T10:15:00Z"
  }
}
```

**Kiểm tra log:**
```
⏰ Scheduled expiration job for booking #1 in 900s
```

### Test 2: Đợi 15 phút và kiểm tra

Sau 15 phút, kiểm tra log:

```
[BookingTimeoutProcessor] Processing expiration for booking #1
[BookingTimeoutProcessor] ✅ Successfully expired booking #1 (BK241203-0001)
```

Kiểm tra database:

```sql
SELECT id, booking_code, status, payment_status, expires_at
FROM "Booking"
WHERE id = 1;
```

**Expected result:**
```
id | booking_code   | status  | payment_status | expires_at
---+----------------+---------+----------------+-------------------
1  | BK241203-0001  | EXPIRED | UNPAID         | 2024-12-03 10:15:00
```

### Test 3: Booking đã thanh toán (không bị hủy)

```bash
# 1. Tạo booking PENDING_PAYMENT
POST http://localhost:3000/bookings
{
  "courtId": 1,
  "startTime": "2024-12-04T10:00:00Z",
  "endTime": "2024-12-04T11:00:00Z",
  "paymentMethod": "VNPAY"
}

# 2. Thanh toán ngay (giả sử có endpoint /payments/:id/confirm)
POST http://localhost:3000/payments/1/confirm
{
  "transactionId": "VNP123456"
}

# 3. Đợi 15 phút → Job vẫn chạy nhưng SKIP vì đã CONFIRMED
```

**Expected log sau 15 phút:**
```
[BookingTimeoutProcessor] Booking #1 (BK241203-0001) already CONFIRMED - skipping expiration
```

### Test 4: Test với thời gian ngắn (development)

Để test nhanh, tạm thời sửa delay thành 30 giây:

```typescript
// src/modules/bookings/bookings.service.ts

// ❌ Production
const delay = 15 * 60 * 1000; // 15 phút

// ✅ Development testing
const delay = 30 * 1000; // 30 giây
```

## 📊 Monitoring Queue

### Kiểm tra jobs trong queue

Cài Bull Board (optional):

```bash
npm install @bull-board/api @bull-board/nestjs
```

Thêm vào `app.module.ts`:

```typescript
import { BullBoardModule } from '@bull-board/nestjs';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';

@Module({
  imports: [
    BullBoardModule.forRoot({
      route: '/admin/queues',
      adapter: ExpressAdapter,
    }),
    BullBoardModule.forFeature({
      name: QUEUE_NAMES.BOOKING_TIMEOUT,
      adapter: BullAdapter,
    }),
  ],
})
export class AppModule {}
```

Truy cập: `http://localhost:3000/admin/queues`

### Kiểm tra Redis trực tiếp

```bash
# Kết nối Redis CLI
redis-cli

# Xem tất cả keys
KEYS *

# Xem jobs trong queue
LRANGE bull:booking-timeout:wait 0 -1
```

## 🐛 Troubleshooting

### Lỗi: Cannot connect to Redis

**Nguyên nhân:** Redis chưa chạy

**Giải pháp:**
```bash
# Windows (Docker)
docker start redis

# Mac/Linux
redis-server
```

### Lỗi: Job không chạy sau 15 phút

**Nguyên nhân:** 
- Redis connection bị lỗi
- Processor không được đăng ký
- Job bị stuck

**Giải pháp:**
```bash
# Kiểm tra Redis
redis-cli ping

# Restart app
npm run start:dev

# Xóa tất cả jobs cũ (cẩn thận!)
redis-cli FLUSHALL
```

### Lỗi: Duplicate queue registration

**Nguyên nhân:** Queue được đăng ký 2 lần (trong QueueModule và BookingsModule)

**Giải pháp:** Chỉ đăng ký queue trong BookingsModule, QueueModule chỉ config Redis.

## 📝 Best Practices

### 1. **Job ID duy nhất**
```typescript
jobId: `expire-booking-${booking.id}` // Prevent duplicate jobs
```

### 2. **Retry policy**
```typescript
defaultJobOptions: {
  attempts: 3, // Retry 3 lần
  backoff: {
    type: 'exponential',
    delay: 2000, // 2s, 4s, 8s
  },
}
```

### 3. **Cleanup completed jobs**
```typescript
removeOnComplete: true, // Xóa job sau khi hoàn thành
removeOnFail: false,    // Giữ lại job bị lỗi để debug
```

### 4. **Logging đầy đủ**
```typescript
this.logger.log(`✅ Success: ...`);
this.logger.warn(`⚠️ Warning: ...`);
this.logger.error(`❌ Error: ...`, error.stack);
```

### 5. **Transaction safety**
```typescript
// Sử dụng transaction khi update nhiều bảng
await this.prisma.$transaction(async (tx) => {
  await tx.booking.update({...});
  await tx.wallet.update({...});
});
```

## 🎯 Kết luận

Hệ thống BullMQ Booking Timeout đã được triển khai với:

✅ Auto-expire booking sau 15 phút  
✅ Xử lý edge cases (thanh toán, hủy, xóa)  
✅ Retry mechanism (3 lần)  
✅ Logging đầy đủ  
✅ Clean code structure  

**Next steps:**
1. Test đầy đủ các scenarios
2. Thêm monitoring dashboard (Bull Board)
3. Implement webhook/notification khi booking expired
4. Add unit tests cho processor
