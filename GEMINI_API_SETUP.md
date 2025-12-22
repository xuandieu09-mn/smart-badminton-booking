# 🔑 Hướng dẫn tạo GEMINI_API_KEY mới

## Vấn đề hiện tại
API Key trong `.env` không hợp lệ → Google trả về lỗi 404 cho tất cả models.

## Các bước tạo API Key mới

### 1. Truy cập Google AI Studio
Mở trình duyệt: https://makersuite.google.com/app/apikey

### 2. Đăng nhập
- Đăng nhập bằng Google Account
- Chấp nhận Terms of Service

### 3. Tạo API Key
- Click **"Create API key"**
- Chọn **"Create API key in new project"** (hoặc chọn project có sẵn)
- Copy API key mới (dạng: `AIzaSy...`)

### 4. Enable Generative Language API
- Vào Google Cloud Console: https://console.cloud.google.com/
- Chọn project vừa tạo
- Search: "Generative Language API"
- Click **Enable**

### 5. Cập nhật `.env`
```bash
# File: .env
GEMINI_API_KEY=AIzaSy_YOUR_NEW_API_KEY_HERE
```

### 6. Restart Backend
```bash
# Kill backend cũ
taskkill /F /IM node.exe

# Start lại
npm run start:dev
```

## Models hỗ trợ (Free Tier)
- ✅ `gemini-pro` - Text generation (Stable)
- ✅ `gemini-1.5-flash` - Fast responses
- ✅ `gemini-1.5-pro` - Most capable

## Test API Key
```bash
# Test với curl
curl https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=YOUR_API_KEY \
  -H 'Content-Type: application/json' \
  -d '{"contents":[{"parts":[{"text":"Say hi"}]}]}'
```

## Troubleshooting
- ❌ 404 Error → API key không hợp lệ hoặc chưa enable API
- ❌ 403 Error → API key bị vô hiệu hóa hoặc hết quota
- ✅ 200 OK → API key hoạt động tốt

## Lưu ý quan trọng
- 🆓 Free tier: 60 requests/minute
- 📊 Quota: Check tại https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/quotas
- 🔒 Không public API key lên GitHub
