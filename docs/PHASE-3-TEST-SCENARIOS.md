# 🧪 Phase 3 Function Calling - Test Scenarios

## 📅 Test Date: December 22, 2025

**Servers:**
- ✅ Backend: http://localhost:3000
- ✅ Frontend: http://localhost:5173
- ⚠️ Gemini API: Quota exceeded (testing in FALLBACK mode)

---

## 🎯 TEST OBJECTIVES

Phase 3 added 5 major enhancements:
1. **Confirmation Dialog** for `create_booking`
2. **Enhanced Error Messages** (8 types)
3. **Suggested Actions** (all 4 functions)
4. **Optimized AI Descriptions**
5. **Comprehensive Validation** (6 rules)

---

## 📋 TEST SCENARIOS

### ✅ SCENARIO 1: Booking Confirmation Flow

**Goal:** Test 2-step confirmation for booking

**Steps:**
1. Login as customer (email: `customer@test.com`, password: `password123`)
2. Open chat widget
3. Type: `đặt sân 1 lúc 18h ngày mai 2 tiếng`
4. **Expected:** AI shows confirmation dialog with:
   - Court: Sân 1
   - Date: Tomorrow's date
   - Time: 18:00 - 20:00
   - Duration: 2 giờ
   - Price: 200,000đ (giờ cao điểm)
   - Message: "Bạn có chắc chắn muốn đặt sân này không?"
5. Type: `Có, đồng ý`
6. **Expected:** Booking executes successfully
   - Success message with booking code
   - Suggested actions: "Thanh toán ngay", "Xem menu", "Xem lịch"

**Test Commands:**
```bash
# Step 1: Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"customer@test.com\",\"password\":\"password123\"}"

# Save the access_token from response

# Step 2: Test chat (without confirmation)
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d "{\"message\":\"đặt sân 1 lúc 18h ngày mai 2 tiếng\"}"

# Step 3: Test chat (with confirmation)
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d "{\"message\":\"Có, đồng ý đặt sân\"}"
```

**Success Criteria:**
- ✅ Step 1 shows confirmation (NOT booking yet)
- ✅ Price calculated correctly (peak hour)
- ✅ Step 2 executes booking after "Có"
- ✅ Suggested actions displayed
- ✅ Booking saved to database

---

### ✅ SCENARIO 2: Error Message - Not Logged In

**Goal:** Test enhanced error for unauthenticated booking

**Steps:**
1. Open chat WITHOUT login
2. Type: `đặt sân 1 lúc 18h`
3. **Expected Error:**
   ```
   🔒 **Bạn cần đăng nhập để đặt sân**
   
   💡 Vui lòng đăng nhập hoặc đăng ký tài khoản để sử dụng tính năng này.
   ```

**Test Command:**
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"đặt sân 1 lúc 18h ngày mai\"}"
```

**Success Criteria:**
- ✅ Error message with 🔒 emoji
- ✅ Markdown formatting
- ✅ Clear suggestion to login

---

### ✅ SCENARIO 3: Error Message - Invalid Court

**Goal:** Test validation for court ID

**Steps:**
1. Login as customer
2. Type: `đặt sân 10 lúc 18h ngày mai`
3. **Expected Error:**
   ```
   🏸 **Số sân không hợp lệ**
   
   ✅ Sân khả dụng: **Sân 1, 2, 3, 4, 5**
   
   💡 Vui lòng chọn số sân từ 1 đến 5.
   ```

**Test Command:**
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d "{\"message\":\"đặt sân 10 lúc 18h ngày mai\"}"
```

**Success Criteria:**
- ✅ Court range validation works
- ✅ Clear error with valid range
- ✅ Actionable suggestion

---

### ✅ SCENARIO 4: Error Message - Invalid Duration

**Goal:** Test duration validation

**Steps:**
1. Login as customer
2. Type: `đặt sân 1 lúc 18h ngày mai 12 tiếng`
3. **Expected Error:**
   ```
   ⏱️ **Thời lượng không hợp lệ**
   
   ✅ Thời lượng đặt sân: **1-8 giờ**
   
   💡 Vui lòng chọn thời lượng từ 1 đến 8 giờ.
   ```

**Success Criteria:**
- ✅ Duration validation (1-8 hours)
- ✅ Clear constraint explanation
- ✅ Helpful suggestion

---

### ✅ SCENARIO 5: Error Message - Past Booking

**Goal:** Test past time validation

**Steps:**
1. Login as customer
2. Type: `đặt sân 1 lúc 8h sáng nay` (assuming it's past 8 AM)
3. **Expected Error:**
   ```
   ⏰ **Không thể đặt sân trong quá khứ**
   
   💡 Vui lòng chọn thời gian trong tương lai.
   ```

**Success Criteria:**
- ✅ Past time rejected
- ✅ Clear temporal constraint
- ✅ Helpful suggestion

---

### ✅ SCENARIO 6: Error Message - Outside Operating Hours

**Goal:** Test operating hours validation

**Steps:**
1. Login as customer
2. Type: `đặt sân 1 lúc 4h sáng ngày mai`
3. **Expected Error:**
   ```
   🕐 **Ngoài giờ hoạt động**
   
   ⏰ Sân mở cửa: **6:00 - 21:00** hàng ngày.
   
   💡 Vui lòng chọn giờ trong khung giờ hoạt động.
   ```

**Success Criteria:**
- ✅ Operating hours enforced (6-21h)
- ✅ Clear business hours shown
- ✅ Helpful suggestion

---

### ✅ SCENARIO 7: Suggested Actions - After Product Search

**Goal:** Test suggested actions for `get_pos_products`

**Steps:**
1. Type: `có nước gì?`
2. **Expected Response:**
   - Product list (Revive, Aquafina, Sting, Coca, Red Bull)
   - **Suggested Actions:**
     - 🏸 Đặt sân để chơi
     - 📅 Xem lịch sân trống hôm nay
     - 📦 Xem thêm sản phẩm khác

**Test Command:**
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"có nước gì?\"}"
```

**Success Criteria:**
- ✅ Products shown
- ✅ 3 suggested actions displayed
- ✅ Actions relevant to context

---

### ✅ SCENARIO 8: Suggested Actions - After Successful Booking

**Goal:** Test suggested actions after booking

**Steps:**
1. Login and complete booking (Scenario 1)
2. **Expected Response:**
   - Booking success message
   - **Suggested Actions:**
     - 💰 Thanh toán ngay để xác nhận booking
     - 🥤 Xem menu đồ uống và sản phẩm
     - 📋 Xem tất cả lịch đặt sân của bạn

**Success Criteria:**
- ✅ Booking confirmed
- ✅ 3 suggested actions displayed
- ✅ Payment reminder shown

---

### ✅ SCENARIO 9: Suggested Actions - Court Availability (Empty)

**Goal:** Test suggested actions when courts available

**Steps:**
1. Type: `tối nay còn sân không?`
2. **Expected Response:**
   - List of available slots
   - **Suggested Actions (if courts available):**
     - 🏸 Đặt sân ngay (nếu đã đăng nhập)
     - 📅 Xem sân trống ngày khác
     - 🥤 Xem menu đồ uống

**Test Command:**
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"tối nay còn sân không?\"}"
```

**Success Criteria:**
- ✅ Availability shown
- ✅ Suggested actions match context
- ✅ "Đặt sân ngay" if logged in

---

### ✅ SCENARIO 10: Suggested Actions - Court Availability (Full)

**Goal:** Test suggested actions when courts full

**Steps:**
1. Type: `ngày 25/12 còn sân không?` (assuming fully booked)
2. **Expected Response:**
   - "Tất cả khung giờ đã đầy"
   - **Suggested Actions (if all full):**
     - 📅 Xem sân trống ngày mai
     - 📋 Xem lịch đặt của bạn
     - 🥤 Xem menu đồ uống

**Success Criteria:**
- ✅ Full status shown
- ✅ Alternative suggestions provided
- ✅ No "book now" action when full

---

### ✅ SCENARIO 11: Suggested Actions - User Bookings (With Unpaid)

**Goal:** Test suggested actions for unpaid bookings

**Steps:**
1. Login as customer with unpaid bookings
2. Type: `tôi đã đặt sân nào?`
3. **Expected Response:**
   - List of bookings
   - **Suggested Actions (if has unpaid):**
     - 💰 Thanh toán X booking chưa thanh toán
     - 🏸 Đặt thêm sân mới
     - 📅 Xem sân trống

**Test Command:**
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d "{\"message\":\"tôi đã đặt gì?\"}"
```

**Success Criteria:**
- ✅ Bookings listed
- ✅ Payment reminder if unpaid
- ✅ Count of unpaid bookings shown

---

### ✅ SCENARIO 12: Suggested Actions - User Bookings (All Paid)

**Goal:** Test suggested actions when all paid

**Steps:**
1. Login as customer with all paid bookings
2. Type: `xem lịch của tôi`
3. **Expected Response:**
   - List of bookings
   - **Suggested Actions (if all paid):**
     - 🏸 Đặt thêm sân mới
     - 📅 Xem sân trống hôm nay
     - 🥤 Xem menu đồ uống

**Success Criteria:**
- ✅ Bookings listed
- ✅ No payment reminder
- ✅ Encouragement to book more

---

### ✅ SCENARIO 13: Optimized AI - Correct Function Call

**Goal:** Test AI calls correct function

**Test Cases:**

| User Input | Expected Function | Reason |
|------------|------------------|--------|
| "có nước gì?" | `get_pos_products` | Product query |
| "giá sân bao nhiêu?" | FALLBACK | Price info (not function) |
| "còn sân không?" | `get_court_availability` | Availability query |
| "đặt sân 1" | `create_booking` | Booking request |
| "tôi đã đặt gì?" | `get_user_bookings` | User's bookings |

**Success Criteria:**
- ✅ Product questions → `get_pos_products`
- ✅ Price questions → Fallback (NOT function)
- ✅ Availability questions → `get_court_availability`
- ✅ Booking requests → `create_booking`
- ✅ User bookings → `get_user_bookings`

---

### ✅ SCENARIO 14: Optimized AI - Avoid Wrong Function

**Goal:** Test AI does NOT call function incorrectly

**Test Cases:**

| User Input | Should NOT Call | Correct Behavior |
|------------|----------------|------------------|
| "giá sân bao nhiêu?" | `get_pos_products` | Use fallback |
| "hello" | Any function | Use fallback greeting |
| "bạn là ai?" | Any function | Use fallback intro |

**Success Criteria:**
- ✅ Price questions use fallback (NOT get_pos_products)
- ✅ Greetings use fallback (NOT functions)
- ✅ Off-topic uses fallback (NOT functions)

---

## 🎨 FRONTEND UI TESTING

### Visual Checks:

1. **Confirmation Dialog:**
   - ✅ Markdown renders properly
   - ✅ Bold text for important info
   - ✅ Emoji icons display
   - ✅ Call-to-action clear

2. **Error Messages:**
   - ✅ Red/warning color
   - ✅ Emoji visible
   - ✅ Multi-line formatting preserved
   - ✅ Suggestions readable

3. **Suggested Actions:**
   - ✅ Displayed as clickable list (if UI supports)
   - ✅ Emoji icons visible
   - ✅ Clear action text

4. **Product Lists:**
   - ✅ Table formatting (if markdown supports)
   - ✅ Prices formatted correctly
   - ✅ Stock status visible

---

## 📊 TEST RESULTS TEMPLATE

### Scenario 1: Booking Confirmation
- [ ] Confirmation dialog shown
- [ ] Price calculated correctly
- [ ] User confirms → booking executes
- [ ] Suggested actions displayed
- [ ] Database updated

### Scenario 2-6: Error Messages
- [ ] Not logged in → Clear error
- [ ] Invalid court → Range shown
- [ ] Invalid duration → Limit shown
- [ ] Past booking → Temporal error
- [ ] Outside hours → Business hours shown

### Scenario 7-12: Suggested Actions
- [ ] After products → 3 actions
- [ ] After booking → Payment reminder
- [ ] Availability (empty) → Book now
- [ ] Availability (full) → Alternatives
- [ ] Unpaid bookings → Payment reminder
- [ ] All paid → Book more

### Scenario 13-14: AI Optimization
- [ ] Correct function calls
- [ ] Avoids wrong function calls
- [ ] Fallback when appropriate

---

## 🐛 KNOWN ISSUES

1. **Gemini API Quota Exceeded**
   - Status: Expected (testing in fallback mode)
   - Impact: Function calling NOT tested (AI not available)
   - Workaround: Test fallback patterns instead

2. **Confirmation Flow in Fallback Mode**
   - Status: Cannot test (requires AI)
   - Impact: Two-step confirmation needs AI to parse "Có"
   - Workaround: Wait for quota reset or test manually

---

## ✅ QUICK TEST COMMANDS

### Test Backend Health:
```bash
curl http://localhost:3000/api
```

### Test Chat Status:
```bash
curl http://localhost:3000/api/chat/status
```

### Test Fallback (No Auth):
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"xin chào\"}"
```

### Test Fallback - Price:
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"giá sân bao nhiêu?\"}"
```

### Test Fallback - Hours:
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"mấy giờ mở cửa?\"}"
```

---

## 📝 MANUAL TESTING CHECKLIST

### Browser Testing (http://localhost:5173):

1. **Open Chat Widget:**
   - [ ] Chat icon visible
   - [ ] Click opens chat
   - [ ] Markdown renders

2. **Test Greetings:**
   - [ ] Type: "xin chào"
   - [ ] Response has emoji
   - [ ] Markdown bold/bullets work

3. **Test Products:**
   - [ ] Type: "có nước gì?"
   - [ ] Product list shows
   - [ ] Prices formatted
   - [ ] Suggested actions visible

4. **Test Pricing:**
   - [ ] Type: "giá sân bao nhiêu?"
   - [ ] Price table shows
   - [ ] 50k/100k clear
   - [ ] Hours noted

5. **Test Visual Quality:**
   - [ ] Loading animation
   - [ ] Message bubbles
   - [ ] Scroll works
   - [ ] Mobile responsive

---

## 🎯 SUCCESS METRICS

### Phase 3 Goals:

| Metric | Target | Status |
|--------|--------|--------|
| **Confirmation dialog** | Working | 🟡 Pending AI |
| **Error messages (8 types)** | Enhanced | ✅ Ready |
| **Suggested actions (all 4)** | Added | ✅ Ready |
| **Optimized descriptions** | Updated | ✅ Complete |
| **Validation (6 rules)** | Implemented | ✅ Complete |
| **Build successful** | Yes | ✅ Pass |
| **Frontend renders** | Yes | ✅ Pass |

---

## 🚀 NEXT STEPS

1. **Wait for Gemini Quota Reset** (tomorrow)
2. **Test AI function calling** with real quota
3. **Test confirmation flow** end-to-end
4. **Gather user feedback** on UI/UX
5. **Monitor suggested actions** usage

---

_Test scenarios created: December 22, 2025_
_Servers: Backend (3000), Frontend (5173)_
_AI Status: Quota exceeded (fallback mode)_
