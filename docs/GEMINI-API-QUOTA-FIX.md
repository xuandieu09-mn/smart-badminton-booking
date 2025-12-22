# 🔴 VẤN ĐỀ: Gemini API Quota Hết - Chatbot Không Hoạt Động

## 📅 Ngày phát hiện: 2025-12-22

---

## 🔍 PHÂN TÍCH VẤN ĐỀ

### Triệu chứng:
- Chatbox không trả lời được câu hỏi cơ bản
- Bot luôn trả về fallback response

### Nguyên nhân gốc:
**API Key Gemini đã HẾT QUOTA miễn phí hoàn toàn!**

```
Error: 429 Too Many Requests
Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests
Limit: 0 (HẾT HOÀN TOÀN)
```

### Chi tiết:
| Thông số | Giá trị |
|----------|---------|
| API Key | `AIzaSyCOps_J-qki0ILrGtViVC_GEkuR3fCFQBs` |
| Status | Valid (có thể list models) |
| Quota remaining | **0** (tất cả models) |
| Models tested | `gemini-2.0-flash`, `gemini-2.0-flash-lite`, `gemini-1.5-flash` |
| Tất cả đều bị | 429 Too Many Requests |

---

## ✅ GIẢI PHÁP

### Option 1: 🔑 Tạo API Key Mới (KHUYẾN NGHỊ)

1. **Truy cập Google AI Studio:**
   ```
   https://makersuite.google.com/app/apikey
   ```

2. **Tạo project MỚI + API key mới:**
   - Click "Create API key"
   - Chọn "Create API key in **new project**"
   - Copy key mới (dạng: `AIzaSy...`)

3. **Cập nhật `.env`:**
   ```bash
   GEMINI_API_KEY=AIzaSy_YOUR_NEW_KEY_HERE
   ```

4. **Restart backend:**
   ```bash
   npm run start:dev
   ```

5. **Kiểm tra log:**
   ```
   ✅ SmartCourt AI initialized with gemini-2.0-flash
   ```

### Option 2: ⏰ Chờ Quota Reset

- Rate limit: Reset sau **1-5 phút**
- Daily limit: Reset sau **24 giờ**
- Nếu `limit: 0` → Có thể đã chạm daily quota → Chờ ngày mai

### Option 3: 💳 Nâng cấp Google Cloud

1. Enable billing trên Google Cloud Console
2. Quota sẽ tăng lên đáng kể
3. Có thể phải trả phí nếu vượt free tier

---

## 🔧 CẢI TIẾN ĐÃ THỰC HIỆN

### 1. Retry Logic với Exponential Backoff
```typescript
// Retry 2 lần khi gặp lỗi quota
const maxRetries = 2;
for (let retry = 0; retry <= maxRetries; retry++) {
  // Wait before retry: 1s, 2s...
  await new Promise(resolve => setTimeout(resolve, 1000 * retry));
  // ... try again
}
```

### 2. Enhanced Fallback Responses
Thêm nhiều patterns để chatbot hoạt động tốt hơn khi AI offline:

| Pattern mới | Ví dụ câu hỏi |
|-------------|---------------|
| Dịch vụ | "dịch vụ có gì?", "tính năng" |
| Thông tin | "giới thiệu sân", "smartcourt là gì" |
| Địa chỉ | "ở đâu?", "địa chỉ" |
| Liên hệ | "hotline", "email", "số điện thoại" |
| POS | "vợt", "nước", "quầy", "cầu lông" |

### 3. Logging cải thiện
```
⚠️ API Quota exceeded (retry 0): [429] You exceeded your current quota...
❌ All retries exhausted due to quota limits. Using enhanced fallback.
```

---

## 📋 TEST SAU KHI FIX

### Test API Key mới:
```bash
cd e:\TOT_NGHIEP\smart-badminton-booking
node -e "const{GoogleGenerativeAI}=require('@google/generative-ai');const g=new GoogleGenerativeAI('YOUR_NEW_KEY');const m=g.getGenerativeModel({model:'gemini-2.0-flash'});m.generateContent('test').then(r=>console.log('OK:',r.response.text().substring(0,50))).catch(e=>console.log('ERR:',e.message))"
```

### Kỳ vọng:
```
OK: [response text from AI]
```

### Test Chatbox:
1. Khởi động backend: `npm run start:dev`
2. Mở frontend chat UI
3. Gửi: "giá sân bao nhiêu?"
4. Kỳ vọng: Trả về bảng giá đầy đủ (dù AI hay fallback)

---

## 📊 TỔNG HỢP

| Vấn đề | Trạng thái |
|--------|------------|
| API Key hết quota | ❌ Cần tạo key mới |
| Fallback response | ✅ Đã cải thiện |
| Retry logic | ✅ Đã thêm |
| Logging | ✅ Đã cải thiện |
| Build | ✅ Thành công |

---

## 🚀 HÀNH ĐỘNG TIẾP THEO

1. **NGAY LẬP TỨC:** Tạo API Key mới tại https://makersuite.google.com/app/apikey
2. Cập nhật `.env` với key mới
3. Restart backend
4. Test chatbox

**Sau khi có key mới, chatbox sẽ hoạt động với full AI capabilities!** 🏸
