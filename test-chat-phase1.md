# 🧪 CHAT PHASE 1 - MANUAL TEST CHECKLIST

> **Ngày test:** 31/12/2025  
> **URL Frontend:** http://localhost:5173  
> **URL Backend:** http://localhost:3000

---

## ✅ PRE-TEST SETUP

### 1. Servers Running:
- [x] Backend: `npm run start:dev` (Port 3000)
- [x] Frontend: `npm run dev` (Port 5173)
- [x] Database: PostgreSQL (Port 5433)

### 2. Test Accounts:
```
CUSTOMER:
Email: customer@test.com
Password: 123456

ADMIN (nếu cần):
Email: admin@test.com
Password: 123456
```

---

## 📋 TEST CASES - PHASE 1

### **TEST 1: Quick Action Buttons** ⚡

**Steps:**
1. Mở http://localhost:5173
2. Đăng nhập (customer@test.com / 123456)
3. Click vào chat widget (💬 ở góc phải dưới)
4. Gõ: "Tôi đã đặt sân gì?"

**Expected Result:**
```
✅ Bot trả lời với danh sách bookings
✅ Có Quick Action Buttons phía dưới message:
   [💰 Thanh toán X booking] [🏸 Đặt thêm sân] [📅 Xem sân trống]
✅ Click vào button → auto fill message và send
```

**Status:** [ ] Pass / [ ] Fail

**Screenshot location:** _____________________

**Notes:** _____________________

---

### **TEST 2: Chat History Persistence** 💾

**Steps:**
1. Trong chat widget, gõ vài câu hỏi:
   - "Giá sân bao nhiêu?"
   - "Giờ mở cửa?"
2. Đóng chat widget
3. Reload trang (F5)
4. Mở lại chat widget

**Expected Result:**
```
✅ Tất cả tin nhắn trước đó vẫn hiển thị
✅ KHÔNG hiện welcome message mặc định
✅ Có thể scroll lên xem lịch sử
```

**Status:** [ ] Pass / [ ] Fail

**Notes:** _____________________

---

### **TEST 3: Get Wallet Balance Tool** 💰

**Steps:**
1. Trong chat, gõ: "Số dư ví của tôi"
2. Hoặc: "Xem ví"
3. Hoặc: "Tôi còn bao nhiêu tiền?"

**Expected Result:**
```
✅ Bot gọi get_wallet_balance tool
✅ Hiển thị:
   💰 Số dư hiện tại: XXX,XXXđ
   📜 5 giao dịch gần nhất
✅ Quick action buttons:
   - Nếu số dư < 100k: [💳 Nạp tiền] [🏸 Đặt sân]
   - Nếu số dư >= 100k: [🏸 Đặt sân] [📅 Xem sân trống]
```

**Status:** [ ] Pass / [ ] Fail

**Test Data:**
- Số dư thực tế: _____________________
- Số giao dịch: _____________________

---

### **TEST 4: Cancel Booking Tool** 🚫

**Setup:**
```sql
-- Tạo 1 booking test để hủy
-- Chạy trong psql hoặc pgAdmin:
-- (Hoặc đặt sân mới qua UI)
```

**Steps:**
1. Gõ: "Tôi đã đặt sân gì?" (để lấy mã booking)
2. Copy mã booking (VD: COURT-ABC123)
3. Gõ: "Hủy booking COURT-ABC123"
4. Bot hiển thị xác nhận → gõ "Có" hoặc click button

**Expected Result:**
```
✅ Lần 1 (chưa confirm):
   ⚠️ Xác nhận hủy booking:
   • Mã booking: COURT-ABC123
   • Sân: Sân X
   • Ngày: DD/MM/YYYY
   • Giờ: HH:MM - HH:MM
   • Hoàn lại: XX% = XXX,XXXđ
   [Có] [Không]

✅ Lần 2 (sau khi confirm):
   ✅ Đã hủy thành công!
   💰 Hoàn lại: XXX,XXXđ
   💡 Tiền đã về ví
   [💰 Xem ví] [🏸 Đặt sân mới] [📅 Xem sân trống]
```

**Verify:**
```
□ Booking status = CANCELLED trong database
□ Wallet balance tăng đúng số tiền hoàn
□ Có WalletTransaction type=REFUND
□ Notification được gửi
```

**Status:** [ ] Pass / [ ] Fail

**Booking Code:** _____________________

**Refund Amount:** _____________________

---

### **TEST 5: Create Fixed Schedule Booking Tool** 📅

**Steps:**
1. Gõ: "Đặt lịch cố định"
2. Bot hỏi thông tin → trả lời từng câu:
   - "Sân 1"
   - "T2, T4, T6"
   - "18:00"
   - "2 giờ"
   - "Từ 01/01/2026 đến 31/03/2026"
3. Hoặc gõ 1 lần: "Đặt lịch T2-T4-T6, 18h-20h, sân 1, từ 01/01/2026 đến 31/03/2026"

**Expected Result:**
```
✅ Lần 1 (check availability):
   (Nếu có conflict)
   ⚠️ Có X ngày bị trùng lịch:
   • DD/MM/YYYY - Sân đã đặt
   [Chọn sân khác] [Điều chỉnh thời gian]

   (Nếu không conflict)
   📋 Xác nhận đặt lịch cố định:
   • Sân: Sân 1
   • Các ngày: T2, T4, T6
   • Thời gian: 18:00 (2h/buổi)
   • Từ: 01/01/2026
   • Đến: 31/03/2026
   
   💰 Chi phí:
   • Tổng số buổi: 39 buổi
   • Giá gốc: 3,900,000đ
   • Giảm giá: 10% = -390,000đ
   • Thành tiền: 3,510,000đ
   
   [Có] [Không]

✅ Lần 2 (sau confirm):
   ✅ Đặt lịch thành công!
   📋 Mã nhóm: GROUP-XX
   📅 Tổng: 39 buổi
   💰 Tổng tiền: 3,510,000đ (Giảm 10%)
   
   [💰 Thanh toán] [📋 Xem lịch] [💵 Xem ví]
```

**Verify:**
```
□ BookingGroup được tạo trong database
□ Có 39 bookings với bookingGroupId giống nhau
□ Mỗi booking có startTime đúng (T2, T4, T6)
□ Giảm giá 10% được áp dụng đúng
□ Có GROUP QR code
□ Tất cả bookings có status = PENDING_PAYMENT
```

**Status:** [ ] Pass / [ ] Fail

**Group ID:** _____________________

**Total Sessions:** _____________________

**Discount:** _____________________

---

### **TEST 6: Analytics Tracking** 📊

**Steps:**
1. Thực hiện 5-10 câu hỏi khác nhau trong chat
2. Kiểm tra database

**Database Check:**
```sql
-- Check ChatMessage table
SELECT COUNT(*) FROM "ChatMessage" 
WHERE "userId" = <your_user_id>;

-- Check ChatAnalytics table
SELECT 
  "intent", 
  "wasResolved", 
  "toolUsed", 
  "responseTime"
FROM "ChatAnalytics" 
WHERE "userId" = <your_user_id>
ORDER BY "createdAt" DESC
LIMIT 10;
```

**Expected Result:**
```
✅ Mỗi tin nhắn được lưu vào ChatMessage
✅ Mỗi query được track trong ChatAnalytics
✅ Intent được detect đúng:
   - "Đặt sân" → intent: 'booking'
   - "Hủy booking" → intent: 'cancel'
   - "Số dư ví" → intent: 'wallet'
   - "Giá sân" → intent: 'pricing'
✅ wasResolved = true khi AI trả lời được
✅ toolUsed được ghi nhận (VD: 'get_wallet_balance')
✅ responseTime > 0 (ms)
```

**Status:** [ ] Pass / [ ] Fail

**Sample Analytics Data:**
```
Query: _____________________
Intent: _____________________
Tool Used: _____________________
Response Time: _____ ms
```

---

### **TEST 7: Quick Action Button Functionality** 🖱️

**Steps:**
1. Gõ: "Xem sân trống hôm nay"
2. Bot trả lời với suggested actions
3. Click vào 1 button (VD: "🏸 Đặt sân ngay")

**Expected Result:**
```
✅ Input field được fill với text của button
✅ Message tự động được send
✅ Bot phản hồi câu hỏi mới
✅ Không cần gõ tay
```

**Status:** [ ] Pass / [ ] Fail

---

### **TEST 8: Multiple Tools in Conversation** 🔄

**Scenario:** Test conversation flow với nhiều tools

**Steps:**
1. "Số dư ví của tôi" → get_wallet_balance
2. "Còn sân nào trống?" → get_court_availability
3. "Đặt sân 1 lúc 18h ngày mai" → create_booking
4. (Copy booking code)
5. "Hủy booking COURT-XXX" → cancel_booking
6. "Số dư ví của tôi" → verify refund

**Expected Result:**
```
✅ Tất cả tools hoạt động liên tục
✅ Context được giữ qua nhiều turn
✅ Số dư ví thay đổi đúng (trừ khi đặt, cộng khi hủy)
✅ Không có lỗi hoặc crash
```

**Status:** [ ] Pass / [ ] Fail

**Notes:** _____________________

---

### **TEST 9: Chat History API Endpoint** 🌐

**Steps:**
```bash
# Get access token từ localStorage hoặc login response
# Test GET /api/chat/history

curl http://localhost:3000/api/chat/history?limit=10 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected Result:**
```json
{
  "messages": [
    {
      "id": "123",
      "content": "Xin chào!",
      "sender": "user",
      "timestamp": "2025-12-31T...",
      "suggestedActions": [],
      "bookingCard": null
    },
    {
      "id": "124",
      "content": "Chào bạn! Tôi có thể giúp gì?",
      "sender": "bot",
      "timestamp": "2025-12-31T...",
      "suggestedActions": ["🏸 Đặt sân", "📅 Xem sân trống"],
      "bookingCard": null
    }
  ]
}
```

**Status:** [ ] Pass / [ ] Fail

---

### **TEST 10: Error Handling** ⚠️

**Test cases:**

#### 10.1: Hủy booking không tồn tại
```
User: "Hủy booking INVALID-CODE"
Expected: "❌ Không tìm thấy booking..."
```

#### 10.2: Đặt lịch cố định khi không đủ tiền
```
User: (Với wallet balance = 0) "Đặt lịch T2-T4-T6..."
Expected: "💰 Số dư không đủ..."
```

#### 10.3: Xem ví khi chưa login
```
User: (Logout) "Số dư ví"
Expected: "🔒 Bạn cần đăng nhập..."
```

**Status:** [ ] Pass / [ ] Fail

---

## 📊 TEST SUMMARY

### Results:
- [ ] TEST 1: Quick Action Buttons
- [ ] TEST 2: Chat History Persistence
- [ ] TEST 3: Get Wallet Balance
- [ ] TEST 4: Cancel Booking
- [ ] TEST 5: Create Fixed Schedule
- [ ] TEST 6: Analytics Tracking
- [ ] TEST 7: Button Functionality
- [ ] TEST 8: Multiple Tools
- [ ] TEST 9: History API
- [ ] TEST 10: Error Handling

### Overall Status:
- **Passed:** __ / 10
- **Failed:** __ / 10
- **Success Rate:** __%

### Critical Issues Found:
1. _____________________
2. _____________________

### Minor Issues:
1. _____________________
2. _____________________

---

## 🐛 BUG REPORT TEMPLATE

**Bug #1:**
```
Title: _____________________
Severity: Critical / Major / Minor
Steps to Reproduce:
1. 
2. 
3. 

Expected: _____________________
Actual: _____________________

Error Message (if any):
_____________________

Screenshot: _____________________
```

---

## ✅ SIGN-OFF

**Tested by:** _____________________  
**Date:** 31/12/2025  
**Environment:** Development (localhost)  
**Status:** [ ] Ready for Production / [ ] Needs Fixes

**Approver Signature:** _____________________
