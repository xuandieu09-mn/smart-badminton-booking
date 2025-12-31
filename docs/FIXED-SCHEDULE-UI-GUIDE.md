# Fixed Schedule Booking UI - Implementation Guide

## 🎨 Component Overview

Component `FixedScheduleBooking.tsx` cung cấp giao diện đầy đủ cho tính năng đặt lịch cố định với các tính năng:

### ✨ Features

1. **Tab Switching**: Chuyển đổi giữa "Đặt lẻ" và "Đặt cố định"
2. **Form Fields**:
   - Chọn sân (Select dropdown với giá)
   - Khoảng thời gian (Range Date Picker)
   - Giờ chơi (Time Range Picker)
   - Thứ trong tuần (Checkbox group)
3. **Validation**: Real-time form validation
4. **Check Availability**: Kiểm tra lịch trống/trùng
5. **Discount Display**: Hiển thị ưu đãi tự động
6. **Conflict Warning**: Cảnh báo ngày bị trùng với chi tiết
7. **Summary Card**: Tóm tắt chi tiết với giá cuối cùng
8. **Responsive Design**: Tối ưu cho mobile & desktop

## 📦 Installation

### 1. Install Dependencies

```bash
cd frontend
npm install antd dayjs @ant-design/icons
```

### 2. Configure Ant Design

Thêm Ant Design CSS vào `main.tsx`:

```typescript
import 'antd/dist/reset.css';
```

Hoặc sử dụng với Tailwind (khuyến nghị):

```typescript
// tailwind.config.js
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    './node_modules/antd/es/**/*.js', // Add this
  ],
  // ... rest of config
};
```

### 3. Add Locale (Vietnamese)

```typescript
// main.tsx hoặc App.tsx
import { ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';
import 'dayjs/locale/vi';
import dayjs from 'dayjs';

dayjs.locale('vi');

function App() {
  return (
    <ConfigProvider locale={viVN}>
      {/* Your app */}
    </ConfigProvider>
  );
}
```

## 🔌 Backend API Integration

### Required Endpoints

#### 1. Check Availability (Preview)

```typescript
POST /api/bookings/fixed/check
```

**Request:**
```json
{
  "courtId": 1,
  "startDate": "2025-12-30",
  "endDate": "2026-01-13",
  "daysOfWeek": [1, 3],
  "startTime": "18:00",
  "endTime": "20:00"
}
```

**Response (Success):**
```json
{
  "success": true,
  "summary": {
    "totalSessions": 4,
    "originalPrice": 800000,
    "discountRate": 0,
    "discountAmount": 0,
    "finalPrice": 800000,
    "courtName": "Court 1",
    "schedule": "Mon, Wed 18:00-20:00",
    "period": "2025-12-30 to 2026-01-13",
    "discount": "No discount"
  }
}
```

**Response (Conflicts):**
```json
{
  "success": false,
  "conflicts": [
    {
      "date": "2025-12-30",
      "day": "Monday",
      "bookingCode": "BK251230-ABCD"
    }
  ]
}
```

#### 2. Create Fixed Booking

```typescript
POST /api/bookings/fixed
```

**Request:** Same as check endpoint

**Response:**
```json
{
  "message": "Fixed schedule booking created successfully! 🎉",
  "bookingGroup": { /* ... */ },
  "bookings": [ /* ... */ ],
  "wallet": { "newBalance": 4200000 },
  "summary": { /* ... */ }
}
```

### Backend Implementation

Add this endpoint to `bookings.controller.ts`:

```typescript
/**
 * 🔍 Check fixed schedule availability (preview)
 */
@Post('fixed/check')
async checkFixedScheduleAvailability(
  @Body() dto: CreateFixedBookingDto,
  @CurrentUser() user: JwtUser,
) {
  try {
    // Reuse the same validation logic but don't create booking
    const result = await this.bookingsService.validateFixedSchedule(dto, user.id);
    
    return {
      success: true,
      summary: result.summary,
    };
  } catch (error) {
    if (error instanceof ConflictException) {
      // Parse conflict dates from error message
      return {
        success: false,
        conflicts: this.parseConflicts(error.message),
      };
    }
    throw error;
  }
}
```

Add validation method to `bookings.service.ts`:

```typescript
/**
 * Validate fixed schedule without creating booking
 */
async validateFixedSchedule(dto: CreateFixedBookingDto, userId: number) {
  // Same logic as createFixedScheduleBooking but stop before transaction
  // Return summary instead of creating booking
  
  // ... (reuse validation + calculation logic)
  
  return {
    summary: {
      totalSessions,
      originalPrice: Number(originalPrice),
      discountRate: Number(discountRate.mul(100)),
      discountAmount: Number(discountAmount),
      finalPrice: Number(finalPrice),
      courtName: court.name,
      schedule: `${daysOfWeek.map((d) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ')} ${startTime}-${endTime}`,
      period: `${startDate} to ${endDate}`,
      discount: discountRate.greaterThan(0)
        ? `${discountRate.mul(100).toNumber()}% off (saved ${Number(discountAmount)} VND)`
        : 'No discount',
    },
  };
}
```

## 🎯 Usage

### Add to Router

```typescript
// src/App.tsx or router config
import FixedBookingPage from './pages/FixedBookingPage';

<Route path="/booking/fixed" element={<FixedBookingPage />} />
```

### Add to Navigation

```typescript
// Navbar or Sidebar
<Link to="/booking/fixed">
  <CalendarOutlined /> Đặt lịch cố định
</Link>
```

## 🎨 Customization

### Colors & Styling

```typescript
// Change primary color
<Button
  type="primary"
  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
>
  Kiểm tra
</Button>
```

### Discount Thresholds

```typescript
// In component or config file
const DISCOUNT_TIERS = [
  { threshold: 4, rate: 0.05, label: '5%' },
  { threshold: 8, rate: 0.10, label: '10%' },
];
```

### Date/Time Formats

```typescript
// Change format
<RangePicker format="YYYY-MM-DD" />
<TimePicker format="h:mm A" /> // 6:00 PM instead of 18:00
```

## 📱 Responsive Breakpoints

```typescript
// Grid adjusts automatically
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  {/* Mobile: 1 column, Desktop: 2 columns */}
</div>
```

## 🧪 Testing

### Test Scenarios

1. **Valid booking**: 2 weeks, Mon+Wed, 18:00-20:00 → Should show summary
2. **With discount**: 2 months, Mon+Wed+Fri → Should show 10% off
3. **Conflict**: Choose already booked slot → Should show red warnings
4. **Validation**: Leave fields empty → Button disabled

### Test Data

```typescript
// Test user: customer1@test.com
// Test court: Court 1 (ID: 1)
// Date range: Next 2 weeks
// Weekdays: [1, 3] (Mon, Wed)
// Time: 18:00 - 20:00
```

## 🐛 Troubleshooting

### Issue: Ant Design styles not loading
**Solution:** Import CSS in `main.tsx`:
```typescript
import 'antd/dist/reset.css';
```

### Issue: Date picker shows English
**Solution:** Configure locale:
```typescript
import viVN from 'antd/locale/vi_VN';
<ConfigProvider locale={viVN}>
```

### Issue: TypeScript errors with Dayjs
**Solution:** Install types:
```bash
npm install -D @types/dayjs
```

## 📊 Component Architecture

```
FixedScheduleBooking
├── State Management
│   ├── selectedCourt
│   ├── dateRange
│   ├── selectedWeekdays
│   ├── timeRange
│   ├── summary
│   └── conflicts
├── Data Fetching (React Query)
│   ├── useQuery: Fetch courts
│   ├── useMutation: Check availability
│   └── useMutation: Create booking
├── UI Sections
│   ├── Tab Switcher
│   ├── Form Fields
│   ├── Check Button
│   ├── Discount Info Banner
│   ├── Conflict Warnings
│   └── Success Summary Card
└── Validation
    ├── Form validation
    ├── Date range validation
    └── API error handling
```

## 🚀 Next Steps

1. **Integrate with existing Calendar** - Merge single booking flow
2. **Add wallet balance check** - Show warning before booking
3. **Email confirmation** - Send booking summary
4. **Calendar preview** - Show selected dates on calendar
5. **Edit/Cancel** - Manage group bookings
6. **Payment options** - Support partial payment

## 📝 Notes

- Component uses **Ant Design** for rich UI components
- **Tailwind CSS** for custom styling and responsive design
- **React Query** for data fetching and mutations
- **Dayjs** for date manipulation
- **TypeScript** for type safety

## 🎓 Best Practices

✅ Form validation before API calls
✅ Loading states for better UX
✅ Error handling with user-friendly messages
✅ Responsive design for mobile
✅ Accessibility (ARIA labels)
✅ TypeScript for type safety
✅ Reusable components
✅ Clean code structure

---

**Status**: ✅ Ready to use
**Version**: 1.0.0
**Last Updated**: 2025-12-27
