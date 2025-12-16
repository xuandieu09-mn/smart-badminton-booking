# 🕒 Cron Jobs - Auto Booking Completion

## Overview
Hệ thống sử dụng `@nestjs/schedule` để chạy các tác vụ tự động định kỳ.

## Job: Auto-Complete Bookings

**Tên:** `handleBookingCompletion`  
**Tần suất:** Mỗi 5 phút  
**Module:** `CronModule` → `CronService`

### Logic
1. Tìm tất cả bookings có:
   - `status === 'CHECKED_IN'` (khách đã check-in, đang chơi)
   - `endTime < new Date()` (thời gian kết thúc đã qua)

2. Cập nhật status của các bookings đó thành `COMPLETED`

3. Ghi log số lượng bookings đã hoàn thành

### Code Implementation

**File:** `src/modules/cron/cron.service.ts`
```typescript
@Cron(CronExpression.EVERY_5_MINUTES, {
  name: 'handleBookingCompletion',
})
async handleBookingCompletion() {
  const now = new Date();

  // Find CHECKED_IN bookings that have ended
  const expiredBookings = await this.prisma.booking.findMany({
    where: {
      status: BookingStatus.CHECKED_IN,
      endTime: { lt: now },
    },
  });

  if (expiredBookings.length === 0) return;

  // Update to COMPLETED
  await this.prisma.booking.updateMany({
    where: {
      id: { in: expiredBookings.map((b) => b.id) },
    },
    data: {
      status: BookingStatus.COMPLETED,
    },
  });

  this.logger.log(
    `✅ Đã hoàn thành tự động ${expiredBookings.length} bookings`
  );
}
```

### Log Output Examples

**Khi không có booking nào cần hoàn thành:**
```
[CronService] Không có booking nào cần hoàn thành (DEBUG)
```

**Khi có bookings được hoàn thành:**
```
[CronService] ✅ Đã hoàn thành tự động 3 bookings: BK241216-ABC1, BK241216-DEF2, BK241216-GHI3
```

**Khi có lỗi:**
```
[CronService] ❌ Lỗi khi tự động hoàn thành bookings: <error message>
```

### Booking Status Flow

```
PENDING_PAYMENT (Chờ thanh toán)
    ↓
CONFIRMED (Đã thanh toán)
    ↓
CHECKED_IN (Đã check-in, đang chơi) ← Cron job tìm bookings ở trạng thái này
    ↓
COMPLETED (Hoàn thành) ← Cron job tự động chuyển sang trạng thái này
```

### Configuration

**Tần suất chạy:** Có thể thay đổi bằng các CronExpression constants:
- `CronExpression.EVERY_5_MINUTES` - Mỗi 5 phút (hiện tại)
- `CronExpression.EVERY_10_MINUTES` - Mỗi 10 phút
- `CronExpression.EVERY_HOUR` - Mỗi giờ
- `CronExpression.EVERY_30_SECONDS` - Mỗi 30 giây (testing)

**Custom cron expression:**
```typescript
@Cron('*/2 * * * *') // Mỗi 2 phút
```

### Testing

**1. Manual trigger (for development):**
```typescript
// Add this method to CronService
async manualTrigger() {
  await this.handleBookingCompletion();
}
```

**2. Create test booking:**
```sql
-- Create a CHECKED_IN booking that has already ended
INSERT INTO "Booking" (
  "bookingCode", "courtId", "userId", 
  "startTime", "endTime", 
  "totalPrice", "status", "paymentStatus", 
  "createdBy", "checkedInAt"
) VALUES (
  'BK241216-TEST', 1, 1,
  NOW() - INTERVAL '2 hours',  -- Started 2 hours ago
  NOW() - INTERVAL '1 hour',   -- Ended 1 hour ago
  100000, 'CHECKED_IN', 'PAID',
  'CUSTOMER', NOW() - INTERVAL '2 hours'
);
```

**3. Wait for next cron run (max 5 minutes) or restart backend:**
```bash
npm run start:dev
```

**4. Check logs for confirmation:**
```
[CronService] ✅ Đã hoàn thành tự động 1 bookings: BK241216-TEST
```

### Integration with Frontend

Frontend Staff Dashboard sẽ tự động refresh mỗi 30 giây, nên sẽ thấy:
- Bookings có status `CHECKED_IN` + `endTime < now` → Badge "🎾 Đang chơi"
- Sau khi cron chạy → Badge "✅ Hoàn thành"

### Monitoring

**Check if cron is registered:**
```bash
# Logs khi app start
[InstanceLoader] CronModule dependencies initialized
[InstanceLoader] ScheduleModule dependencies initialized
```

**Production recommendations:**
- Monitor logs để tracking số lượng bookings được auto-complete
- Set up alerts nếu có nhiều bookings failed
- Consider running more frequently (e.g., every 2-3 minutes) nếu cần realtime hơn

### Future Enhancements

1. **Email notification:** Gửi email cảm ơn sau khi booking completed
2. **Rating request:** Tự động gửi request đánh giá dịch vụ
3. **Statistics update:** Cập nhật thống kê revenue, usage rates
4. **Auto-archiving:** Chuyển bookings cũ sang bảng archive sau 30 ngày

---

**Created:** December 16, 2025  
**Author:** Backend Developer  
**Module:** CronModule  
**Dependencies:** @nestjs/schedule, PrismaService
