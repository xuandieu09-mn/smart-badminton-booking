# ✅ Booking Timeout Implementation Checklist

## 📦 Dependencies
- [x] `@nestjs/bull` installed
- [x] `bull` installed
- [x] `@types/bull` installed (devDependencies)

## 🏗️ Core Files
- [x] `src/modules/queue/constants/queue.constants.ts` - Queue names & job names
- [x] `src/modules/queue/queue.module.ts` - Redis configuration
- [x] `src/modules/bookings/processors/booking-timeout.processor.ts` - Job processor
- [x] `src/modules/bookings/bookings.module.ts` - Register queue & processor
- [x] `src/modules/bookings/bookings.service.ts` - Add jobs to queue

## 🔧 Configuration
- [ ] `.env` file created with Redis config
- [ ] `REDIS_HOST` set correctly
- [ ] `REDIS_PORT` set correctly

## 🧪 Testing Files
- [x] `src/modules/bookings/processors/booking-timeout.processor.spec.ts` - Unit tests
- [x] `test/manual-booking-timeout.test.ts` - Manual test script
- [x] `docs/BOOKING-TIMEOUT-GUIDE.md` - Complete documentation

## 🚀 Runtime Requirements
- [ ] PostgreSQL running
- [ ] Redis running
- [ ] Database migrated (`npx prisma migrate dev`)
- [ ] At least 1 Court exists in database

## ✅ Verification Steps

### 1. Install Redis
```bash
# Windows (Docker)
docker run -d -p 6379:6379 --name redis redis:alpine

# Mac/Linux
brew install redis
redis-server
```

### 2. Check Redis Connection
```bash
redis-cli ping
# Expected: PONG
```

### 3. Run Application
```bash
npm run start:dev
```

### 4. Create Test Booking
```bash
POST http://localhost:3000/bookings
Authorization: Bearer <your-token>
Content-Type: application/json

{
  "courtId": 1,
  "startTime": "2024-12-04T10:00:00Z",
  "endTime": "2024-12-04T11:00:00Z",
  "paymentMethod": "VNPAY"
}
```

### 5. Check Logs
Look for:
```
⏰ Scheduled expiration job for booking #1 in 900s
```

### 6. Wait 15 Minutes
After 15 minutes, check logs for:
```
[BookingTimeoutProcessor] Processing expiration for booking #1
[BookingTimeoutProcessor] ✅ Successfully expired booking #1 (BK241203-0001)
```

### 7. Verify Database
```sql
SELECT id, booking_code, status, payment_status 
FROM "Booking" 
WHERE id = 1;
```

Expected:
```
id | booking_code   | status  | payment_status
---+----------------+---------+---------------
1  | BK241203-0001  | EXPIRED | UNPAID
```

## 🐛 Common Issues

### Issue: "Cannot connect to Redis"
**Solution:**
```bash
# Check if Redis is running
redis-cli ping

# Start Redis
docker start redis
# or
redis-server
```

### Issue: "Queue not found"
**Solution:**
- Verify `QUEUE_NAMES.BOOKING_TIMEOUT` is registered in `BookingsModule`
- Restart the application

### Issue: "Job not executing after 15 minutes"
**Solution:**
```bash
# Check Redis keys
redis-cli
KEYS bull:booking-timeout:*

# Check app logs
npm run start:dev
```

### Issue: "Duplicate queue registration"
**Solution:**
- Remove queue registration from `QueueModule`
- Keep only in `BookingsModule`

## 📝 Next Steps

- [ ] Add Bull Board for queue monitoring
- [ ] Implement notification when booking expires
- [ ] Add retry logic for failed jobs
- [ ] Create integration tests
- [ ] Deploy to staging/production
- [ ] Monitor job execution metrics

## 🎯 Success Criteria

✅ Booking with `PENDING_PAYMENT` created successfully  
✅ Job scheduled with correct delay (15 min)  
✅ After 15 min, booking status changes to `EXPIRED`  
✅ Job removed from queue after completion  
✅ No errors in logs  
✅ Paid bookings are NOT expired  
✅ Confirmed bookings are NOT expired  

---

**Date Completed:** __________  
**Tested By:** __________  
**Environment:** [ ] Development [ ] Staging [ ] Production
