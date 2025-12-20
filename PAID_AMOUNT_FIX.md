# ✅ Fix Logic: Hoàn tiền đúng với số tiền đã thanh toán

## 🐛 Vấn đề ban đầu

**Scenario lỗi:**
1. Khách đặt sân 1 giờ = 100k (PAID)
2. Admin kéo dài thêm 1 giờ → totalPrice = 150k
3. Nhưng 50k thêm chưa charge từ ví khách
4. Khách hủy sân → Hệ thống hoàn 150k (SAI!)
5. Khách nhận thừa 50k

## ✅ Giải pháp

### 1. Database Schema Changes

**Thêm field `paidAmount`:**
```prisma
model Booking {
  totalPrice Decimal // Giá hiện tại (có thể thay đổi)
  paidAmount Decimal @default(0) // Số tiền thực sự đã thanh toán
}
```

### 2. Logic Changes

#### A. Khi tạo booking mới
```typescript
paidAmount: paymentStatus === PAID ? totalPrice : 0
```
- Nếu thanh toán ngay → `paidAmount = totalPrice`
- Nếu chưa thanh toán → `paidAmount = 0`

#### B. Khi admin kéo dài thời gian
```typescript
// Price tăng từ 100k → 150k (difference = +50k)
if (chargeExtraToWallet === true) {
  // Trừ 50k từ ví
  wallet.balance -= 50k;
  paidAmount += 50k; // ✅ Update paidAmount = 150k
}
```

#### C. Khi admin rút ngắn thời gian
```typescript
// Price giảm từ 100k → 80k (difference = -20k)
// Hoàn 20k về ví
wallet.balance += 20k;
paidAmount -= 20k; // ✅ Update paidAmount = 80k
```

#### D. Khi hủy booking (Force Cancel)
```typescript
// BEFORE (SAI):
refundAmount = totalPrice * refundPercentage / 100;

// AFTER (ĐÚNG):
refundAmount = paidAmount * refundPercentage / 100; // ✅
```

### 3. Migration

```sql
-- Add column
ALTER TABLE "Booking" ADD COLUMN "paidAmount" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- Set paidAmount = totalPrice for existing paid bookings
UPDATE "Booking" 
SET "paidAmount" = "totalPrice" 
WHERE "paymentStatus" = 'PAID';
```

## 🧪 Test Scenarios

### Scenario 1: Kéo dài với charge
1. Tạo booking 1h = 100k (paid)
2. Admin kéo dài 1h → totalPrice = 150k
3. Check: `chargeExtraToWallet = true`
4. Kết quả:
   - ✅ Wallet balance giảm 50k
   - ✅ `paidAmount = 150k`
   - ✅ `totalPrice = 150k`
5. Hủy booking (100% refund)
6. Kết quả: ✅ Hoàn đúng 150k

### Scenario 2: Kéo dài KHÔNG charge (Admin free extension)
1. Tạo booking 1h = 100k (paid)
2. Admin kéo dài 1h → totalPrice = 150k
3. Check: `chargeExtraToWallet = false`
4. Kết quả:
   - ✅ Wallet balance không đổi
   - ✅ `paidAmount = 100k` (không đổi!)
   - ⚠️ `totalPrice = 150k`
5. Hủy booking (100% refund)
6. Kết quả: ✅ Hoàn đúng 100k (chỉ hoàn số tiền đã paid!)

### Scenario 3: Rút ngắn thời gian
1. Tạo booking 2h = 100k (paid)
2. Admin rút ngắn 1h → totalPrice = 50k
3. Kết quả:
   - ✅ Wallet balance tăng 50k (refund ngay)
   - ✅ `paidAmount = 50k`
   - ✅ `totalPrice = 50k`
4. Hủy booking (100% refund)
5. Kết quả: ✅ Hoàn đúng 50k

## 📊 UI Changes (Admin Modal)

**Tab "Thông tin" - Hiển thị cả 2 giá trị:**

```tsx
<div>
  <label>Giá hiện tại</label>
  <p>{totalPrice}đ</p>
  
  {paidAmount !== totalPrice && (
    <p className="warning">
      ⚠️ Đã thanh toán: {paidAmount}đ
    </p>
  )}
</div>
```

- Nếu `paidAmount === totalPrice` → Hiển thị ✅ "Đã thanh toán đủ"
- Nếu `paidAmount < totalPrice` → Hiển thị ⚠️ "Đã thanh toán: Xđ (còn thiếu Yđ)"

## 🚀 Cách test

### 1. Stop backend, regenerate Prisma Client
```bash
# Stop backend (Ctrl+C)
npx prisma generate
npm run start:dev
```

### 2. Refresh frontend
```bash
cd frontend
# Refresh browser (Ctrl+Shift+R)
```

### 3. Test workflow
1. Login as admin
2. Vào `/admin/bookings`
3. Tìm booking đã PAID
4. Click vào booking → Tab "Sửa giờ"
5. Kéo dài thời gian (+30 phút hoặc +1 giờ)
6. **QUAN TRỌNG:** Check "Trừ tiền thêm từ ví" hoặc không
7. Submit → Xem kết quả
8. Tab "Thông tin" → Check paidAmount vs totalPrice
9. Tab "Hủy booking" → Hủy với refund
10. Check wallet balance của user

## 📝 Files Changed

### Backend
- ✅ `prisma/schema.prisma` - Add `paidAmount` field
- ✅ `src/modules/bookings/bookings.service.ts`:
  - Line 155: Set paidAmount khi create
  - Line 920: Refund based on paidAmount
  - Line 1268: Force cancel refund based on paidAmount
  - Line 1331: Update paidAmount khi charge extra
  - Line 1355: Update paidAmount khi refund

### Frontend
- ✅ `frontend/src/features/admin/components/AdminBookingModal.tsx`:
  - Add `paidAmount` to Booking interface
  - Display paidAmount vs totalPrice in Info tab

### Database
- ✅ Migration `20251220080130_add_paid_amount_to_booking`
- ✅ Data migration: Set paidAmount = totalPrice for existing paid bookings

## ✅ Checklist

- [x] Schema updated
- [x] Migration created & applied
- [x] Data migration for existing bookings
- [x] Create booking logic updated
- [x] Admin update logic updated
- [x] Cancel/refund logic updated
- [x] UI shows paidAmount
- [ ] **Backend regenerate Prisma Client** ← CẦN LÀM!
- [ ] Test scenario 1 (kéo dài + charge)
- [ ] Test scenario 2 (kéo dài không charge)
- [ ] Test scenario 3 (rút ngắn)

---

## ⚠️ Breaking Changes

**KHÔNG có breaking changes!**

- Existing bookings: paidAmount được set = totalPrice nếu đã PAID
- API response thêm field `paidAmount` (backwards compatible)
- Logic cũ vẫn hoạt động bình thường
