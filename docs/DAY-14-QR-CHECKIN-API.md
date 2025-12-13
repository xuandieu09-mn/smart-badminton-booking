# Day 14: QR Code Check-in System - API Testing

## 1. Generate QR Code for Booking

**Endpoint:** `POST /api/bookings/:id/generate-qr`

**Headers:**
```
Authorization: Bearer <token>
```

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/bookings/1/generate-qr \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "message": "QR code generated successfully",
  "bookingId": 1,
  "bookingCode": "BOOK-20251213-A1B2",
  "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
}
```

---

## 2. Check-in Booking (Staff/Admin)

**Endpoint:** `POST /api/bookings/check-in`

**Headers:**
```
Authorization: Bearer <staff_token>
```

**Request Body:**
```json
{
  "bookingCode": "BOOK-20251213-A1B2"
}
```

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/bookings/check-in \
  -H "Authorization: Bearer <staff_token>" \
  -H "Content-Type: application/json" \
  -d '{"bookingCode": "BOOK-20251213-A1B2"}'
```

**Success Response:**
```json
{
  "message": "Check-in successful",
  "booking": {
    "id": 1,
    "bookingCode": "BOOK-20251213-A1B2",
    "courtId": 1,
    "startTime": "2025-12-13T10:00:00.000Z",
    "endTime": "2025-12-13T11:00:00.000Z",
    "status": "CHECKED_IN"
  },
  "checkedInBy": "staff@badminton.com"
}
```

**Error Responses:**

- **Invalid booking code format:**
```json
{
  "statusCode": 400,
  "message": "Invalid booking code format"
}
```

- **Booking not found:**
```json
{
  "statusCode": 404,
  "message": "Booking not found: BOOK-20251213-XXXX"
}
```

- **Invalid status:**
```json
{
  "statusCode": 400,
  "message": "Booking cannot be checked in. Current status: CANCELLED"
}
```

- **Too early:**
```json
{
  "statusCode": 400,
  "message": "Too early to check in. You can check in 15 minutes before start time."
}
```

- **Expired:**
```json
{
  "statusCode": 400,
  "message": "Booking time has expired."
}
```

---

## 3. Get Real-time Court Status (Staff/Admin)

**Endpoint:** `GET /api/courts/realtime-status`

**Headers:**
```
Authorization: Bearer <staff_token>
```

**Example Request:**
```bash
curl -X GET http://localhost:3000/api/courts/realtime-status \
  -H "Authorization: Bearer <staff_token>"
```

**Response:**
```json
{
  "timestamp": "2025-12-13T14:30:00.000Z",
  "courts": [
    {
      "courtId": 1,
      "courtName": "Court 1",
      "status": "OCCUPIED",
      "currentBooking": {
        "id": 5,
        "bookingCode": "BOOK-20251213-A1B2",
        "startTime": "2025-12-13T14:00:00.000Z",
        "endTime": "2025-12-13T15:00:00.000Z",
        "status": "CHECKED_IN",
        "userName": "John Doe",
        "userEmail": "john@example.com"
      },
      "nextBooking": {
        "id": 8,
        "bookingCode": "BOOK-20251213-C3D4",
        "startTime": "2025-12-13T15:00:00.000Z",
        "endTime": "2025-12-13T16:00:00.000Z",
        "status": "CONFIRMED",
        "userName": "Jane Smith"
      },
      "todayBookings": 6
    },
    {
      "courtId": 2,
      "courtName": "Court 2",
      "status": "AVAILABLE",
      "currentBooking": null,
      "nextBooking": {
        "id": 10,
        "bookingCode": "BOOK-20251213-E5F6",
        "startTime": "2025-12-13T16:00:00.000Z",
        "endTime": "2025-12-13T17:00:00.000Z",
        "status": "CONFIRMED",
        "userName": "Bob Wilson"
      },
      "todayBookings": 4
    }
  ],
  "summary": {
    "totalCourts": 5,
    "available": 2,
    "occupied": 2,
    "reserved": 1
  }
}
```

**Court Status Types:**
- `AVAILABLE` - Sân đang trống
- `OCCUPIED` - Đang có khách chơi (status = CHECKED_IN)
- `RESERVED` - Đã được đặt nhưng chưa check-in (status = CONFIRMED)

---

## Testing Workflow

### Step 1: Create a booking (Customer)
```bash
# Login as customer
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "customer1@test.com", "password": "password123"}'

# Create booking
curl -X POST http://localhost:3000/api/bookings \
  -H "Authorization: Bearer <customer_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "courtId": 1,
    "startTime": "2025-12-13T15:00:00.000Z",
    "endTime": "2025-12-13T16:00:00.000Z",
    "type": "ONLINE",
    "paymentMethod": "WALLET"
  }'
```

### Step 2: Generate QR code (Customer)
```bash
curl -X POST http://localhost:3000/api/bookings/1/generate-qr \
  -H "Authorization: Bearer <customer_token>"
```

### Step 3: Check real-time status (Staff)
```bash
curl -X GET http://localhost:3000/api/courts/realtime-status \
  -H "Authorization: Bearer <staff_token>"
```

### Step 4: Check-in booking (Staff)
```bash
curl -X POST http://localhost:3000/api/bookings/check-in \
  -H "Authorization: Bearer <staff_token>" \
  -H "Content-Type: application/json" \
  -d '{"bookingCode": "BOOK-20251213-XXXX"}'
```

### Step 5: Verify status updated
```bash
curl -X GET http://localhost:3000/api/courts/realtime-status \
  -H "Authorization: Bearer <staff_token>"
# Should show court as OCCUPIED now
```

---

## Business Rules

1. **QR Code Generation:**
   - Any user (Customer/Staff/Admin) can generate QR for their own bookings
   - Staff/Admin can generate QR for any booking

2. **Check-in Rules:**
   - Only Staff/Admin can perform check-in
   - Booking must have status `CONFIRMED`
   - Check-in allowed 15 minutes before start time
   - Cannot check-in after end time (expired)

3. **Booking Code Format:**
   - Pattern: `BOOK-YYYYMMDD-XXXX`
   - Example: `BOOK-20251213-A1B2`

4. **Real-time Status:**
   - Updates automatically every 30 seconds in frontend
   - Staff/Admin only endpoint
   - Shows current and next booking for each court
   - Summary statistics (available/occupied/reserved)

---

## Frontend Integration

### Staff Check-in Page Features:
1. **QR Scanner Tab:**
   - HTML5 QR code scanner using camera
   - Manual booking code entry
   - Real-time check-in result display
   - Success/error messages

2. **Court Monitor Tab:**
   - Real-time court status grid
   - Color-coded status cards (Green/Red/Yellow)
   - Current and next booking info
   - Auto-refresh every 30 seconds
   - Manual refresh button

### Routes:
- Staff Check-in: `/staff/checkin`
- Component: `CheckInPage.tsx`
- Sub-components: `QRScanner.tsx`, `CourtMonitor.tsx`
