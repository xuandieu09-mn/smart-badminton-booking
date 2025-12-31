# Fixed Schedule Booking Feature - Implementation Summary

## 📋 Overview
Implemented complete Fixed Schedule Booking system allowing users to book recurring slots (e.g., every Monday and Wednesday at 18:00-20:00 for 2 months) with automatic tiered discounts and wallet payment integration.

## 🎯 Features Implemented

### 1. Database Schema
**BookingGroup Model** (with discount support):
- `id`: Auto-increment primary key
- `userId`, `courtId`: Foreign keys
- `startDate`, `endDate`: Booking period
- `startTime`, `endTime`: Time slots (HH:mm format)
- `daysOfWeek`: Int[] array (0=Sunday to 6=Saturday)
- **Pricing fields with discount:**
  - `totalSessions`: Number of bookings
  - `originalPrice`: Total before discount
  - `discountRate`: Discount percentage (0.05 = 5%)
  - `finalPrice`: Price after discount
  - `totalPrice`: Legacy field (same as finalPrice)
  - `totalPaid`: Amount paid so far
- `status`: BookingGroupStatus (PENDING_PAYMENT, CONFIRMED, CANCELLED)
- `paymentStatus`, `paymentMethod`: Payment tracking
- `isActive`: Can deactivate to cancel all future bookings

**BookingGroupStatus Enum:**
```prisma
enum BookingGroupStatus {
  PENDING_PAYMENT
  CONFIRMED
  CANCELLED
}
```

### 2. API Endpoint
**POST /bookings/fixed**

**Request DTO (CreateFixedBookingDto):**
```typescript
{
  courtId: number;        // Court ID
  startDate: string;      // "2025-12-30" (ISO date)
  endDate: string;        // "2026-01-13"
  daysOfWeek: number[];   // [1, 3] = Monday, Wednesday
  startTime: string;      // "18:00"
  endTime: string;        // "20:00"
}
```

**Response:**
```json
{
  "message": "Fixed schedule booking created successfully! 🎉",
  "bookingGroup": {
    "id": 1,
    "totalSessions": 4,
    "originalPrice": 800000,
    "discountRate": 0,
    "discountAmount": 0,
    "finalPrice": 800000,
    "status": "CONFIRMED"
  },
  "bookings": [
    {
      "id": 123,
      "bookingCode": "BK251230-ABCD",
      "date": "2025-12-30",
      "startTime": "2025-12-30T18:00:00Z",
      "endTime": "2025-12-30T20:00:00Z",
      "price": 200000,
      "status": "CONFIRMED"
    }
  ],
  "wallet": {
    "newBalance": 4200000
  },
  "summary": {
    "totalSessions": 4,
    "courtName": "Court 1",
    "schedule": "Mon, Wed 18:00-20:00",
    "period": "2025-12-30 to 2026-01-13",
    "discount": "No discount"
  }
}
```

### 3. Discount Logic
**Automatic tiered discounts:**
- **>4 sessions**: 5% off
- **>8 sessions**: 10% off

Example:
- 6 sessions × 200,000 VND = 1,200,000 VND
- 5% discount = -60,000 VND
- **Final price: 1,140,000 VND** ✅

### 4. Business Logic (bookings.service.ts)

**Key steps in `createFixedScheduleBooking()`:**

1. **Validate Input**: Check daysOfWeek, date range, time format
2. **Validate Court**: Ensure court exists and is active
3. **Calculate Booking Dates**: 
   - Loop through date range
   - Filter by daysOfWeek (e.g., only Mondays and Wednesdays)
   - Generate list of all booking dates
4. **Check Availability** (CRITICAL):
   - For EVERY calculated date, check for conflicts
   - If ANY date has a conflict, **fail the entire operation**
   - Return detailed conflict information
5. **Calculate Pricing with Discount**:
   - Calculate original price for all sessions
   - Apply discount rate based on total sessions
   - Calculate final price
6. **Check Wallet Balance**:
   - Verify user has sufficient funds
   - Throw error if insufficient
7. **Atomic Transaction**:
   - Create BookingGroup record
   - Create all individual Booking records
   - Deduct from wallet
   - Create wallet transaction record
   - **All or nothing** - rollback on any failure
8. **Real-time Updates**:
   - Broadcast new bookings via WebSocket

### 5. Wallet Integration

**Payment Flow:**
```typescript
// Check balance
if (wallet.balance < finalPrice) {
  throw new BadRequestException('Insufficient wallet balance');
}

// Deduct in transaction
await tx.wallet.update({
  where: { userId },
  data: { balance: { decrement: finalPrice } }
});

// Record transaction
await tx.walletTransaction.create({
  data: {
    walletId: wallet.id,
    type: 'PAYMENT',
    amount: finalPrice,
    balanceBefore,
    balanceAfter,
    description: `Fixed schedule booking: ${totalSessions} sessions (${discountRate}% discount)`
  }
});
```

### 6. Controller Implementation

```typescript
@Post('fixed')
async createFixedScheduleBooking(
  @Body() dto: CreateFixedBookingDto,
  @CurrentUser() user: JwtUser,
) {
  return this.bookingsService.createFixedScheduleBooking(dto, user.id);
}
```

**Guards Applied:**
- `@UseGuards(JwtAuthGuard)` - Requires authentication
- Extracts userId from JWT token

## 🧪 Testing

### Test Script: test-fixed-booking.ps1

**Test Scenario:**
- Login as customer1@test.com
- Check wallet balance
- Book Court 1:
  - Period: 2025-12-30 to 2026-01-13 (2 weeks)
  - Days: Monday (1) and Wednesday (3)
  - Time: 18:00-20:00
  - Expected: 4 bookings (2 Mondays + 2 Wednesdays)

**Run Test:**
```powershell
.\test-fixed-booking.ps1
```

### Manual Testing with curl

```bash
# 1. Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "customer1@test.com", "password": "password123"}'

# 2. Create fixed booking (with token)
curl -X POST http://localhost:3000/bookings/fixed \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "courtId": 1,
    "startDate": "2025-12-30",
    "endDate": "2026-01-13",
    "daysOfWeek": [1, 3],
    "startTime": "18:00",
    "endTime": "20:00"
  }'
```

## 📊 Example Use Cases

### Case 1: Weekly Training (4 sessions)
- Period: 1 week
- Days: Monday, Wednesday
- Result: 2 bookings, **no discount** (≤4 sessions)

### Case 2: Monthly Training (8+ sessions)
- Period: 1 month
- Days: Tuesday, Thursday
- Result: 8-9 bookings, **5% discount** (>4 sessions)

### Case 3: Long-term Contract (16+ sessions)
- Period: 2 months
- Days: Monday, Wednesday, Friday
- Result: 24-26 bookings, **10% discount** (>8 sessions)

## 🔒 Security & Validation

**Validations:**
- ✅ JWT authentication required
- ✅ Court must exist and be active
- ✅ Date range validation (endDate > startDate)
- ✅ No past bookings allowed
- ✅ daysOfWeek must be 0-6
- ✅ Time format must be HH:MM
- ✅ Availability checked for ALL dates
- ✅ Wallet balance verified before payment
- ✅ Atomic transaction (all or nothing)

**Error Handling:**
- Insufficient wallet balance
- Booking conflicts on any date
- Invalid court ID
- Past booking attempts
- Invalid time format

## 🚀 Deployment Checklist

- [x] Database schema updated (BookingGroup + BookingGroupStatus)
- [x] Prisma migration applied
- [x] DTO created with validation
- [x] Service logic implemented with discount
- [x] Controller endpoint created
- [x] Wallet payment integrated
- [x] Test script created
- [ ] Frontend integration (pending)
- [ ] Add to chatbot function calling (pending)

## 📝 Next Steps

1. **Frontend Integration**:
   - Update RecurringCalendar.tsx to use new API
   - Display discount preview in booking form
   - Show wallet balance warning

2. **Chatbot Integration**:
   - Add `create_recurring_booking` function to AI tools
   - Example: "Đặt cho tôi sân 1 mỗi thứ 2 và thứ 4 lúc 18h trong 2 tháng"

3. **Additional Features**:
   - Allow cancellation of individual bookings in a group
   - Support partial payment (deposit + remaining)
   - Add email notification for recurring bookings
   - Implement group booking modification

## 🎓 Technical Highlights

**Architecture:**
- Clean separation: DTO → Controller → Service → Prisma
- Atomic transactions for data consistency
- Discount calculation in business logic layer
- Real-time updates via WebSocket

**Best Practices:**
- TypeScript type safety
- Validation decorators (class-validator)
- Error handling with NestJS exceptions
- Database constraints and indexes
- Decimal precision for financial calculations

## 📚 Files Modified

1. `prisma/schema.prisma` - Added BookingGroup model + enum
2. `src/modules/bookings/dto/create-fixed-booking.dto.ts` - Created DTO
3. `src/modules/bookings/bookings.controller.ts` - Added endpoint
4. `src/modules/bookings/bookings.service.ts` - Implemented logic
5. `test-fixed-booking.ps1` - Test script

---

**Status**: ✅ **COMPLETE - Ready for Testing**

**Discount Formula**: 
```
finalPrice = originalPrice × (1 - discountRate)
where discountRate = {
  0.10 if totalSessions > 8
  0.05 if totalSessions > 4
  0.00 otherwise
}
```
