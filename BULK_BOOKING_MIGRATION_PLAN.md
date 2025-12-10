# Bulk Booking Migration Plan - Detailed Analysis

**Created:** December 9, 2025  
**Scope:** Transform single-booking to bulk-booking system  
**Status:** Planning Phase

---

## 1. CURRENT IMPLEMENTATION ANALYSIS

### Backend Current State

#### 1.1 CreateBookingDto (Single Booking)
**File:** `src/modules/bookings/dto/create-booking.dto.ts` (Lines 1-34)

```
Current Structure:
├── courtId: number (single court)
├── startTime: string (ISO date string)
├── endTime: string (ISO date string)
├── type?: BookingType (REGULAR, MAINTENANCE, etc.)
├── paymentMethod?: PaymentMethod (CASH, ONLINE, WALLET)
├── guestName?: string (for STAFF guest bookings)
└── guestPhone?: string (for STAFF guest bookings)
```

**Validation:** Uses class-validator decorators (@IsInt, @IsDateString, @IsEnum, @IsOptional, @IsString)

#### 1.2 BookingsService.createBooking() (Single Booking Handler)
**File:** `src/modules/bookings/bookings.service.ts` (Lines 28-175)

**Current Logic Flow:**
1. **Time Validation** (Lines 45-50)
   - Check `start >= end` → throw BadRequestException
   - Check `start < now()` → throw BadRequestException

2. **Court Validation** (Lines 52-60)
   - Query court by courtId
   - Check court.isActive

3. **Double Booking Check** (Lines 62-76)
   - Find conflicts in ACTIVE bookings (exclude CANCELLED, EXPIRED)
   - Use time overlap logic: `startTime < end && endTime > start`

4. **Price Calculation** (Line 78)
   - Single call to `calculatePrice(courtId, start, end)`
   - Uses pricing rules by dayOfWeek, timeStr, priority

5. **Booking Code Generation** (Line 80)
   - Format: `BK${YYMMDD}-${sequence}`

6. **Status Determination** (Lines 82-97)
   - Guest booking → CONFIRMED, no userId
   - Maintenance booking → BLOCKED
   - CASH payment → CONFIRMED, PaymentStatus.PAID
   - Other → PENDING_PAYMENT + 15min expiry

7. **Database Transaction** (Lines 99-130)
   - Single `prisma.$transaction()` call
   - Creates one booking record with all metadata

8. **Queue Job** (Lines 132-149)
   - If PENDING_PAYMENT, add expire job to bullMQ queue
   - Delay = expiresAt - now()

#### 1.3 BookingsController.createBooking()
**File:** `src/modules/bookings/bookings.controller.ts` (Lines 28-34)

**Current Endpoint:**
```
@Post()
async createBooking(@Body() dto: CreateBookingDto, @CurrentUser() user: JwtUser)
  → bookingsService.createBooking(dto, user.id, user.role)
```

**Single Request → Single Booking**

#### 1.4 Helper Methods

**calculatePrice()** (Lines 177-216)
- Hours calculation: `(endTime - startTime) / (1000 * 60 * 60)`
- Query pricing rules with multiple OR conditions (courtId, dayOfWeek, timeStr)
- Return: `Math.round(pricePerHour * hours)`

**generateBookingCode()** (Lines 227-249)
- Daily sequence counter
- Format: BK + YYMMDD + 4-digit sequence

---

### Frontend Current State

#### 2.1 Calendar.tsx (UI Component)
**File:** `frontend/src/features/calendar/Calendar.tsx` (Lines 1-227)

**Current Data Structure:**
```typescript
const [selectedDate, setSelectedDate] = useState<Date>(new Date());
const [selectedCourtId, setSelectedCourtId] = useState<number | null>(null);
const [selectedSlots, setSelectedSlots] = useState<number[]>([]); // timestamp array in ms
```

**Selected Range:**
```typescript
const selectedRange = {
  courtId: number,
  start: Date,
  end: Date
} | null
```

**State Management:**
- Single `selectedCourtId` (can only book one court at a time)
- `selectedSlots` array of 30-minute slot timestamps
- All slots must be contiguous (no gaps)
- Cannot switch courts while slots selected

#### 2.2 Slot Toggle Logic
**File:** `frontend/src/features/calendar/Calendar.tsx` (Lines 55-89)

**Current Behavior:**
1. **Conflict Check** (Lines 55-66)
   - Find bookings overlapping slot time
   - Reject if status !== CANCELLED

2. **Court Switch** (Lines 68-72)
   - If different court clicked → clear slots, set new court

3. **Toggle Logic** (Lines 74-89)
   - If slot exists → remove it
   - If slot new → add to array
   - Validate contiguity (must be 30m steps)

#### 2.3 Mutation/Submit Logic
**File:** `frontend/src/features/calendar/Calendar.tsx` (Lines 38-47)

**Current Mutation:**
```typescript
useMutation({
  mutationFn: async (params) => 
    apiClient.post('/bookings', {
      courtId, startTime (ISO string), endTime (ISO string)
    }),
  onSuccess: (response) => alert + clearState,
  onError: (error) => alert + error details
})
```

**Single Request Body**

#### 2.4 Hook: useCourtBookings
**File:** `frontend/src/features/calendar/hooks/useCourtBookings.ts` (Lines 1-44)

- `useCourtBookings()` - single court + date
- `useAllCourtBookingsByDate()` - all courts on date
- Using React Query with 2-minute staleTime

---

## 2. MIGRATION STRATEGY

### Phase 1: Backend Implementation (No Breaking Changes)
Create **NEW** endpoints/DTOs without removing old ones. This allows frontend gradual migration.

### Phase 2: Frontend Migration
Update UI components to leverage new bulk endpoints.

### Phase 3: Deprecation
Once frontend fully migrated, mark old single endpoints as deprecated.

---

## 3. DETAILED FILE MODIFICATION PLAN

### BACKEND MODIFICATIONS (In Order)

#### **STEP 1: Create New DTO**
**File:** `src/modules/bookings/dto/create-bulk-booking.dto.ts` (NEW FILE)

**Required:**
- `bookings[]` array
- Each item: `{ courtId: number; startTime: string; endTime: string }`
- Optional fields same as single: `type`, `paymentMethod`, `guestName`, `guestPhone`
- Validation: Array length (min 1, max limit)
- Validation per item: same as single

**Lines:** NEW, ~45 lines

---

#### **STEP 2: Update BookingsService**
**File:** `src/modules/bookings/bookings.service.ts`

**2a: Add Bulk Service Method** (NEW)
**Target:** After `createBooking()` method (after line 175)
**Add:** `createBulkBooking()` method (~150 lines)

**Logic:**
```
1. Validate array not empty
2. For each booking in array:
   a. Validate time (start < end, start >= now)
   b. Validate court exists & active
   c. Check double-booking conflicts
   d. Calculate price
3. Single transaction wrapping ALL creates:
   a. Create ALL bookings with one Prisma.$transaction()
   b. If ANY fails → rollback ALL
4. For each PENDING_PAYMENT booking:
   a. Add expiry job to queue
5. Return array of created bookings with total price
```

**2b: Refactor calculatePrice()** (MODIFY)
**Current location:** Lines 177-216
**Change:** Make it handle optional courtId parameter for batch calculations
**No breaking change** - add optional parameter for optimization

**2c: Refactor validateBooking()** (NEW PRIVATE METHOD)
**Create:** Helper method to reduce code duplication
**Used by:** Both `createBooking()` and `createBulkBooking()`
**Returns:** Validated booking object or throws

**2d: Update type exports** (MODIFY)
**File:** `src/modules/bookings/dto/index.ts`
**Add:** Export for CreateBulkBookingDto

---

#### **STEP 3: Update BookingsController**
**File:** `src/modules/bookings/bookings.controller.ts`

**3a: Add New Endpoint** (NEW)
**After:** Line 34 (after existing @Post createBooking)
**Endpoint:** `@Post('bulk')`
**Handler:** `async createBulkBooking(@Body() dto: CreateBulkBookingDto, @CurrentUser() user: JwtUser)`
**Calls:** `this.bookingsService.createBulkBooking(dto, user.id, user.role)`

**Import:** Add CreateBulkBookingDto import

**Lines to add:** ~10 new lines

---

### FRONTEND MODIFICATIONS (In Order)

#### **STEP 4: Create New Types**
**File:** `frontend/src/types/bulk-booking.types.ts` (NEW FILE)

**Required types:**
```typescript
interface SelectedSlot {
  courtId: number;
  time: string;           // "HH:mm-HH:mm" format
  startTime: Date;
  endTime: Date;
  price: number;
}

interface BulkBookingRequest {
  bookings: Array<{
    courtId: number;
    startTime: string;     // ISO string
    endTime: string;       // ISO string
  }>;
}

interface BulkBookingResponse {
  message: string;
  bookings: Array<{
    id: number;
    bookingCode: string;
    courtId: number;
    startTime: string;
    endTime: string;
    totalPrice: number;
    // ... other fields
  }>;
  totalPrice: number;
}
```

**Lines:** ~40 lines

---

#### **STEP 5: Update Calendar Component State**
**File:** `frontend/src/features/calendar/Calendar.tsx`

**5a: Modify State** (REPLACE Lines 9-11)
```typescript
// OLD:
// const [selectedSlots, setSelectedSlots] = useState<number[]>([]);

// NEW:
const [selectedSlots, setSelectedSlots] = useState<SelectedSlot[]>([]);
```

**5b: Add Price Calculation** (NEW, after state declarations)
```typescript
const totalPrice = useMemo(() => {
  return selectedSlots.reduce((sum, slot) => sum + slot.price, 0);
}, [selectedSlots]);
```

**5c: Update selectedRange** (MODIFY Lines 47-52)
```typescript
// OLD: selectedRange = { courtId, start, end } | null

// NEW: selectedRange = selectedSlots[] | null
// (Keep selectedSlots as array, remove selectedRange if not needed)
```

**Lines modified:** ~15 lines affected

---

#### **STEP 6: Update Slot Toggle Logic**
**File:** `frontend/src/features/calendar/Calendar.tsx`

**6a: Replace handleSlotToggle()** (REPLACE Lines 55-89)

**New Logic:**
```typescript
const handleSlotToggle = (courtId: number, startTime: Date) => {
  // 1. Conflict check (same as before)
  const conflict = bookings.find(...)
  if (conflict) { alert(...); return; }
  
  // 2. Calculate slot price
  const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);
  const price = await calculateSlotPrice(courtId, startTime, endTime);
  // OR: call API endpoint to calculate price
  
  // 3. Create slot object
  const newSlot: SelectedSlot = {
    courtId,
    time: `${HH:mm}-${HH:mm}`,
    startTime,
    endTime,
    price
  };
  
  // 4. Check if slot already selected
  const existingSlot = selectedSlots.find(
    s => s.courtId === courtId && s.startTime.getTime() === startTime.getTime()
  );
  
  // 5. Toggle: add or remove
  if (existingSlot) {
    setSelectedSlots(selectedSlots.filter(s => s !== existingSlot));
  } else {
    setSelectedSlots([...selectedSlots, newSlot]);
  }
};
```

**Key Changes:**
- Multi-court support (remove court switching restriction)
- Each slot tracks own price
- No contiguity requirement
- No sort needed

**Lines replaced:** ~35 lines

---

#### **STEP 7: Update Mutation Logic**
**File:** `frontend/src/features/calendar/Calendar.tsx`

**7a: Replace createBooking mutation** (REPLACE Lines 38-47)

**New Mutation:**
```typescript
const { mutate: createBulkBooking, isPending: isBooking } = useMutation({
  mutationFn: async () => {
    if (selectedSlots.length === 0) throw new Error('No slots selected');
    
    return apiClient.post('/bookings/bulk', {
      bookings: selectedSlots.map(slot => ({
        courtId: slot.courtId,
        startTime: slot.startTime.toISOString(),
        endTime: slot.endTime.toISOString()
      }))
    });
  },
  onSuccess: (response) => {
    const codes = response.data.bookings
      .map(b => b.bookingCode)
      .join(', ');
    alert(`Bookings created! Codes: ${codes}`);
    setSelectedSlots([]);
  },
  onError: (error: any) => {
    alert('Error: ' + (error.response?.data?.message || error.message));
  },
});
```

**Lines replaced:** ~10 lines

---

#### **STEP 8: Update Summary Display**
**File:** `frontend/src/features/calendar/Calendar.tsx`

**8a: Update Summary Section** (REPLACE Lines 169-185)

**Current:**
```typescript
<div className="text-sm text-gray-700">
  {selectedRange ? (
    <>
      <span className="font-semibold">Đang chọn:</span> Sân {selectedRange.courtId} • {format(...)} - {format(...)}
    </>
  ) : (
    'Chọn khung giờ...'
  )}
</div>
```

**New:**
```typescript
<div className="text-sm text-gray-700">
  {selectedSlots.length > 0 ? (
    <>
      <span className="font-semibold">Đang chọn ({selectedSlots.length} khung):</span>
      <div className="mt-2 space-y-1">
        {selectedSlots.map((slot, idx) => (
          <div key={idx} className="text-xs bg-gray-100 p-2 rounded">
            Sân {slot.courtId} • {slot.time} • {slot.price.toLocaleString()}đ
          </div>
        ))}
      </div>
      <div className="font-semibold mt-2">
        Tổng: {totalPrice.toLocaleString()}đ
      </div>
    </>
  ) : (
    'Chọn khung giờ để đặt.'
  )}
</div>
```

**Lines replaced:** ~12 lines

---

#### **STEP 9: Update Button Handler**
**File:** `frontend/src/features/calendar/Calendar.tsx`

**9a: Modify handleConfirmBooking()** (REPLACE Lines 100-103)

**Old:**
```typescript
const handleConfirmBooking = () => {
  if (!selectedRange) return;
  createBooking({ courtId: selectedRange.courtId, startTime: selectedRange.start, endTime: selectedRange.end });
};
```

**New:**
```typescript
const handleConfirmBooking = () => {
  if (selectedSlots.length === 0) return;
  createBulkBooking();
};
```

**Lines replaced:** ~4 lines

---

#### **STEP 10: Update Confirm Button Text**
**File:** `frontend/src/features/calendar/Calendar.tsx`

**10a: Modify Button** (REPLACE Lines 193-197)

**Old:**
```typescript
disabled={!selectedRange || isBooking}
```

**New:**
```typescript
disabled={selectedSlots.length === 0 || isBooking}
```

**Button text:** Update to show count
```
{isBooking ? 'Đang đặt...' : `Xác nhận đặt ${selectedSlots.length} khung`}
```

**Lines replaced:** ~3 lines

---

## 4. FILE MODIFICATION SUMMARY TABLE

| # | Phase | File Path | Type | Lines | Description |
|---|-------|-----------|------|-------|-------------|
| 1 | Backend | `src/modules/bookings/dto/create-bulk-booking.dto.ts` | NEW | 45 | New DTO for bulk bookings |
| 2 | Backend | `src/modules/bookings/bookings.service.ts` | MODIFY | +150 | Add createBulkBooking() method |
| 3 | Backend | `src/modules/bookings/dto/index.ts` | MODIFY | +1 | Export CreateBulkBookingDto |
| 4 | Backend | `src/modules/bookings/bookings.controller.ts` | MODIFY | +10 | Add @Post('bulk') endpoint |
| 5 | Frontend | `frontend/src/types/bulk-booking.types.ts` | NEW | 40 | New type definitions |
| 6 | Frontend | `frontend/src/features/calendar/Calendar.tsx` | MODIFY | ~80 | Update state, logic, UI |
| 7 | Frontend | `frontend/src/features/calendar/hooks/useCourtBookings.ts` | MODIFY | +20 | Add bulk pricing calculator hook |
| **OPTIONAL** | Frontend | `frontend/src/features/calendar/Calendar.tsx` | DELETE | 4-10 | Remove old single-booking mutation |

---

## 5. IMPLEMENTATION ORDER (Step-by-Step Execution)

### Order A: Backend First (Prevents Frontend Breaks)

1. **✅ Step 1** - Create `create-bulk-booking.dto.ts` (NEW)
   - No dependencies
   - Isolated to DTO layer

2. **✅ Step 2a** - Add `createBulkBooking()` method to service
   - Can test with Postman independently
   - Uses existing helpers

3. **✅ Step 2b** - Refactor `calculatePrice()` (optional optimization)
   - Non-breaking change
   - Improves bulk performance

4. **✅ Step 3** - Update `bookings.controller.ts` endpoint
   - Add new route alongside existing
   - Both endpoints available

5. **✅ Step 3** - Update `dto/index.ts` exports
   - Required for controller imports

### Order B: Frontend (with working backend)

6. **✅ Step 4** - Create `bulk-booking.types.ts` (NEW)
   - Pure TypeScript types
   - No runtime logic

7. **✅ Step 5** - Modify Calendar state
   - Change selectedSlots structure
   - Update totalPrice calculation

8. **✅ Step 6** - Update handleSlotToggle() logic
   - Replace toggle handler
   - Add multi-court support

9. **✅ Step 7** - Update mutation (createBulkBooking)
   - Point to new `/bookings/bulk` endpoint

10. **✅ Step 8-10** - Update UI display & buttons
    - Summary section
    - Confirm button
    - Price display

---

## 6. DETAILED CODE LOCATIONS FOR MODIFICATION

### Backend: Exact Line Ranges

#### `src/modules/bookings/dto/create-booking.dto.ts`
- **Current:** Lines 1-34 (existing, keep as-is)

#### `src/modules/bookings/dto/create-bulk-booking.dto.ts` (NEW FILE)
```typescript
// NEW FILE - ~45 lines
import { IsArray, ValidateNested, Type, IsInt, IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { BookingType, PaymentMethod } from '@prisma/client';

class BulkBookingItemDto {
  @IsInt()
  courtId: number;

  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;
}

export class CreateBulkBookingDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkBookingItemDto)
  bookings: BulkBookingItemDto[];

  @IsEnum(BookingType)
  @IsOptional()
  type?: BookingType;

  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @IsString()
  @IsOptional()
  guestName?: string;

  @IsString()
  @IsOptional()
  guestPhone?: string;

  constructor() {
    // Validation: min 1, max 30 bookings per request
    if (this.bookings?.length === 0) {
      throw new Error('At least 1 booking required');
    }
    if (this.bookings?.length > 30) {
      throw new Error('Maximum 30 bookings per request');
    }
  }
}
```

#### `src/modules/bookings/bookings.service.ts`
- **Keep existing:** `createBooking()` at Lines 28-175
- **After Line 175:** ADD new `createBulkBooking()` method (~150 lines)

**New method structure:**
```typescript
async createBulkBooking(
  dto: CreateBulkBookingDto,
  userId: number | null,
  userRole: Role,
) {
  // 1. Validate input
  if (dto.bookings.length === 0) throw new BadRequestException('...');
  if (dto.bookings.length > 30) throw new BadRequestException('...');

  // 2. Pre-validation loop
  const validatedBookings = [];
  for (const item of dto.bookings) {
    const validated = await this.validateAndPrepareBooking(
      item,
      userId,
      userRole,
      dto.type,
      dto.paymentMethod,
      dto.guestName,
      dto.guestPhone
    );
    validatedBookings.push(validated);
  }

  // 3. Single transaction for all creates
  const createdBookings = await this.prisma.$transaction(async (tx) => {
    const results = [];
    for (const booking of validatedBookings) {
      const created = await tx.booking.create({
        data: booking.data,
        include: { court: true, user: { select: { id: true, email: true, name: true } } }
      });
      results.push(created);
    }
    return results;
  });

  // 4. Queue expiry jobs
  const totalPrice = createdBookings.reduce((sum, b) => sum + b.totalPrice, 0);
  for (const booking of createdBookings) {
    if (booking.expiresAt) {
      await this.bookingQueue.add(...);
    }
  }

  return {
    message: 'Bulk booking created successfully',
    bookings: createdBookings,
    totalPrice
  };
}

// Helper method
private async validateAndPrepareBooking(...) {
  // Extract validation logic from createBooking()
  // Return prepared data object for transaction
}
```

#### `src/modules/bookings/dto/index.ts`
- **Current:** Likely exports CreateBookingDto
- **Add:** Export CreateBulkBookingDto

#### `src/modules/bookings/bookings.controller.ts`
- **After Line 34 (after @Post createBooking):** ADD new endpoint

```typescript
/**
 * 📅 Create multiple bookings in one transaction
 */
@Post('bulk')
async createBulkBooking(
  @Body() dto: CreateBulkBookingDto,
  @CurrentUser() user: JwtUser,
) {
  return this.bookingsService.createBulkBooking(dto, user.id, user.role);
}
```

---

### Frontend: Exact Line Ranges

#### `frontend/src/types/bulk-booking.types.ts` (NEW FILE)
```typescript
// NEW FILE - ~40 lines
export interface SelectedSlot {
  courtId: number;
  time: string;              // "HH:mm-HH:mm" format
  startTime: Date;
  endTime: Date;
  price: number;
}

export interface BulkBookingRequest {
  bookings: Array<{
    courtId: number;
    startTime: string;        // ISO string
    endTime: string;          // ISO string
  }>;
}

export interface BulkBookingResponse {
  message: string;
  bookings: BookingRecord[];
  totalPrice: number;
}

export interface BookingRecord {
  id: number;
  bookingCode: string;
  courtId: number;
  userId: number | null;
  guestName: string | null;
  guestPhone: string | null;
  startTime: string;
  endTime: string;
  totalPrice: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
}
```

#### `frontend/src/features/calendar/Calendar.tsx`
- **Lines 9-11:** Replace state declaration
- **After Line 11:** Add totalPrice calculation (useMemo)
- **Lines 55-89:** Replace handleSlotToggle() function
- **Lines 38-47:** Replace createBooking mutation
- **Lines 100-103:** Replace handleConfirmBooking() function
- **Lines 169-185:** Replace summary display section
- **Lines 193-197:** Update button disabled/text logic
- **Add import:** `import { SelectedSlot, BulkBookingResponse } from '../../types/bulk-booking.types';`

---

## 7. RISK ASSESSMENT & MITIGATION

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **Single transaction fails** | Entire bulk cancelled | Wrap in try-catch, return detailed error |
| **Price calculation changes** | Mismatch user/display | Test pricing logic before/after |
| **Multi-court booking conflicts** | Bad data | Add validation loop before transaction |
| **UI state mismatch** | UI bugs | Test slot add/remove scenarios |
| **Queue job overload** | Too many expiry jobs | Batch job creation or limit request size |
| **Race condition on bookings** | Double-booking still possible | Prisma transaction handles isolation |

---

## 8. VALIDATION CHECKLIST BEFORE ROLLOUT

### Backend Testing
- [ ] Single booking still works (existing endpoint)
- [ ] Bulk endpoint accepts 1-30 bookings
- [ ] Rejects 0 or 31+ bookings
- [ ] Detects conflict in ANY booking (rolls back all)
- [ ] Calculates correct total price
- [ ] Creates expiry jobs for PENDING_PAYMENT
- [ ] All bookings get unique codes

### Frontend Testing
- [ ] Multi-court selection (click different courts)
- [ ] Same-slot toggle works (add/remove)
- [ ] Price updates correctly (sum displayed)
- [ ] Submit sends correct format
- [ ] Success shows all booking codes
- [ ] Error message clear
- [ ] Old single-booking endpoint still works (backward compat)

### Integration Testing
- [ ] Happy path: select 3 slots, different courts, submit
- [ ] Error path: select 2 slots, 1st has conflict, submit → both rejected
- [ ] Payment path: pending payment slots show expiry time
- [ ] Edge case: same slot clicked twice → toggle off

---

## 9. SUMMARY OF CHANGES BY FILE

```
TOTAL FILES TO MODIFY: 7
├─ BACKEND (4 files)
│  ├─ create-bulk-booking.dto.ts (NEW - 45 lines)
│  ├─ bookings.service.ts (MODIFY - +150 lines, +2 new methods)
│  ├─ bookings.controller.ts (MODIFY - +10 lines, 1 new endpoint)
│  └─ dto/index.ts (MODIFY - +1 line, 1 new export)
│
└─ FRONTEND (3 files)
   ├─ bulk-booking.types.ts (NEW - 40 lines)
   ├─ Calendar.tsx (MODIFY - ~80 lines across multiple sections)
   └─ useCourtBookings.ts (OPTIONAL - +20 lines for pricing hook)

TOTAL NEW CODE: ~325 lines
TOTAL MODIFIED LINES: ~180 lines
BACKWARD COMPATIBILITY: YES (old endpoints remain)
BREAKING CHANGES: NO
```

---

## 10. NEXT STEPS

1. **Review this plan** - Confirm approach with team
2. **Create feature branch** - `feature/bulk-booking`
3. **Implement Backend** - Steps 1-5 in order
4. **Test Backend** - Postman/curl tests
5. **Implement Frontend** - Steps 4-10 in order
6. **E2E Testing** - Full user flow
7. **Merge & Deploy**

---

## Appendix: Code Snippets Reference

### Snippet A: Transaction Pattern (Prisma)
```typescript
const result = await this.prisma.$transaction(async (tx) => {
  // Multiple operations atomically
  const booking1 = await tx.booking.create({ data: {...} });
  const booking2 = await tx.booking.create({ data: {...} });
  if (someError) throw new Error('Rollback all');
  return [booking1, booking2];
});
// If ANY throws → entire transaction rolls back
```

### Snippet B: Overlap Detection
```typescript
// Existing conflict
const conflict = await this.prisma.booking.findFirst({
  where: {
    courtId: targetCourtId,
    status: { notIn: ['CANCELLED', 'EXPIRED'] },
    OR: [
      {
        startTime: { lt: newEnd },
        endTime: { gt: newStart }
      }
    ]
  }
});
if (conflict) throw new ConflictException('...');
```

### Snippet C: Bulk Array Toggle
```typescript
const handleToggle = (item: SelectedSlot) => {
  const exists = selectedSlots.find(s => s.id === item.id);
  if (exists) {
    setSelectedSlots(selectedSlots.filter(s => s.id !== item.id));
  } else {
    setSelectedSlots([...selectedSlots, item]);
  }
};
```

---

**Document Version:** 1.0  
**Last Updated:** December 9, 2025  
**Author:** Migration Analysis System
