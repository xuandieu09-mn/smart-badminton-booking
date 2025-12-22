# 🔄 HƯỚNG DẪN RESTART BACKEND

## ⚠️ VẤN ĐỀ HIỆN TẠI:
Backend đang chạy với CODE CŨ → Chưa load fallback logic mới → Vẫn trả lời fallback mặc định

## ✅ GIẢI PHÁP: Restart Backend

### Option 1: Restart trong VSCode (KHUYẾN NGHỊ)

**Bước 1:** Nhấn `Ctrl + C` trong terminal đang chạy `npm run start:dev`

**Bước 2:** Chờ process stop (3-5 giây)

**Bước 3:** Chạy lại:
```bash
npm run start:dev
```

**Bước 4:** Chờ thấy log:
```
✅ SmartCourt AI initialized with gemini-2.0-flash
🛠️ Tools: 4 functions (POS, Booking, Availability, User Bookings)
```

---

### Option 2: Kill process thủ công (NẾU Option 1 KHÔNG HOẠT ĐỘNG)

**Bước 1:** Mở PowerShell mới

**Bước 2:** Kill tất cả Node.js process:
```powershell
taskkill /F /IM node.exe
```

**Bước 3:** Chạy lại backend:
```bash
cd e:\TOT_NGHIEP\smart-badminton-booking
npm run start:dev
```

---

### Option 3: Restart qua Task Manager

**Bước 1:** Mở Task Manager (`Ctrl + Shift + Esc`)

**Bước 2:** Tìm tất cả process "Node.js"

**Bước 3:** Chọn → End Task

**Bước 4:** Chạy lại:
```bash
npm run start:dev
```

---

## 🧪 SAU KHI RESTART, TEST LẠI:

Gửi lại 4 câu hỏi:

1. **"sân giá bao nhiêu vào sáng"**
   - ✅ Expected: "50.000đ/giờ (06:00-08:00)..."
   - ❌ Nếu vẫn "Xin chào..." → Vẫn chưa load code

2. **"bảng giá chi tiết"**
   - ✅ Expected: Bảng 6 khung giờ
   - ❌ Nếu vẫn "Xin chào..." → Vẫn chưa load code

3. **"vợt bao nhiêu"**
   - ✅ Expected: "Vợt Yonex 450k..."
   - ❌ Nếu vẫn "Xin chào..." → Vẫn chưa load code

4. **"liệt kê các dịch vụ"**
   - ✅ Expected: Danh sách dịch vụ
   - ❌ Nếu vẫn "Xin chào..." → Vẫn chưa load code

---

## ⚠️ NẾU VẪN KHÔNG HOẠT ĐỘNG:

Có thể AI không được khởi tạo. Kiểm tra log backend:

```bash
# Tìm dòng này trong log:
✅ SmartCourt AI initialized with gemini-2.0-flash
```

**Nếu KHÔNG thấy dòng trên:**
- ❌ Gemini API Key lỗi
- ❌ AI không init được
- ❌ Luôn dùng fallback

**Giải pháp:**
1. Kiểm tra file `.env` có `GEMINI_API_KEY` chưa
2. API Key có đúng không
3. Có kết nối internet không

---

## 🎯 CÁCH NHANH NHẤT:

Tôi có thể giúp bạn restart ngay:

**Cho phép tôi chạy lệnh:**
1. Tôi sẽ kill process cũ
2. Restart backend với code mới
3. Test lại ngay

**Hoặc bạn tự làm theo hướng dẫn trên** 👆

**Bạn muốn tôi restart backend cho bạn không?** (Y/N)
