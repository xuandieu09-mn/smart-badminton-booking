# 🧪 PHASE 1 TESTING GUIDE - System Prompt Enhancement

## 📅 Date: 2025-12-22
## 🎯 Objective: Kiểm tra "Bộ não" chatbot sau khi nâng cấp System Instruction V2

---

## ✅ TESTING CHECKLIST

### 1️⃣ Kiểm Tra Giá Sân (Hardcoded Context)

**Test Case 1.1: Hỏi giá khung giờ cụ thể**
```
👤 User: "sân giá bao nhiêu vào sáng?"
✅ Expected: Bot trả lời "50.000đ/giờ (06:00-08:00) hoặc 70.000đ/giờ (08:00-12:00)"
❌ Fail if: Bot nói "không biết" hoặc gọi function calling
```

**Test Case 1.2: Hỏi giá khung cao điểm**
```
👤 User: "tối chơi mất bao nhiêu?"
✅ Expected: "120.000đ/giờ (17:00-20:00) - khung cao điểm"
❌ Fail if: Bot trả lời sai giá hoặc không có emoji
```

**Test Case 1.3: Hỏi giá tổng quát**
```
👤 User: "giá sân bao nhiêu?"
✅ Expected: Liệt kê bảng giá đầy đủ (6 khung giờ) với Markdown format
❌ Fail if: Thiếu khung giờ hoặc format xấu
```

---

### 2️⃣ Kiểm Tra Giờ Mở Cửa

**Test Case 2.1: Hỏi giờ mở cửa**
```
👤 User: "mấy giờ mở cửa?"
✅ Expected: "Thứ 2-6: 6:00-22:00, Thứ 7-CN: 6:00-23:00"
❌ Fail if: Thiếu thông tin ngày cuối tuần
```

**Test Case 2.2: Hỏi giờ đóng cửa**
```
👤 User: "đóng cửa khi nào?"
✅ Expected: Nêu rõ 22:00 (T2-6) và 23:00 (T7-CN)
❌ Fail if: Chỉ nói "tối" mà không nêu giờ cụ thể
```

---

### 3️⃣ Kiểm Tra Câu Hỏi Ngoài Phạm Vi (Fallback)

**Test Case 3.1: Chủ đề hoàn toàn không liên quan**
```
👤 User: "bạn biết nấu phở không?"
✅ Expected: Từ chối lịch sự + hướng về dịch vụ sân
         "Mình là AI chuyên về đặt sân cầu lông, không hỗ trợ nấu ăn ạ 😊
          Bạn có cần giúp gì về dịch vụ sân không?"
❌ Fail if: Bot cố gắng trả lời về nấu ăn
```

**Test Case 3.2: Chủ đề nhạy cảm**
```
👤 User: "ai thắng cử tổng thống?"
✅ Expected: Từ chối lịch sự, không bàn chính trị
❌ Fail if: Bot trả lời về chính trị
```

**Test Case 3.3: Câu hỏi mơ hồ**
```
👤 User: "thời tiết hôm nay thế nào?"
✅ Expected: Từ chối + gợi ý "Bạn muốn đặt sân hôm nay không?"
❌ Fail if: Bot cố đoán thời tiết
```

---

### 4️⃣ Kiểm Tra Chính Sách (Hardcoded Context)

**Test Case 4.1: Chính sách hủy sân**
```
👤 User: "nếu hủy sân thì mất tiền không?"
✅ Expected: Liệt kê 3 mốc:
         - Hủy trước 24h: Hoàn 100%
         - Hủy trước 12h: Hoàn 50%
         - Dưới 12h: Không hoàn
❌ Fail if: Thiếu thông tin hoặc sai policy
```

**Test Case 4.2: Chính sách cọc**
```
👤 User: "cọc bao nhiêu phần trăm?"
✅ Expected: "50% tổng tiền đặt sân"
❌ Fail if: Nói khác hoặc không rõ ràng
```

---

### 5️⃣ Kiểm Tra Thông Tin POS (Hardcoded - Tham khảo)

**Test Case 5.1: Hỏi đồ uống**
```
👤 User: "có nước gì?"
✅ Expected: Liệt kê 3-5 loại phổ biến (Revive 15k, Aquafina 10k...)
         + Gợi ý "Muốn xem giá real-time? (cần login)"
❌ Fail if: Gọi get_pos_products() ngay (chưa cần thiết)
```

**Test Case 5.2: Hỏi phụ kiện**
```
👤 User: "vợt bao nhiêu?"
✅ Expected: Tham khảo Yonex 450k, Victor 650k
         + Note "Giá tham khảo, liên hệ staff để biết chính xác"
❌ Fail if: Không có disclaimer về tính tham khảo
```

---

### 6️⃣ Kiểm Tra Markdown Formatting

**Test Case 6.1: Liệt kê danh sách**
```
👤 User: "liệt kê các dịch vụ của sân"
✅ Expected: Dùng gạch đầu dòng (-) hoặc bullet (•)
         **Bôi đậm** các tên dịch vụ
         Có emoji phù hợp 🏸 💰
❌ Fail if: Plain text không format
```

**Test Case 6.2: Xuống dòng đúng**
```
👤 User: "bảng giá chi tiết"
✅ Expected: Mỗi khung giờ 1 dòng, căn chỉnh đẹp
❌ Fail if: Tất cả viết liền 1 dòng dài
```

---

### 7️⃣ Kiểm Tra Chào Hỏi & Giới Thiệu

**Test Case 7.1: Chào hỏi cơ bản**
```
👤 User: "xin chào"
✅ Expected: Giới thiệu SmartCourt + 4 tính năng chính
         (Đặt sân, Xem sân trống, Tra POS, Xem lịch)
❌ Fail if: Chỉ chào lại mà không giới thiệu dịch vụ
```

**Test Case 7.2: Hello tiếng Anh**
```
👤 User: "hello"
✅ Expected: Vẫn trả lời tiếng Việt (vì đây là sân VN)
         + Giới thiệu đầy đủ
❌ Fail if: Không phản hồi hoặc trả lời tiếng Anh
```

---

## 🎯 KẾT QUẢ MONG MUỐN (Pass Criteria)

| Loại Test | Pass | Fail | Note |
|-----------|------|------|------|
| Giá sân (3 cases) | ✅ 3/3 | ❌ 0/3 | |
| Giờ mở cửa (2 cases) | ✅ 2/2 | ❌ 0/2 | |
| Ngoài phạm vi (3 cases) | ✅ 3/3 | ❌ 0/3 | |
| Chính sách (2 cases) | ✅ 2/2 | ❌ 0/2 | |
| POS tham khảo (2 cases) | ✅ 2/2 | ❌ 0/2 | |
| Markdown (2 cases) | ✅ 2/2 | ❌ 0/2 | |
| Chào hỏi (2 cases) | ✅ 2/2 | ❌ 0/2 | |
| **TỔNG** | **✅ 16/16** | **❌ 0/16** | **100% = PASS** |

---

## 📝 GHI CHÚ TESTING

### Cách test:
1. Khởi động backend: `npm run start:dev`
2. Mở frontend chat UI
3. Gửi lần lượt các câu hỏi trong Test Cases
4. Tick ✅ hoặc ❌ vào bảng kết quả

### Nếu fail:
1. Đọc lại response của bot
2. Kiểm tra `SYSTEM_INSTRUCTION` trong [chat.service.ts](../src/modules/chat/chat.service.ts)
3. Đảm bảo hardcoded data chính xác
4. Điều chỉnh prompt nếu cần

### Ghi log:
- File log: `logs/phase1-testing.txt` (nếu có)
- Copy paste response của bot vào đây để so sánh

---

## ✅ PHASE 1 COMPLETE CRITERIA

Phase 1 được coi là **HOÀN THÀNH** khi:
- [ ] Tất cả 16 test cases PASS (16/16)
- [ ] Bot trả lời về giá/giờ/chính sách từ hardcoded data (KHÔNG gọi function)
- [ ] Bot từ chối lịch sự câu hỏi ngoài phạm vi
- [ ] Markdown formatting đẹp, rõ ràng
- [ ] Build code không lỗi (`npm run build` success)
- [ ] Backend khởi động bình thường

**Khi đạt tiêu chí trên → Sẵn sàng chuyển sang Phase 2! 🎉**
