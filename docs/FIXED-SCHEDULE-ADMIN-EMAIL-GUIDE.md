# Fixed Schedule Booking - Email & Admin Features

## 📧 Email Notification System

### Template: fixed-schedule-confirmation.html
**Location**: `src/modules/notifications/templates/fixed-schedule-confirmation.html`

**Features**:
- ✅ Single email for entire booking group
- ✅ Beautiful HTML template with gradient header
- ✅ Responsive design (mobile-friendly)
- ✅ Summary box with booking info
- ✅ Pricing table with discount highlight
- ✅ Table listing all booking sessions
- ✅ Important notes and CTA button
- ✅ Plain text fallback version

**Email Content Includes**:
1. Customer name and greeting
2. Booking summary (court, schedule, period)
3. Pricing breakdown (original, discount, final)
4. Complete table of all sessions with booking codes
5. Important reminders (check-in time, cancellation policy)
6. Dashboard link button

### EmailService Implementation
**Location**: `src/modules/notifications/email.service.ts`

**Methods**:
```typescript
sendFixedScheduleConfirmation(data: FixedScheduleEmailData): Promise<void>
testConnection(): Promise<boolean>
```

**Environment Variables Required**:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### Gmail Setup (For SMTP)

1. **Enable 2FA**: Go to Google Account → Security → 2-Step Verification
2. **Generate App Password**: 
   - Visit: https://myaccount.google.com/apppasswords
   - Select "Mail" and your device
   - Copy the 16-character password
3. **Add to .env**:
```env
SMTP_USER=your-email@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx
```

### Integration in BookingsService

Add to `createFixedScheduleBooking()`:

```typescript
// After successful booking creation
try {
  await this.emailService.sendFixedScheduleConfirmation({
    customerName: user.name,
    customerEmail: user.email,
    courtName: court.name,
    groupId: result.bookingGroup.id,
    schedule: `${daysOfWeek.map((d) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ')} ${startTime}-${endTime}`,
    timeRange: `${startTime} - ${endTime}`,
    period: `${startDate} to ${endDate}`,
    totalSessions,
    originalPrice: `${Number(originalPrice).toLocaleString('vi-VN')}đ`,
    hasDiscount: discountRate.greaterThan(0),
    discountRate: Number(discountRate.mul(100)),
    discountAmount: `${Number(discountAmount).toLocaleString('vi-VN')}đ`,
    finalPrice: `${Number(finalPrice).toLocaleString('vi-VN')}đ`,
    bookings: result.bookings.map((b) => ({
      date: dayjs(b.startTime).format('DD/MM/YYYY'),
      dayName: dayjs(b.startTime).format('dddd'),
      time: `${dayjs(b.startTime).format('HH:mm')} - ${dayjs(b.endTime).format('HH:mm')}`,
      bookingCode: b.bookingCode,
    })),
    dashboardUrl: 'http://localhost:5173/dashboard/bookings',
  });
} catch (emailError) {
  this.logger.warn('Failed to send email, but booking was created', emailError);
}
```

## 👨‍💼 Admin Dashboard Features

### 1. BookingGroupBadge Component
**Location**: `frontend/src/components/admin/BookingGroupBadge.tsx`

**Features**:
- Purple "Lịch tháng" tag next to customer name
- Calendar icon
- Session count badge
- Click to open group details modal
- Tooltip with group info

**Usage**:
```tsx
<BookingGroupBadge
  bookingGroupId={booking.bookingGroupId}
  totalSessions={booking.bookingGroup?.totalSessions}
  onClick={() => openGroupModal(booking.bookingGroupId)}
/>
```

### 2. BookingGroupModal Component
**Location**: `frontend/src/components/admin/BookingGroupModal.tsx`

**Features**:
- ✅ Statistics cards (Total, Upcoming, Completed, Cancelled)
- ✅ Customer & court information
- ✅ Pricing with discount details
- ✅ Complete table of all bookings in group
- ✅ Cancel group section with options:
  - Cancel reason input
  - Refund to wallet checkbox
  - Cancel only future bookings checkbox
- ✅ Confirmation popup
- ✅ Real-time data refresh

**Modal Sections**:
1. **Statistics Row**: 4 cards showing booking counts
2. **Group Information**: Descriptions with customer, court, schedule
3. **Bookings Table**: All sessions with status
4. **Cancel Section**: Form to cancel entire group

### 3. AdminBookingsTable Component
**Location**: `frontend/src/components/admin/AdminBookingsTable.tsx`

**Features**:
- Integrated BookingGroupBadge in customer column
- Click badge to open BookingGroupModal
- Search by booking code or customer name
- Filter by date
- "Xem nhóm" button for quick access

## 🔧 Backend API Endpoints

### 1. Get Booking Group Details
```typescript
GET /api/bookings/groups/:id
Authorization: Bearer {token}
Role: STAFF, ADMIN
```

**Response**:
```json
{
  "id": 1,
  "userId": 3,
  "courtId": 1,
  "totalSessions": 16,
  "originalPrice": 1600000,
  "discountRate": 10,
  "finalPrice": 1440000,
  "status": "CONFIRMED",
  "user": { "name": "John Doe", "email": "...", "phone": "..." },
  "court": { "name": "Court 1" },
  "bookings": [ /* array of all bookings */ ],
  "stats": {
    "total": 16,
    "confirmed": 10,
    "upcoming": 8,
    "completed": 2,
    "cancelled": 0
  }
}
```

### 2. Get All Booking Groups
```typescript
GET /api/bookings/groups?status=CONFIRMED&page=1&limit=20
Authorization: Bearer {token}
Role: STAFF, ADMIN
```

**Query Parameters**:
- `status`: CONFIRMED | CANCELLED
- `userId`: Filter by customer
- `courtId`: Filter by court
- `startDate`, `endDate`: Date range
- `page`, `limit`: Pagination

### 3. Cancel Booking Group
```typescript
POST /api/bookings/groups/:id/cancel
Authorization: Bearer {token}
Role: STAFF, ADMIN
```

**Request Body**:
```json
{
  "reason": "Khách hủy hợp đồng",
  "refundToWallet": true,
  "cancelOnlyFuture": false
}
```

**Response**:
```json
{
  "message": "Successfully cancelled booking group #1",
  "cancelledBookings": 8,
  "refundAmount": 800000,
  "refunded": true,
  "reason": "Khách hủy hợp đồng"
}
```

## 📝 Implementation Checklist

### Backend
- [x] Email template HTML created
- [x] EmailService with Handlebars
- [x] FixedScheduleEmailData DTO
- [x] BookingsAdminService created
- [x] CancelBookingGroupDto created
- [x] Controller endpoints added
- [ ] Add EmailService to BookingsModule providers
- [ ] Install dependencies: `npm install nodemailer handlebars`
- [ ] Configure SMTP in .env
- [ ] Test email sending

### Frontend
- [x] BookingGroupBadge component
- [x] BookingGroupModal component
- [x] AdminBookingsTable integration
- [ ] Add to Admin Dashboard route
- [ ] Test modal interactions
- [ ] Test cancel group flow

## 🧪 Testing

### Test Email Sending

```typescript
// Create test endpoint
@Post('test-email')
async testEmail() {
  await this.emailService.sendFixedScheduleConfirmation({
    // ... test data
  });
  return { message: 'Email sent' };
}
```

### Test Cancel Group

```bash
# Cancel entire group
curl -X POST http://localhost:3000/bookings/groups/1/cancel \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Test cancellation",
    "refundToWallet": true,
    "cancelOnlyFuture": false
  }'
```

## 🎨 UI Screenshots

### Booking List with Badge
```
| Booking Code | Customer              | Court   | Date       | Status    |
|-------------|-----------------------|---------|------------|-----------|
| BK251230-AB | John Doe [Lịch tháng] | Court 1 | 30/12/2025 | CONFIRMED |
```

### Group Modal Layout
```
┌─────────────────────────────────────────────┐
│ Chi tiết lịch cố định #1                    │
├─────────────────────────────────────────────┤
│ [Tổng buổi: 16] [Sắp tới: 8] [Hoàn thành: 2] │
│                                             │
│ Khách hàng: John Doe                        │
│ Sân: Court 1                                │
│ Lịch: Mon, Wed 18:00-20:00                  │
│                                             │
│ Danh sách các buổi:                         │
│ ┌─────────────────────────────────────┐    │
│ │ # │ Ngày      │ Giờ        │ Status│    │
│ │ 1 │ 30/12/2025│ 18:00-20:00│ ✓     │    │
│ └─────────────────────────────────────┘    │
│                                             │
│ [Hủy cả chuỗi]                              │
└─────────────────────────────────────────────┘
```

## 📦 Dependencies

```json
{
  "dependencies": {
    "nodemailer": "^6.9.7",
    "handlebars": "^4.7.8"
  },
  "devDependencies": {
    "@types/nodemailer": "^6.4.14",
    "@types/handlebars": "^4.1.0"
  }
}
```

---

**Status**: ✅ Ready for implementation
**Next Steps**: Install dependencies, configure SMTP, integrate email sending
