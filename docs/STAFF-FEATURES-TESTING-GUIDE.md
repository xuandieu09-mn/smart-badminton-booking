# Quick Testing Guide - Staff Features

## ✅ Step-by-Step Testing

### Prerequisites
```bash
# 1. Backend MUST restart to load new Prisma client
# Stop current backend (Ctrl+C in terminal)
# Then:
npm run start:dev

# 2. Frontend already running at http://localhost:5173
```

---

## 🏸 Test 1: Staff Courts Page (Walk-in Booking)

### Access
1. Navigate to: http://localhost:5173/staff/courts
2. Login as STAFF user if not logged in

### Test Flow
```
1. ✅ Date Selection
   - Click "Hôm nay" button
   - Try selecting "Ngày mai"
   - Use date picker to select specific date

2. ✅ Slot Selection
   - Click an empty slot (e.g., 10:00-10:30 on Court 1)
   - Slot should highlight in blue
   - Click another slot on same court → consecutive
   - Click slot on different court → multi-court booking
   - Click selected slot again → deselect (toggle)

3. ✅ Booking Summary
   - Bottom panel shows:
     ✅ Number of slots selected
     ✅ Number of courts involved
     ✅ Total price calculation
     ✅ Time ranges per court

4. ✅ Guest Form
   - Click "👤 Nhập thông tin khách"
   - Modal appears with:
     ✅ Guest name input
     ✅ Phone number input (10-11 digits)
     ✅ Payment method: CASH (fixed)

5. ✅ Submit Booking
   - Enter name: "Nguyễn Văn Test"
   - Enter phone: "0901234567"
   - Click "✅ Xác nhận đặt sân"
   - Success alert shows booking codes
   - Slots appear as booked on calendar

6. ✅ Verify Database
   ```sql
   SELECT * FROM "Booking" WHERE "guestName" = 'Nguyễn Văn Test';
   -- Check: userId = NULL, status = CONFIRMED, paymentMethod = CASH
   ```
```

---

## 🛒 Test 2: POS System (Product Sales)

### Access
1. Navigate to: http://localhost:5173/staff/pos
2. Login as STAFF user if not logged in

### Test Flow
```
1. ✅ Product Display
   - See 15 products seeded
   - Products grouped by category badges:
     🏸 SHUTTLECOCK (yellow)
     🥤 BEVERAGE (blue)
     🎾 ACCESSORY (purple)
     ⚡ EQUIPMENT (green)
     📦 OTHER (gray)

2. ✅ Category Filter
   - Click "🏸 Ống cầu" → only shuttlecocks
   - Click "🥤 Nước uống" → only beverages
   - Click "Tất cả" → show all

3. ✅ Search
   - Type "Yonex" → shows Yonex products
   - Type "nước" → shows drinks
   - Clear search → show all

4. ✅ Add to Cart
   - Click "Yonex AS-50" (180,000đ)
   - Cart shows: 1 item
   - Click "Red Bull" (15,000đ)
   - Cart shows: 2 items

5. ✅ Quantity Controls
   - In cart, click + button on Red Bull
   - Quantity: 1 → 2
   - Subtotal updates: 15,000đ → 30,000đ
   - Click - button → quantity decreases
   - Manual input: type "3" in quantity box

6. ✅ Remove Item
   - Click × button on any cart item
   - Item removed from cart
   - Total price recalculates

7. ✅ Stock Validation
   - Try adding 100 units of a product (stock = 50)
   - Alert: "Không đủ hàng! Tồn kho: 50"

8. ✅ Checkout
   - Cart has 2 items:
     - Yonex AS-50 (180,000đ x 1)
     - Red Bull (15,000đ x 2)
   - Enter customer name: "Trần Văn Test"
   - Click "✅ Thanh toán"
   - Success alert shows:
     ✅ Sale code (e.g., POS241216-AB12)
     ✅ Total: 210,000đ
   - Cart clears automatically

9. ✅ Verify Database
   ```sql
   -- Check sale created
   SELECT * FROM "Sale" WHERE "customerName" = 'Trần Văn Test';
   
   -- Check items
   SELECT si.*, p.name 
   FROM "SaleItem" si 
   JOIN "Product" p ON si."productId" = p.id 
   WHERE si."saleId" = (last sale id);
   
   -- Check stock deducted
   SELECT name, stock FROM "Product" WHERE name IN ('Yonex AS-50', 'Nước tăng lực Red Bull');
   -- Yonex: 50 → 49
   -- Red Bull: 50 → 48
   ```
```

---

## 🔧 Troubleshooting

### Issue 1: Backend Error "Cannot find module Prisma Client"
```bash
# Solution: Regenerate Prisma Client
npx prisma generate

# Then restart backend
npm run start:dev
```

### Issue 2: Products Not Loading
```bash
# Check if products were seeded
npx ts-node prisma/scripts/seed-products.ts

# Verify in database
psql -U postgres -d badminton_booking
SELECT COUNT(*) FROM "Product";
-- Should return: 15
```

### Issue 3: "Unauthorized" Error
```bash
# Login again with STAFF account
# Or check JWT token in browser localStorage
```

### Issue 4: Slot Already Booked
```bash
# Clear test bookings
psql -U postgres -d badminton_booking
DELETE FROM "Booking" WHERE "guestName" LIKE '%Test%';
```

---

## 📊 Test Data Summary

### Products (15 total)
| Category | Count | Example |
|----------|-------|---------|
| SHUTTLECOCK | 3 | Yonex AS-50 (180k) |
| BEVERAGE | 4 | Red Bull (15k) |
| ACCESSORY | 4 | Quấn cán (40k) |
| EQUIPMENT | 2 | Vợt (800k) |
| OTHER | 2 | Khăn (30k) |

### Courts (Example)
- Court 1: 50,000đ/hour
- Court 2: 50,000đ/hour
- Court 3: 60,000đ/hour

### Staff Account
```
Email: staff@example.com
Password: (your password)
Role: STAFF
```

---

## ✅ Expected Results

### Staff Courts Page
- [x] Calendar displays all courts and time slots
- [x] Multi-court cross-booking works
- [x] Guest booking creates CONFIRMED status
- [x] No payment waiting (instant confirmation)
- [x] Real-time conflict detection
- [x] Consecutive slots merge into single booking

### POS System
- [x] All 15 products display correctly
- [x] Category filters work
- [x] Search works
- [x] Cart adds/removes items correctly
- [x] Quantity controls work
- [x] Stock validation prevents overselling
- [x] Checkout creates Sale + SaleItems
- [x] Stock deducts after sale
- [x] Cart clears after successful checkout

---

## 🎯 Success Criteria

### For Staff Courts Page
✅ Walk-in customers can be booked without accounts  
✅ Bookings appear on calendar immediately  
✅ Status = CONFIRMED (no payment wait)  
✅ guestName and guestPhone recorded  

### For POS System
✅ Staff can sell products quickly  
✅ Stock deducts automatically  
✅ Sale records audit trail  
✅ Customer name tracked for receipts  

---

## 📝 Next Steps

After successful testing:
1. ✅ Deploy to staging environment
2. ✅ Train staff on new features
3. ✅ Monitor sales data for first week
4. 🚀 Proceed to AI features development

---

**Test Date**: December 16, 2025  
**Tester**: Staff Member  
**Status**: ⏳ Ready for Testing
