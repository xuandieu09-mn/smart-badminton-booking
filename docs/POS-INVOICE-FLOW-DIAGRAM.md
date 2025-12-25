# 🔄 Lưu Đồ Thanh Toán POS (Invoice-First Flow)

## Lưu Đồ Chi Tiết

```
┌──────────────────────────────────────────────────────────────┐
│                   STAFF POS TRANSACTION FLOW                 │
└──────────────────────────────────────────────────────────────┘

                        🛒 BƯỚC 1: GIỎ HÀNG
                    (Thêm sản phẩm vào giỏ)
                             │
                             ▼
          ┌────────────────────────────────────┐
          │ Staff adds products to cart        │
          │ ├─ Product 1: 2x                   │
          │ ├─ Product 2: 1x                   │
          │ ├─ Product 3: 3x                   │
          │ └─ Total: 280,000đ                 │
          │                                    │
          │ Input:                             │
          │ ├─ Customer Name: "Nguyễn Văn A"   │
          │ └─ Payment: "Tiền mặt"             │
          └────────┬─────────────────────────┘
                   │
                   ▼
    ┌──────────────────────────────────────┐
    │ Click: "📄 Tạo hóa đơn"               │
    │ (Generate Invoice Button)             │
    └────────┬─────────────────────────────┘
             │
             ▼ setIsGeneratingInvoice(true)
    ┌──────────────────────────────────────┐
    │ POST /pos/sales/generate-invoice      │
    │                                       │
    │ Request Body:                         │
    │ {                                     │
    │   items: [                            │
    │     {productId: 1, quantity: 2},      │
    │     {productId: 2, quantity: 1},      │
    │     {productId: 3, quantity: 3}       │
    │   ],                                  │
    │   customerName: "Nguyễn Văn A",       │
    │   paymentMethod: "CASH"               │
    │ }                                     │
    │                                       │
    │ Headers: Authorization Bearer token   │
    └────────┬─────────────────────────────┘
             │
    🖧🖧🖧🖧🖧🖧🖧🖧🖧 BACKEND PROCESSING 🖧🖧🖧🖧🖧🖧🖧🖧🖧
             │
             ▼
    ┌──────────────────────────────────────────────┐
    │ InvoiceService.generateInvoicePreview()     │
    └────────┬─────────────────────────────────────┘
             │
             ├─ 1️⃣ Validate products
             │   │
             │   ├─ Product #1 exists? ✓
             │   ├─ Product #1 isActive? ✓
             │   └─ Stock >= 2? ✓
             │
             ├─ 2️⃣ Calculate totals
             │   │
             │   ├─ Item 1: 100k × 2 = 200k
             │   ├─ Item 2: 50k × 1 = 50k
             │   └─ Item 3: 10k × 3 = 30k
             │
             ├─ 3️⃣ Get staff info
             │   └─ SELECT name FROM user WHERE id = staffId
             │
             ├─ 4️⃣ Generate invoice code
             │   └─ INV-{Date.now()}-{staffId}
             │
             └─ 5️⃣ Format receipt (40 chars width)
                   └─ ════════════════════════════════════════
                      BIÊN LAI BÁN HÀNG
                      SMART BADMINTON BOOKING
                      ════════════════════════════════════════
                      ...
             │
             ▼
    ┌──────────────────────────────────────────────┐
    │ Return 200 OK                                │
    │ {                                            │
    │   invoice: {                                 │
    │     invoiceCode: "INV-1703419200000-5",     │
    │     customerName: "Nguyễn Văn A",           │
    │     paymentMethod: "CASH",                   │
    │     staffName: "Trần B",                     │
    │     createdAt: "24/12/2025 14:30:00",       │
    │     items: [...],                           │
    │     totalAmount: 280000                      │
    │   },                                        │
    │   printFormat: "════════════════════..." │
    │ }                                            │
    └────────┬─────────────────────────────────────┘
             │
    🖧🖧🖧🖧🖧🖧🖧 FRONTEND HANDLING 🖧🖧🖧🖧🖧🖧
             │
             ▼
    ┌──────────────────────────────────────────────┐
    │ setInvoice(data.invoice)                     │
    │ setPrintFormat(data.printFormat)             │
    │ setShowInvoiceModal(true)                    │
    │ setIsGeneratingInvoice(false)                │
    └────────┬─────────────────────────────────────┘
             │
             ▼
    ┌────────────────────────────────────────────────┐
    │          📄 INVOICE MODAL APPEARS              │
    │ ┌────────────────────────────────────────────┐ │
    │ │ BIÊN LAI BÁN HÀNG                          │ │
    │ │ Mã HĐ: INV-1703419200000-5                 │ │
    │ ├────────────────────────────────────────────┤ │
    │ │ Khách hàng: Nguyễn Văn A                   │ │
    │ │ Nhân viên: Trần B                          │ │
    │ │ Thời gian: 24/12/2025 14:30:00             │ │
    │ │ Thanh toán: 💵 Tiền mặt                    │ │
    │ ├────────────────────────────────────────────┤ │
    │ │ Sản phẩm           | SL | Giá  | Tổng      │ │
    │ ├────────────────────────────────────────────┤ │
    │ │ Product 1          │ 2  | 100k | 200k      │ │
    │ │ Product 2          │ 1  | 50k  | 50k       │ │
    │ │ Product 3          │ 3  | 10k  | 30k       │ │
    │ ├────────────────────────────────────────────┤ │
    │ │ TỔNG CỘNG:                  280,000đ      │ │
    │ ├────────────────────────────────────────────┤ │
    │ │ [Receipt text preview in monospace]        │ │
    │ ├────────────────────────────────────────────┤ │
    │ │ [🖨️ In hóa đơn] [✅ Xác nhận] [❌ Huỷ]    │ │
    │ └────────────────────────────────────────────┘ │
    └────────┬──────┬───────────────┬─────────────────┘
             │      │               │
    ┌────────┘      │               └──────────┐
    │               │                          │
    ▼               ▼                          ▼
[🖨️ In HĐ]  [✅ Xác nhận]              [❌ Huỷ]
    │               │                          │
    │               │                          ▼
    │               │                  Close Modal
    │               │                  Cart remains
    │               │                  Go back to POS
    │               │
    ▼               ▼
window.open()   setLoading(true)
  │                │
  │                ▼
  │       POST /pos/sales
  │       {items, customerName,
  │        paymentMethod}
  │                │
  │                ▼
  │       Backend: SalesService.createSale()
  │       ├─ For each item:
  │       │  ├─ Decrement stock
  │       │  └─ Create SaleItem record
  │       ├─ Create Sale record
  │       ├─ Create InventoryAction logs
  │       └─ Send notifications
  │                │
  │                ▼
  │       Return 200 OK
  │       {
  │         sale: {
  │           id: 1001,
  │           saleCode: "SALE-1001",
  │           totalAmount: 280000,
  │           items: [...]
  │         }
  │       }
  │                │
  │                ▼
  │       Frontend:
  │       ├─ setCart([])
  │       ├─ setCustomerName('')
  │       ├─ setShowInvoiceModal(false)
  │       ├─ fetchProducts() // refresh stock
  │       └─ alert("✅ Thanh toán thành công!")
  │
  ▼
Print Dialog Opens
  │
  ├─ User selects printer
  │ ├─ Physical thermal printer
  │ ├─ PDF printer (Save as PDF)
  │ └─ Print Preview
  │
  ▼
Print success
  │
  ▼
User closes print dialog
  │
  ▼
Can click "✅ Xác nhận thanh toán"
to proceed with payment
```

---

## 🔄 State Flow Diagram

```
Initial State:
└─ cart = []
└─ showInvoiceModal = false
└─ invoice = null


After adding products:
└─ cart = [{product, qty}, ...]
└─ showInvoiceModal = false
└─ invoice = null


After clicking "📄 Tạo hóa đơn":
├─ Validate cart & customerName
└─ POST /pos/sales/generate-invoice
   └─ setInvoice(response.invoice)
   └─ setPrintFormat(response.printFormat)
   └─ setShowInvoiceModal(true)


After clicking "🖨️ In hóa đơn":
├─ window.open() with receipt format
└─ User can print to:
   ├─ Physical printer
   ├─ PDF
   └─ Browser preview


After clicking "✅ Xác nhận thanh toán":
├─ POST /pos/sales (create actual sale)
└─ Reset state:
   ├─ setCart([])
   ├─ setCustomerName('')
   ├─ setShowInvoiceModal(false)
   ├─ setInvoice(null)
   ├─ setPrintFormat('')
   └─ fetchProducts() // refresh stock


After clicking "❌ Huỷ":
├─ setShowInvoiceModal(false)
└─ Cart remains intact
   └─ Can modify and try again
```

---

## 📊 Database Impact

When sale is confirmed:

```sql
-- Create Sale record
INSERT INTO Sale (
  saleCode,
  totalAmount,
  paymentMethod,
  staffId,
  customerName,
  createdAt
) VALUES (...)

-- Create SaleItems for each product
INSERT INTO SaleItem (
  saleId,
  productId,
  quantity,
  unitPrice,
  subtotal
) VALUES (...)

-- Decrement product stock
UPDATE Product
SET stock = stock - quantity
WHERE id IN (...)

-- Create inventory action log (audit trail)
INSERT INTO InventoryAction (
  productId,
  actionType, -- 'SALE'
  quantity,
  reference, -- saleCode
  createdAt
) VALUES (...)
```

---

## ✅ Validation Rules

**Before generating invoice:**
```
✓ Cart not empty
✓ Customer name provided
✓ Each product exists
✓ Each product isActive
✓ Stock >= requested quantity for each item
```

**If validation fails:**
```
❌ Return 400 Bad Request
{
  "message": "Insufficient stock for 'Nước cam'. 
             Available: 5, Requested: 10"
}
```

---

## 🎯 Key Differences from Old Flow

| Aspek | Lama | Mới |
|-------|------|-----|
| Thanh toán | 1 bước | 2 bước (Invoice + Confirm) |
| Kiểm tra hàng | Backend khi thanh toán | Backend khi tạo hóa đơn |
| In hóa đơn | Không có | Có (mô phỏng máy in) |
| Rủi ro | Có thể in sai | Kiểm tra trước khi in |
| UX | Nhanh nhưng dễ sai | An toàn và chuyên nghiệp |
