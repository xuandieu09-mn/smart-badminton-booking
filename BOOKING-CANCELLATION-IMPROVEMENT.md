# ✅ CẢI TIẾN FLOW HỦY BOOKING

## Tổng quan

Đã cải tiến flow hủy booking theo yêu cầu:
1. **Booking chưa thanh toán (PENDING_PAYMENT)**: Hủy ngay, không cần notification
2. **Booking đã thanh toán (CONFIRMED)**: Yêu cầu xác nhận điều khoản hoàn tiền trước khi hủy

## Thay đổi Backend

### 1. BookingsService (`src/modules/bookings/bookings.service.ts`)

#### Thêm tham số `confirmCancellation`
```typescript
async cancelBooking(
  bookingId: number,
  userId?: number,
  confirmCancellation: boolean = false,
): Promise<{ message: string; booking: any }>
```

#### Kiểm tra yêu cầu xác nhận
```typescript
// ✅ REQUIRE CONFIRMATION: If booking is CONFIRMED (already paid), customer must confirm cancellation terms
if (booking.status === BookingStatus.CONFIRMED && userId && !confirmCancellation) {
  throw new BadRequestException(
    'CONFIRMATION_REQUIRED: Vui lòng xác nhận điều khoản hủy booking đã thanh toán',
  );
}
```

#### Bỏ qua notification cho booking chưa thanh toán
```typescript
// 🔔 Notify staff & admin about cancellation (ONLY for paid bookings)
// ✅ SKIP NOTIFICATION: If booking was PENDING_PAYMENT, no need to notify
if (booking.status === BookingStatus.CONFIRMED) {
  try {
    // Get updated wallet balance after refund
    let walletBalance = 0;
    if (booking.userId) {
      const wallet = await this.prisma.wallet.findUnique({
        where: { userId: booking.userId },
      });
      walletBalance = wallet ? Number(wallet.balance) : 0;
    }

    // Send cancellation notification with refund info
    await this.notificationsService.notifyBookingCancelled(booking, {
      refundAmount: Number(refundAmount),
      refundPercentage,
      walletBalance,
    });
  } catch (error) {
    this.logger.error(
      `Failed to send cancellation notification: ${error.message}`,
    );
  }
}
```

### 2. BookingsController (`src/modules/bookings/bookings.controller.ts`)

#### Cập nhật endpoint nhận `confirmCancellation`
```typescript
@Post(':id/cancel')
async cancelBooking(
  @Param('id', ParseIntPipe) id: number,
  @CurrentUser() user: JwtUser,
  @Body() body?: { confirmCancellation?: boolean },
) {
  const userId = user.role === Role.CUSTOMER ? user.id : undefined;
  const confirmCancellation = body?.confirmCancellation || false;
  return this.bookingsService.cancelBooking(id, userId, confirmCancellation);
}
```

## Thay đổi Frontend

### 1. CancellationConfirmModal (Component mới)

File: `frontend/src/features/booking/components/CancellationConfirmModal.tsx`

**Tính năng:**
- Hiển thị thông tin booking (mã booking, thời gian, số tiền đã thanh toán)
- Hiển thị bảng chính sách hoàn tiền:
  - **>24 giờ trước**: Hoàn 100%
  - **12-24 giờ trước**: Hoàn 50%
  - **<12 giờ trước**: Không hoàn tiền
- Tính toán và hiển thị số tiền hoàn dự kiến
- Highlight trường hợp hiện tại của khách
- Hướng dẫn liên hệ Admin nếu không thuộc điều khoản hoàn tiền

**Props:**
```typescript
interface CancellationConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  bookingCode: string;
  bookingTime: Date;
  paidAmount: number;
  estimatedRefund: {
    percentage: number;
    amount: number;
  };
}
```

### 2. MyBookingsPage (Cập nhật)

File: `frontend/src/features/booking/pages/MyBookingsPage.tsx`

#### Thêm state cho modal
```typescript
const [cancellationModalOpen, setCancellationModalOpen] = useState(false);
const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);
```

#### Cập nhật mutation gửi `confirmCancellation`
```typescript
const { mutate: cancelBooking, isPending: isCancelling } = useMutation({
  mutationFn: async ({
    bookingId,
    confirmCancellation,
  }: {
    bookingId: number;
    confirmCancellation: boolean;
  }) => {
    return apiClient.post(`/bookings/${bookingId}/cancel`, {
      confirmCancellation,
    });
  },
  onSuccess: () => {
    alert('✅ Đã hủy booking!');
    queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
    setCancellationModalOpen(false);
    setBookingToCancel(null);
  },
  onError: (error: any) => {
    const errorMsg = error.response?.data?.message || error.message;
    
    // Nếu lỗi yêu cầu xác nhận, hiển thị modal
    if (errorMsg.includes('CONFIRMATION_REQUIRED')) {
      // Modal đã mở rồi, không làm gì
      return;
    }
    
    alert(`❌ Lỗi: ${errorMsg}`);
    setCancellationModalOpen(false);
    setBookingToCancel(null);
  },
});
```

#### Thêm logic xử lý cancel
```typescript
// Calculate estimated refund for a booking
const calculateEstimatedRefund = (booking: Booking) => {
  const now = new Date();
  const bookingStart = new Date(booking.startTime);
  const hoursUntilBooking = differenceInHours(bookingStart, now);

  let percentage = 0;
  if (hoursUntilBooking > 24) {
    percentage = 100;
  } else if (hoursUntilBooking > 12) {
    percentage = 50;
  } else {
    percentage = 0;
  }

  const amount = (booking.paidAmount * percentage) / 100;

  return { percentage, amount };
};

// Handle cancel button click
const handleCancelClick = (booking: Booking) => {
  // Nếu chưa thanh toán (PENDING_PAYMENT), hủy luôn không cần confirm
  if (booking.status === 'PENDING_PAYMENT') {
    if (confirm('Bạn có chắc muốn hủy booking này?')) {
      cancelBooking({ bookingId: booking.id, confirmCancellation: false });
    }
    return;
  }

  // Nếu đã thanh toán (CONFIRMED), hiển thị modal xác nhận
  if (booking.status === 'CONFIRMED') {
    setBookingToCancel(booking);
    setCancellationModalOpen(true);
    return;
  }
};

// Confirm cancellation from modal
const handleConfirmCancellation = () => {
  if (!bookingToCancel) return;
  cancelBooking({ bookingId: bookingToCancel.id, confirmCancellation: true });
};
```

#### Thêm modal vào JSX
```tsx
{/* Cancellation Confirmation Modal */}
{bookingToCancel && (
  <CancellationConfirmModal
    isOpen={cancellationModalOpen}
    onClose={() => {
      setCancellationModalOpen(false);
      setBookingToCancel(null);
    }}
    onConfirm={handleConfirmCancellation}
    bookingCode={bookingToCancel.bookingCode}
    bookingTime={new Date(bookingToCancel.startTime)}
    paidAmount={bookingToCancel.paidAmount}
    estimatedRefund={calculateEstimatedRefund(bookingToCancel)}
  />
)}
```

## Flow hoạt động

### Flow 1: Hủy booking chưa thanh toán (PENDING_PAYMENT)

1. Khách click "❌ Hủy booking"
2. Hiển thị confirm đơn giản: "Bạn có chắc muốn hủy booking này?"
3. Gửi API: `POST /bookings/:id/cancel` với `confirmCancellation: false`
4. Backend:
   - Kiểm tra status = PENDING_PAYMENT
   - Không yêu cầu confirmCancellation
   - Hủy booking ngay
   - **KHÔNG** gửi notification
5. Frontend: Hiển thị "✅ Đã hủy booking!"

### Flow 2: Hủy booking đã thanh toán (CONFIRMED)

1. Khách click "❌ Hủy booking"
2. Mở modal `CancellationConfirmModal` hiển thị:
   - Thông tin booking
   - Chính sách hoàn tiền (3 mức)
   - Tính toán số tiền hoàn dự kiến
   - Highlight trường hợp hiện tại
   - Hướng dẫn liên hệ Admin nếu cần
3. Khách đọc và click "✅ Xác nhận hủy booking"
4. Gửi API: `POST /bookings/:id/cancel` với `confirmCancellation: true`
5. Backend:
   - Kiểm tra status = CONFIRMED
   - Kiểm tra confirmCancellation = true
   - Tính toán refund theo chính sách:
     - >24h: 100%
     - 12-24h: 50%
     - <12h: 0%
   - Hoàn tiền vào ví (nếu có)
   - **GỬI** notification cho staff/admin
6. Frontend: 
   - Hiển thị "✅ Đã hủy booking!"
   - Refresh danh sách booking

## Chính sách hoàn tiền

| Thời gian hủy | Tỷ lệ hoàn | Mô tả |
|--------------|-----------|-------|
| >24 giờ trước | 100% | Hoàn 100% số tiền đã thanh toán |
| 12-24 giờ trước | 50% | Hoàn 50% số tiền đã thanh toán |
| <12 giờ trước | 0% | Không được hoàn tiền |

**Trường hợp đặc biệt:**
Nếu khách hủy trong vòng <12h nhưng có lý do chính đáng (ốm đau, tai nạn, thiên tai...), modal sẽ hướng dẫn liên hệ Admin qua:
- 📧 Email: admin@smartcourt.vn
- 📞 Hotline: 1900-xxxx
- 💬 Chat với Admin trên hệ thống

## Testing

### Test Case 1: Hủy booking PENDING_PAYMENT
1. Tạo booking mới (chưa thanh toán)
2. Click "Hủy booking"
3. Confirm popup đơn giản
4. Kiểm tra:
   - ✅ Booking bị hủy
   - ✅ KHÔNG có notification gửi đi
   - ✅ Không có refund (vì chưa thanh toán)

### Test Case 2: Hủy booking CONFIRMED (>24h)
1. Tạo booking và thanh toán (thời gian đặt >24h sau)
2. Click "Hủy booking"
3. Modal hiển thị:
   - Chính sách hoàn tiền
   - Highlight "100%" (màu xanh)
   - Số tiền hoàn = 100% paidAmount
4. Click "Xác nhận hủy booking"
5. Kiểm tra:
   - ✅ Booking bị hủy
   - ✅ Hoàn 100% vào ví
   - ✅ Notification gửi cho staff/admin
   - ✅ Email gửi cho khách

### Test Case 3: Hủy booking CONFIRMED (12-24h)
1. Tạo booking và thanh toán (thời gian đặt 12-24h sau)
2. Click "Hủy booking"
3. Modal highlight "50%"
4. Số tiền hoàn = 50% paidAmount
5. Kiểm tra hoàn 50% đúng

### Test Case 4: Hủy booking CONFIRMED (<12h)
1. Tạo booking và thanh toán (thời gian đặt <12h sau)
2. Click "Hủy booking"
3. Modal highlight "0%" (màu đỏ)
4. Hiển thị hướng dẫn liên hệ Admin
5. Kiểm tra:
   - ✅ Booking bị hủy
   - ✅ KHÔNG hoàn tiền
   - ✅ Notification vẫn gửi

### Test Case 5: Từ chối xác nhận
1. Booking CONFIRMED
2. Click "Hủy booking"
3. Modal mở
4. Click "🔙 Quay lại"
5. Kiểm tra: Booking KHÔNG bị hủy

## Files đã thay đổi

**Backend:**
1. `src/modules/bookings/bookings.service.ts` - Thêm logic confirmCancellation và skip notification
2. `src/modules/bookings/bookings.controller.ts` - Thêm parameter confirmCancellation

**Frontend:**
1. `frontend/src/features/booking/components/CancellationConfirmModal.tsx` - Component modal mới
2. `frontend/src/features/booking/pages/MyBookingsPage.tsx` - Tích hợp modal và logic

## Kết luận

✅ **Hoàn thành đầy đủ yêu cầu:**
1. ✅ Booking chưa thanh toán (PENDING_PAYMENT) - Hủy ngay, không notification
2. ✅ Booking đã thanh toán (CONFIRMED) - Yêu cầu xác nhận điều khoản trước khi hủy
3. ✅ Hiển thị chính sách hoàn tiền rõ ràng
4. ✅ Hướng dẫn liên hệ Admin nếu không thuộc điều khoản
5. ✅ Tính toán refund chính xác theo thời gian
6. ✅ UX/UI thân thiện và dễ hiểu
