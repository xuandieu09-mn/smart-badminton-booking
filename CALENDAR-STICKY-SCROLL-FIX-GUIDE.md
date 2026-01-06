# 🔧 Hướng Dẫn Sửa Lỗi Calendar Scroll Không Đồng Bộ

## 📌 VẤN ĐỀ

Hiện tại calendar booking grid có lỗi **"Disconnected Scrolling"**:
- Khi scroll ngang → Header giờ (06:00, 07:00...) đứng yên → mất context
- Khi scroll dọc → Sidebar (tên sân) có thể bị tách biệt → mất alignment

## 🎯 NGUYÊN NHÂN

Cấu trúc hiện tại chia thành 3 container riêng biệt:
1. `.timeline-court-names` - Sidebar có `overflow-y: auto` riêng
2. `.timeline-header` - Header giờ trong container riêng  
3. `.timeline-grid-body` - Grid content scroll độc lập

→ **Không đồng bộ khi scroll!**

## ✅ GIẢI PHÁP: Excel-like Freeze Panes với CSS Sticky

### Bước 1: Sửa CSS (File: `TimelineResourceGrid.css`)

Thay đổi đã được apply trong commit này. Kiểm tra file để thấy:

**Key Changes:**
```css
/* 1. Main wrapper - SINGLE scroll container */
.timeline-wrapper {
  overflow: auto; /* ✅ Cả X và Y scroll trong 1 container */
}

/* 2. Sidebar - Sticky left */
.timeline-court-names {
  position: sticky;
  left: 0;
  z-index: 20;
}

/* 3. Header - Sticky top */
.timeline-header {
  position: sticky;
  top: 0;
  z-index: 10;
}

/* 4. Corner cell - Sticky BOTH top & left */
.timeline-court-name-header {
  position: sticky;
  top: 0;
  left: 0;
  z-index: 30; /* Highest */
}
```

### Bước 2: Kiểm Tra TSX Structure  

File: `frontend/src/features/calendar/components/TimelineResourceGrid.tsx`

Đảm bảo structure như sau:

```tsx
<div className="timeline-wrapper">
  {/* Sidebar với sticky left */}
  <div className="timeline-court-names">
    <div className="timeline-court-name-header">Sân</div>
    {courts.map(court => (
      <div className="timeline-court-name-row">{court.name}</div>
    ))}
  </div>

  {/* Grid content */}
  <div className="timeline-grid-wrapper">
    {/* Header với sticky top */}
    <div className="timeline-header">
      {hours.map(hour => (
        <div className="timeline-hour-cell">{hour}:00</div>
      ))}
    </div>

    {/* Grid body */}
    <div className="timeline-grid-body">
      {/* Booking blocks */}
    </div>
  </div>
</div>
```

## 📝 Z-INDEX HIERARCHY (Quan trọng!)

```
Level 3 (z-index: 30): Corner cell (top-left) - Cao nhất
Level 2 (z-index: 20): Sidebar court names - Che grid
Level 1 (z-index: 10): Header hours - Che grid  
Level 0 (z-index: 1-5): Grid content, bookings
```

## 🧪 TESTING CHECKLIST

Sau khi apply changes, test các scenarios:

### ✅ Scroll Ngang (Horizontal):
1. Scroll grid sang phải → Header giờ phải di chuyển CÙNG
2. Sidebar tên sân phải CỐ ĐỊNH bên trái
3. Corner cell "Sân" phải LUÔN hiển thị

### ✅ Scroll Dọc (Vertical):
1. Scroll grid xuống dưới → Sidebar phải cuộn CÙNG
2. Header giờ phải CỐ ĐỊNH ở top
3. Corner cell "Sân" phải LUÔN hiển thị

### ✅ Zoom In/Out:
1. Zoom to 150% → Content tràn → Test scroll
2. Zoom to 50% → Test alignment vẫn đúng

## 🎨 OPTIONAL: Cải Thiện UX Thêm

### 1. Thêm Shadow Khi Scroll
```css
.timeline-court-names {
  box-shadow: 2px 0 4px rgba(0,0,0,0.1);
}

.timeline-header {
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
```

### 2. Smooth Scroll
```css
.timeline-wrapper {
  scroll-behavior: smooth;
}
```

### 3. Custom Scrollbar (Optional)
```css
.timeline-wrapper::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.timeline-wrapper::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 4px;
}

.timeline-wrapper::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}
```

## 🚀 KẾT QUẢ MONG ĐỢI

Sau khi fix:
- ✅ Header giờ LUÔN hiển thị khi scroll dọc
- ✅ Sidebar sân LUÔN hiển thị khi scroll ngang
- ✅ Corner "Sân" LUÔN cố định góc trên trái
- ✅ Trải nghiệm giống Excel Freeze Panes
- ✅ Không còn mất context khi scroll

## 📚 THAM KHẢO

Kỹ thuật sử dụng: **CSS Sticky Positioning**
- MDN Docs: https://developer.mozilla.org/en-US/docs/Web/CSS/position#sticky
- Tương tự: Excel Freeze Panes, Google Sheets Frozen Rows/Columns

---
**Người thực hiện:** GitHub Copilot  
**Ngày:** 05/01/2026  
**File liên quan:**  
- `frontend/src/features/calendar/components/TimelineResourceGrid.css` ✅ Đã sửa
- `frontend/src/features/calendar/components/TimelineResourceGrid.tsx` ⚠️ Cần kiểm tra structure
