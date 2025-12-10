# ✅ Bulk Booking Implementation Complete

## Overview
Successfully implemented **Bulk Booking feature** allowing users to book multiple courts and time slots in a **single atomic transaction**. If any booking fails, all are rolled back (all-or-nothing semantics).

## Architecture

### Backend (NestJS + Prisma)

#### 1. **New DTO: `CreateBulkBookingDto`**
- Location: `src/modules/bookings/dto/create-bulk-booking.dto.ts`
- Accepts array of bookings: `bookings: BulkBookingItemDto[]`
- Each item: `{ courtId, startTime, endTime }`
- Optional: `type`, `paymentMethod`, `guestName`, `guestPhone`
- Class validators: `@IsArray`, `@ValidateNested`, `@ArrayMinSize(1)`

#### 2. **Service Method: `createBulkBooking()`**
- Location: `src/modules/bookings/bookings.service.ts` (lines 437-604)
- **Pre-validation phase:**
  - Validate each booking's court existence, time validity, and no conflicts
  - Calculate total price for each booking
  - Throw error immediately if any item is invalid
- **Transaction phase:**
  - Use `prisma.$transaction()` to wrap all creates
  - If any error occurs, ALL creates rollback (atomic)
  - Create booking records with proper status:
    - Guest booking → `CONFIRMED` (PAID)
    - Maintenance → `BLOCKED` (PAID)
    - Cash payment → `CONFIRMED` (PAID)
    - Card payment → `PENDING_PAYMENT` (UNPAID, 15-min expiration via BullMQ)
  - Schedule expiration jobs for PENDING_PAYMENT bookings
- **Return:** `{ message, bookings[], totalPrice }`

#### 3. **Controller Endpoint: `POST /bookings/bulk`**
- Location: `src/modules/bookings/bookings.controller.ts` (lines 38-45)
- Calls: `bookingsService.createBulkBooking(dto, user.id, user.role)`
- Protected: `@UseGuards(JwtAuthGuard, RolesGuard)`
- Request body: `CreateBulkBookingDto`
- Returns: `{ message, bookings[], totalPrice }`

### Frontend (React + Vite)

#### 1. **New Hook: `useCreateBulkBooking`**
- Location: `frontend/src/features/calendar/hooks/useCreateBulkBooking.ts`
- Exports: `useCreateBulkBooking()` mutation hook
- Payload transformation:
  - Converts `Date` objects to ISO strings
  - Wraps in POST `/bookings/bulk` call
- Returns: React Query mutation with `mutate` + `isPending`
- Error handling: Via caller (Calendar component)

#### 2. **Updated: `Calendar.tsx`**
- Replaced single booking mutation with `useCreateBulkBooking`
- Updated `handleConfirmBooking()`:
  - Transform `selectedRange` → bulk payload `{ bookings: [{ courtId, startTime, endTime }] }`
  - Call `createBulkBooking(bulkPayload, { onSuccess, onError })`
  - Reset `selectedSlots` and `selectedCourtId` on success
- Removed unused imports: `useMutation`, `apiClient`
- Alert messages display booking codes and total bookings created

## Data Flow

```
User selects slots → Calendar.tsx state (selectedSlots[])
                  ↓
User clicks "Xác nhận đặt sân"
                  ↓
handleConfirmBooking() transforms selectedSlots → BulkBookingItemDto[]
                  ↓
useCreateBulkBooking().mutate(payload)
                  ↓
POST /bookings/bulk (with JWT auth)
                  ↓
Backend: bookingsService.createBulkBooking()
  ├─ Pre-validate all items (court, time, conflicts, price)
  ├─ prisma.$transaction()
  │  └─ Create all booking records atomically
  │  └─ Schedule expiration jobs (PENDING_PAYMENT → 15min)
  └─ Return { message, bookings[], totalPrice }
                  ↓
Frontend: onSuccess callback
  ├─ Show success alert with booking codes
  └─ Reset UI state (selectedSlots = [], selectedCourtId = null)
```

## Key Features

✅ **Atomic Transactions:** All-or-nothing semantics
✅ **Pre-validation:** Quick feedback before DB commit
✅ **Conflict Detection:** Prevents overbooking
✅ **Price Calculation:** Per-slot pricing with multipliers
✅ **Expiration Jobs:** BullMQ queue for 15-min PENDING_PAYMENT timeout
✅ **Backward Compatibility:** Old single `POST /bookings` still works
✅ **Error Handling:** Rollback on any validation failure
✅ **Real-time Updates:** Polling 10s catches other users' bookings

## Testing Checklist

**Backend (Postman/API Test):**
- [ ] POST /bookings/bulk with 1 booking → success, bookings[] returned
- [ ] POST /bookings/bulk with 2+ bookings (same court, contiguous) → all created
- [ ] POST /bookings/bulk with conflict booking → error, rollback verified
- [ ] POST /bookings/bulk with invalid court → error, rollback verified
- [ ] POST /bookings/bulk with PENDING_PAYMENT → expiration job scheduled
- [ ] POST /bookings (single, old endpoint) → still works (backward compat)

**Frontend:**
- [ ] Select multiple slots → "Đang chọn: X slots" summary displays
- [ ] Click "Xác nhận đặt sân" → POST /bookings/bulk sent
- [ ] Success: Alert shows "✅ X booking(s) created! Booking codes: ..."
- [ ] Error: Alert shows "❌ Error: <message>"
- [ ] UI resets: selectedSlots = [], selectedCourtId = null
- [ ] Polling 10s: New bookings appear, PENDING_PAYMENT → EXPIRED transitions visible

## Files Modified

**Backend:**
1. ✅ `src/modules/bookings/dto/create-bulk-booking.dto.ts` [NEW]
2. ✅ `src/modules/bookings/dto/index.ts` (added export)
3. ✅ `src/modules/bookings/bookings.service.ts` (added createBulkBooking method)
4. ✅ `src/modules/bookings/bookings.controller.ts` (added @Post('/bulk') endpoint, imported CreateBulkBookingDto)

**Frontend:**
1. ✅ `frontend/src/features/calendar/hooks/useCreateBulkBooking.ts` [NEW]
2. ✅ `frontend/src/features/calendar/Calendar.tsx` (updated mutation, handleConfirmBooking, imports)

## Next Steps (Optional Enhancements)

- [ ] **Multi-court booking UI:** Allow selecting slots across different courts
- [ ] **Total price preview:** Display sum of all selected slots before confirm
- [ ] **Batch payment:** Process payment for all bookings together
- [ ] **Booking confirmation email:** Send list of all created bookings
- [ ] **Undo/Retry:** Implement rollback and retry logic for failed bookings

## Deployment Notes

1. **Database:** No migration needed (uses existing Booking table)
2. **Environment:** Requires BullMQ queue for expiration jobs (already configured)
3. **Build:** Both backend (`npm run build`) and frontend (`npm run build`) compile successfully
4. **No breaking changes:** Old single booking endpoint still functional

---

**Status:** ✅ Ready for testing and deployment
