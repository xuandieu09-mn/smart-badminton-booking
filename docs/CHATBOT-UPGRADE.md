# 🤖 SmartCourt AI Chatbot - Nâng Cấp Hoàn Chỉnh

## 📅 Ngày cập nhật: 21/12/2025

---

## 🎯 Vấn đề trước đây

Chatbot phiên bản cũ có 3 hạn chế lớn:

1. ❌ **Dùng Mock Data** - Không kết nối database thực
2. ❌ **Chỉ 2 tools** - Thiếu tính năng xem sân trống, lịch đặt
3. ❌ **Xử lý câu hỏi ngoài chủ đề kém** - Không có fallback thông minh

### Các câu hỏi KHÔNG trả lời được:

```
❌ "POS có gì, giá bao nhiêu?"           → Mock data không chính xác
❌ "Tối nay còn sân không?"              → Không có tool kiểm tra
❌ "Khi nào có sân trống?"               → Không có tool kiểm tra
❌ "Tôi đã đặt sân nào?"                 → Không có tool xem lịch
❌ "Bạn biết nấu ăn không?"              → Không xử lý câu hỏi ngoài chủ đề
```

---

## ✨ Nâng Cấp Hoàn Chỉnh

### 1. 🔌 Kết nối Database Thực

**Trước:**
```typescript
// Mock data cứng
const MOCK_PRODUCTS = [
  { name: 'Nước Revive', price: 15000, stock: 20 },
  // ...
];
```

**Sau:**
```typescript
// Inject services thực
constructor(
  private readonly prisma: PrismaService,
  private readonly productsService: ProductsService,
  private readonly bookingsService: BookingsService,
) {}

// Query database thực
const products = await this.productsService.getAllProducts();
const courts = await this.prisma.court.findMany({ where: { isActive: true } });
```

### 2. 🛠️ Tăng từ 2 → 4 Tools

| # | Tool | Chức năng | Ví dụ câu hỏi |
|---|------|-----------|---------------|
| 1️⃣ | `get_pos_products` | Tra cứu sản phẩm POS từ DB | "có nước gì?", "menu đồ uống", "vợt bao nhiêu?" |
| 2️⃣ | `create_booking` | Đặt sân thực (DB) | "đặt sân 1 lúc 18h ngày mai" |
| 3️⃣ | `get_court_availability` | Kiểm tra sân trống theo ngày | "tối nay còn sân không?", "ngày mai sân nào trống?" |
| 4️⃣ | `get_user_bookings` | Xem lịch đặt của user | "tôi đã đặt gì?", "xem lịch của tôi" |

### 3. 🧠 System Instruction Thông Minh Hơn

**Trước:**
- 45 dòng, chỉ hướng dẫn cơ bản
- Không có quy tắc xử lý câu hỏi ngoài chủ đề

**Sau:**
- 70+ dòng, chi tiết đầy đủ
- Có ví dụ cụ thể cho từng loại câu hỏi
- Quy tắc từ chối lịch sự câu hỏi ngoài phạm vi
- Hướng dẫn format Markdown cho response đẹp

```typescript
const SYSTEM_INSTRUCTION = `
🛠️ CÔNG CỤ CÓ SẴN (4 Tools):
1. get_pos_products - Xem sản phẩm
2. create_booking - Đặt sân
3. get_court_availability - Kiểm tra sân trống
4. get_user_bookings - Xem lịch đặt

📋 QUY TẮC:
...
⚠️ Nếu câu hỏi ngoài chủ đề → Lịch sự từ chối, hướng về dịch vụ sân

💬 VÍ DỤ:
👤 "bạn biết nấu ăn không?"
🤖 → "Mình là AI chuyên về đặt sân cầu lông, không hỗ trợ nấu ăn ạ 😊"
`;
```

### 4. 💬 Fallback Response Nâng Cao

**Tăng từ 5 → 8 patterns:**

| Pattern | Ví dụ | Response |
|---------|-------|----------|
| Chào hỏi | "hello", "xin chào" | Giới thiệu 4 tính năng chính |
| POS/Menu | "có nước gì", "menu" | Hướng dẫn tra cứu sản phẩm |
| Sân trống | "còn sân không", "tối nay" | Hướng dẫn kiểm tra availability |
| Đặt sân | "book", "đặt sân" | Liệt kê 4 thông tin cần thiết |
| Giá | "bao nhiêu", "price" | Bảng giá chi tiết |
| Lịch đặt | "tôi đã đặt gì" | Yêu cầu đăng nhập |
| **Ngoài chủ đề** | "nấu ăn", "thời tiết" | ✨ **Từ chối lịch sự, hướng về dịch vụ** |
| Default | Các câu khác | Tổng hợp 5 tính năng chính |

---

## 🔧 Chi Tiết Kỹ Thuật

### A. Function Handlers - Database Thực

#### 1️⃣ `handleGetPosProducts` - Tra cứu sản phẩm

```typescript
private async handleGetPosProducts(args: { keyword?: string; category?: string }) {
  // Query database thực
  let products = await this.productsService.getAllProducts(args.category);
  
  // Filter by keyword
  if (args.keyword) {
    products = products.filter(p => 
      p.name.toLowerCase().includes(keyword)
    );
  }
  
  return {
    success: true,
    message: `Tìm thấy ${products.length} sản phẩm`,
    products: products.map(p => ({
      name: p.name,
      price: Number(p.price),
      priceFormatted: `${Number(p.price).toLocaleString('vi-VN')}đ`,
      stock: p.stock,
      inStock: p.stock > 0,
    })),
  };
}
```

**Test:**
```bash
User: "có nước gì?"
→ AI gọi get_pos_products()
→ Query database → Trả về danh sách thực
→ AI format đẹp với Markdown
```

#### 2️⃣ `handleCreateBooking` - Đặt sân thực

```typescript
private async handleCreateBooking(args, userId) {
  // Parse date/time
  const startDateTime = new Date(year, month - 1, day, hour, minute);
  const endDateTime = new Date(startDateTime);
  endDateTime.setHours(endDateTime.getHours() + args.duration);
  
  // Validate
  if (startDateTime < new Date()) {
    return { success: false, error: 'Không thể đặt sân trong quá khứ' };
  }
  
  // Create booking in DB
  const result = await this.bookingsService.createBooking({
    courtId: args.courtId,
    startTime: startDateTime.toISOString(),
    endTime: endDateTime.toISOString(),
    type: BookingType.REGULAR,
    paymentMethod: PaymentMethod.WALLET,
  }, userId, Role.CUSTOMER);
  
  return {
    success: true,
    booking: {
      bookingCode: result.booking.bookingCode,
      courtName: result.booking.court?.name,
      totalPrice: `${Number(result.booking.totalPrice).toLocaleString('vi-VN')}đ`,
      status: result.booking.status,
    },
  };
}
```

**Test:**
```bash
User: "đặt sân 1 lúc 18h ngày mai 2 tiếng"
→ AI parse: { courtId: 1, date: "2025-12-22", time: "18:00", duration: 2 }
→ Tạo booking thực trong DB
→ Trả về mã booking #BK123456
```

#### 3️⃣ `handleGetCourtAvailability` - Xem sân trống

```typescript
private async handleGetCourtAvailability(args: { date?: string }) {
  const targetDate = args.date ? new Date(args.date) : new Date();
  
  // Get all courts
  const courts = await this.prisma.court.findMany({ where: { isActive: true } });
  
  // Get bookings for the date
  const bookings = await this.prisma.booking.findMany({
    where: {
      startTime: { gte: startOfDay },
      endTime: { lte: endOfDay },
      status: { in: ['PENDING_PAYMENT', 'CONFIRMED', 'CHECKED_IN'] },
    },
  });
  
  // Build availability map by hour
  const bookingMap = new Map<string, Set<number>>();
  bookings.forEach(booking => {
    // Map courtId to each hour slot
  });
  
  // Generate slots
  for (let hour = 6; hour < 22; hour++) {
    const bookedCourtIds = bookingMap.get(`${hour}`) || new Set();
    const availableCourts = courts.filter(c => !bookedCourtIds.has(c.id));
    
    slots.push({
      time: `${hour}:00 - ${hour + 1}:00`,
      availableCourts: availableCourts.map(c => ({
        id: c.id,
        name: c.name,
        price: `${Number(c.pricePerHour).toLocaleString('vi-VN')}đ/giờ`,
      })),
      totalAvailable: availableCourts.length,
      isFull: availableCourts.length === 0,
    });
  }
  
  return { success: true, availability: slots };
}
```

**Test:**
```bash
User: "tối nay còn sân không?"
→ AI gọi get_court_availability({ date: "2025-12-21" })
→ Query DB: courts + bookings
→ Tính toán slots trống
→ Trả về:
  18:00-19:00: Sân 1, 2 (trống) - Sân 3 (đã đặt)
  19:00-20:00: Sân 1, 2, 3 (trống)
```

#### 4️⃣ `handleGetUserBookings` - Xem lịch đặt

```typescript
private async handleGetUserBookings(args, userId) {
  if (!userId) {
    return { success: false, error: 'Bạn cần đăng nhập để xem lịch đặt sân' };
  }
  
  const whereClause: any = {
    userId,
    startTime: { gte: new Date() }, // Only future bookings
  };
  
  if (args.status && args.status !== 'ALL') {
    whereClause.status = args.status;
  }
  
  const bookings = await this.prisma.booking.findMany({
    where: whereClause,
    include: { court: { select: { name: true } } },
    orderBy: { startTime: 'asc' },
    take: 10,
  });
  
  return {
    success: true,
    message: `Bạn có ${bookings.length} lịch đặt sân`,
    bookings: bookings.map(b => ({
      bookingCode: b.bookingCode,
      courtName: b.court?.name,
      date: new Date(b.startTime).toLocaleDateString('vi-VN'),
      time: `${formatTime(b.startTime)} - ${formatTime(b.endTime)}`,
      status: b.status,
      totalPrice: `${Number(b.totalPrice).toLocaleString('vi-VN')}đ`,
    })),
  };
}
```

**Test:**
```bash
User (logged in): "tôi đã đặt sân nào?"
→ AI gọi get_user_bookings()
→ Query DB: bookings where userId = X
→ Trả về danh sách:
  #BK001 - Sân 1 - 22/12/2025 18:00-20:00 - CONFIRMED
  #BK002 - Sân 2 - 23/12/2025 19:00-21:00 - PENDING_PAYMENT
```

### B. Function Calling Loop - Max 5 iterations

```typescript
async generateResponse(message: string, userId?: number | null): Promise<string> {
  const chat = this.model.startChat({ history: [] });
  let result = await chat.sendMessage(message);
  let response = result.response;
  
  let iteration = 0;
  const maxIterations = 5; // Tăng từ 3 → 5
  
  while (iteration < maxIterations) {
    const functionCalls = response.functionCalls();
    
    if (!functionCalls || functionCalls.length === 0) {
      return response.text(); // Done
    }
    
    // Execute all function calls
    const functionResponses: Part[] = [];
    for (const fc of functionCalls) {
      const funcResult = await this.executeFunction(fc, userId || null);
      functionResponses.push({
        functionResponse: {
          name: fc.name,
          response: JSON.parse(funcResult),
        },
      });
    }
    
    // Send function results back to AI
    result = await chat.sendMessage(functionResponses);
    response = result.response;
    iteration++;
  }
  
  return response.text();
}
```

---

## 📊 So Sánh Trước/Sau

| Tiêu chí | Trước | Sau |
|----------|-------|-----|
| **Kết nối DB** | ❌ Mock data | ✅ Database thực |
| **Số tools** | 2 tools | 4 tools |
| **Xem sân trống** | ❌ Không có | ✅ Có (realtime) |
| **Xem lịch đặt** | ❌ Không có | ✅ Có (theo user) |
| **POS products** | ❌ Fake data | ✅ Query DB thực |
| **System Instruction** | 45 dòng | 70+ dòng |
| **Fallback patterns** | 5 patterns | 8 patterns |
| **Xử lý ngoài chủ đề** | ❌ Không có | ✅ Từ chối lịch sự |
| **Max iterations** | 3 | 5 |
| **Code lines** | ~280 | ~756 |

---

## 🎬 Ví Dụ Hoạt Động

### Kịch bản 1: Tra cứu POS

```
👤: "có nước gì?"

🤖 AI:
  1. Nhận message
  2. Gọi get_pos_products()
  3. Query DB: SELECT * FROM products WHERE category = 'DRINK'
  4. Nhận kết quả: 5 sản phẩm
  5. Format response:

📦 **Danh sách nước uống tại SmartCourt:**

• **Nước Revive** - **15.000đ** (Còn 20 chai)
• **Aquafina** - **10.000đ** (Còn 30 chai)
• **Sting Dâu** - **12.000đ** (Còn 25 chai)
• **Coca Cola** - **15.000đ** (Còn 20 lon)
• **Red Bull** - **20.000đ** (Còn 15 lon)

Bạn muốn gọi món nào? 🏸
```

### Kịch bản 2: Kiểm tra sân trống

```
👤: "tối nay 18h còn sân không?"

🤖 AI:
  1. Nhận message
  2. Parse: ngày hôm nay (21/12/2025), giờ 18h
  3. Gọi get_court_availability({ date: "2025-12-21" })
  4. Query DB:
     - Courts: 3 sân
     - Bookings: 2 bookings (18h-19h: Sân 3 đã đặt)
  5. Tính toán slots
  6. Format response:

🏸 **Sân trống tối nay 18:00-19:00:**

✅ **Sân 1** - Giá: **120.000đ/giờ** (giờ cao điểm)
✅ **Sân 2** - Giá: **120.000đ/giờ** (giờ cao điểm)
❌ **Sân 3** - Đã được đặt

📅 Bạn muốn đặt sân nào? (Nếu đã đăng nhập, tôi có thể đặt ngay!) 🏸
```

### Kịch bản 3: Đặt sân

```
👤: "đặt sân 1 lúc 18h ngày mai 2 tiếng"

🤖 AI:
  1. Nhận message
  2. Parse: courtId=1, date="2025-12-22", time="18:00", duration=2
  3. Gọi create_booking({ courtId: 1, date: "2025-12-22", time: "18:00", duration: 2 })
  4. BookingsService.createBooking() → Insert DB
  5. Nhận kết quả: booking #BK123456, totalPrice: 240.000đ
  6. Format response:

✅ **Đặt sân thành công!**

📋 **Thông tin booking:**
• Mã đặt sân: **#BK123456**
• Sân: **Sân 1**
• Ngày: **22/12/2025**
• Giờ: **18:00 - 20:00** (2 tiếng)
• Tổng tiền: **240.000đ**
• Trạng thái: **PENDING_PAYMENT**

💡 Vui lòng thanh toán để xác nhận booking. Bạn có thể thanh toán qua Ví hoặc VNPay. 🏸
```

### Kịch bản 4: Xem lịch đặt

```
👤 (đã đăng nhập): "tôi đã đặt sân nào?"

🤖 AI:
  1. Nhận message, userId = 5
  2. Gọi get_user_bookings({ status: "ALL" })
  3. Query DB: SELECT * FROM bookings WHERE userId = 5 AND startTime >= NOW()
  4. Nhận kết quả: 2 bookings
  5. Format response:

📋 **Lịch đặt sân của bạn:**

1️⃣ **#BK123456** - Sân 1
   • Ngày: **22/12/2025**
   • Giờ: **18:00 - 20:00**
   • Trạng thái: **CONFIRMED** ✅
   • Đã thanh toán: **240.000đ**

2️⃣ **#BK123457** - Sân 2
   • Ngày: **23/12/2025**
   • Giờ: **19:00 - 21:00**
   • Trạng thái: **PENDING_PAYMENT** ⏳
   • Tổng tiền: **240.000đ**

💡 Bạn cần thanh toán cho booking #BK123457 để xác nhận! 🏸
```

### Kịch bản 5: Câu hỏi ngoài chủ đề

```
👤: "bạn biết nấu ăn không?"

🤖 AI (không gọi function):
😊 **Xin lỗi, tôi chỉ hỗ trợ về sân cầu lông**

Tôi là AI chuyên về:
• Đặt sân cầu lông
• Tra cứu sản phẩm POS
• Kiểm tra sân trống
• Hỗ trợ booking

Bạn có câu hỏi nào về dịch vụ sân cầu lông không? 🏸
```

---

## 🚀 Testing

### Test Cases

#### ✅ Test 1: POS Products
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "có nước gì?"}'
```

**Expected:** Danh sách sản phẩm thực từ DB với giá, stock

#### ✅ Test 2: Court Availability
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "tối nay còn sân không?"}'
```

**Expected:** Danh sách slots 18h-22h với sân trống/đầy

#### ✅ Test 3: Create Booking (cần auth)
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"message": "đặt sân 1 lúc 18h ngày mai 2 tiếng"}'
```

**Expected:** Booking code + thông tin chi tiết

#### ✅ Test 4: User Bookings (cần auth)
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"message": "tôi đã đặt gì?"}'
```

**Expected:** Danh sách bookings của user

#### ✅ Test 5: Out of Scope
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "bạn biết nấu ăn không?"}'
```

**Expected:** Từ chối lịch sự, hướng về dịch vụ sân

---

## 📝 File Changes

### Modified: `src/modules/chat/chat.service.ts`

**Dòng code:** 280 → 756 (+476 dòng)

**Thay đổi chính:**
1. Import thêm: `PrismaService`, `ProductsService`, `BookingsService`, `Part`, `FunctionCall`
2. Thêm `OPERATING_HOURS` constant
3. System Instruction: 45 → 70+ dòng
4. Function Declarations: 2 → 4 tools
5. Xóa MOCK_DATA, thay bằng database queries
6. Constructor: inject 3 services
7. 4 handlers mới: `handleGetPosProducts`, `handleCreateBooking`, `handleGetCourtAvailability`, `handleGetUserBookings`
8. `executeFunction`: async + userId parameter
9. `generateResponse`: max iterations 3 → 5
10. `getFallbackResponse`: 5 → 8 patterns

---

## ⚠️ Lưu Ý

### 1. Authentication Required

Các function cần user đăng nhập:
- `create_booking` - Bắt buộc userId
- `get_user_bookings` - Bắt buộc userId

Nếu chưa đăng nhập → Trả về error: "Bạn cần đăng nhập..."

### 2. Gemini API Quota

Nếu Gemini API hết quota (429 Too Many Requests):
- Chatbot sẽ dùng **fallback response**
- Vẫn hoạt động được nhưng không thông minh bằng

### 3. Error Handling

Tất cả function handlers đều có try-catch:
```typescript
try {
  // Query DB
} catch (error) {
  this.logger.error(`❌ Error: ${error.message}`);
  return { success: false, error: 'Friendly error message' };
}
```

### 4. Date/Time Parsing

AI có thể parse:
- "ngày mai" → "2025-12-22"
- "18h", "6 giờ tối" → "18:00"
- "2 tiếng" → duration = 2

---

## 🎉 Kết Quả

✅ **3 vấn đề đã được giải quyết:**

1. ✅ **POS có gì, giá bao nhiêu?**
   → Tra cứu database thực với `get_pos_products()`

2. ✅ **Tối nay còn sân không?**
   → Kiểm tra realtime với `get_court_availability()`

3. ✅ **Nhiều chức năng khác:**
   → Xem lịch đặt với `get_user_bookings()`
   → Đặt sân thực với `create_booking()`
   → Xử lý câu hỏi ngoài chủ đề thông minh

---

## 📚 Tài Liệu Liên Quan

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Kiến trúc hệ thống
- [QUICK-START.md](./QUICK-START.md) - Hướng dẫn chạy project
- [TEST-CREDENTIALS.md](./TEST-CREDENTIALS.md) - Tài khoản test

---

**Developed by:** SmartCourt Team  
**Date:** 21/12/2025  
**Version:** 2.0.0
