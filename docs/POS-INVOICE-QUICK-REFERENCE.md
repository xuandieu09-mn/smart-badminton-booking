# 🎯 POS INVOICE - QUICK REFERENCE CARD

## 📱 UI Flow (What Staff Sees)

```
┌─────────────────────────────────────────────────────┐
│  🛒 POS - BÁN HÀNG TẠI SÂN                          │
├─────────────────────────────────────────────────────┤
│  LEFT: Product Grid          │  RIGHT: Cart         │
│  ├─ 🏸 Ống cầu               │  ├─ Sản phẩm 1: 2x   │
│  ├─ 🥤 Nước uống             │  ├─ Sản phẩm 2: 1x   │
│  ├─ 🎾 Phụ kiện              │  ├─ Sản phẩm 3: 3x   │
│  ├─ ⚡ Dụng cụ               │  ├─ Tổng: 280,000đ   │
│  └─ 📦 Khác                  │  ├─ Tên KH: [input]  │
│                              │  ├─ Thanh toán:      │
│                              │  │  💵 Tiền mặt      │
│                              │  │  💳 Chuyển khoản  │
│                              │  └─ [📄 Tạo hóa đơn] │
│                              │     (was ✅ Thanh toán)
└─────────────────────────────────────────────────────┘

                            ▼ Click "📄 Tạo hóa đơn"

        ┌────────────────────────────────────────┐
        │ 📄 BIÊN LAI BÁN HÀNG                  │
        │ Mã HĐ: INV-1703419200000-5            │
        ├────────────────────────────────────────┤
        │ Khách: Nguyễn Văn A | Nhân viên: Trần │
        │ Thời gian: 24/12/2025 14:30:00         │
        │ Thanh toán: 💵 Tiền mặt                │
        ├────────────────────────────────────────┤
        │ SẢN PHẨM      │SL│  GIÁ   │   TỔNG    │
        │ Nước cam       │2 │ 20k   │  40k     │
        │ Vợt cầu lông  │1 │150k   │ 150k     │
        │ Ống cầu       │3 │ 30k   │  90k     │
        ├────────────────────────────────────────┤
        │ 💰 TỔNG CỘNG:        280,000đ        │
        ├────────────────────────────────────────┤
        │ ════════════════════════════════════  │
        │ BIÊN LAI BÁN HÀNG (receipt preview)   │
        │ ════════════════════════════════════  │
        │ [monospace receipt text...]           │
        ├────────────────────────────────────────┤
        │ [🖨️ In]  [✅ Xác nhận]  [❌ Huỷ]      │
        └────────────────────────────────────────┘

        User can:
        ├─ 🖨️ Click "In hóa đơn" → Print dialog
        ├─ ✅ Click "Xác nhận" → Sale created
        └─ ❌ Click "Huỷ" → Modal closes
```

---

## 🔄 Technical Flow (What Happens Behind)

```
FRONTEND                              BACKEND
────────────────────────────────────────────────────
User adds products to cart
                                      
User enters customer name             

User clicks "📄 Tạo hóa đơn"
        │
        ├─ Validate cart (not empty)
        ├─ Validate customerName (not empty)
        │
        └─ POST /pos/sales/generate-invoice
                                      │
                                      ▼
                                InvoiceService:
                                ├─ Find each product
                                ├─ Check stock
                                ├─ Calculate totals
                                ├─ Format receipt
                                │
                                ▼
                                Return 200 OK
                                {
                                  invoice: {...},
                                  printFormat: "..."
                                }
        │
        ▼
Show invoice modal

User clicks "🖨️ In hóa đơn"
        └─ window.open() with printFormat
           └─ User selects printer
              └─ Prints receipt

User clicks "✅ Xác nhận thanh toán"
        └─ POST /pos/sales
                                      │
                                      ▼
                                SalesService.createSale():
                                ├─ Create Sale record
                                ├─ Create SaleItem records
                                ├─ Decrement stock
                                ├─ Create InventoryAction logs
                                │
                                ▼
                                Return 200 OK
                                {sale: {...}}
        │
        ▼
Close modal
Clear cart
Reset form
Refresh products
```

---

## 📊 Response Examples

### Generate Invoice Response
```json
{
  "message": "Invoice generated successfully",
  "invoice": {
    "invoiceCode": "INV-1703419200000-5",
    "customerName": "Nguyễn Văn A",
    "paymentMethod": "CASH",
    "staffName": "Trần B",
    "createdAt": "24/12/2025 14:30:00",
    "items": [
      {"productId": 1, "productName": "Nước cam", "price": 20000, "quantity": 2, "subtotal": 40000},
      {"productId": 2, "productName": "Vợt", "price": 150000, "quantity": 1, "subtotal": 150000}
    ],
    "totalAmount": 190000
  },
  "printFormat": "════════════════════════════════════════\n..."
}
```

### Create Sale Response
```json
{
  "message": "Sale created successfully",
  "sale": {
    "id": 1001,
    "saleCode": "SALE-1001",
    "totalAmount": 190000,
    "paymentMethod": "CASH",
    "customerName": "Nguyễn Văn A",
    "staffId": 5,
    "items": [...]
  }
}
```

---

## ⚡ Quick Commands

```bash
# Test invoice generation
curl -X POST http://localhost:3000/api/pos/sales/generate-invoice \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{"productId": 1, "quantity": 2}],
    "customerName": "Test",
    "paymentMethod": "CASH"
  }'

# Test payment confirmation
curl -X POST http://localhost:3000/api/pos/sales \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{"productId": 1, "quantity": 2}],
    "customerName": "Test",
    "paymentMethod": "CASH"
  }'
```

---

## 🎯 Key States

| Component | State | Value | Effect |
|-----------|-------|-------|--------|
| showInvoiceModal | false | Button shows "📄 Tạo hóa đơn" |
| showInvoiceModal | true | Modal appears | Can't interact with cart |
| isGeneratingInvoice | true | Button disabled | "⏳ Đang tạo hóa đơn..." |
| isGeneratingInvoice | false | Button active | Ready to generate |
| loading | true | Payment btn disabled | "⏳ Đang xử lý..." |
| loading | false | Payment btn active | Ready to confirm |
| invoice | null | Modal hidden | |
| invoice | {...} | Modal shown | Shows invoice details |

---

## ✅ Validation Rules

```
Before generating invoice:
✓ cart.length > 0 ("Giỏ hàng trống")
✓ customerName.trim().length > 0 ("Vui lòng nhập tên khách")

In backend:
✓ Each product exists ("Product not found")
✓ Each product isActive ("Product not available")
✓ stock >= quantity ("Insufficient stock")

After validation:
✓ Generate unique invoiceCode (INV-{timestamp}-{staffId})
✓ Calculate totalAmount
✓ Format receipt text
✓ Return invoice + printFormat
```

---

## 🚨 Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Giỏ hàng trống" | No products in cart | Add products |
| "Vui lòng nhập tên khách hàng" | Customer name empty | Enter customer name |
| "Không đủ hàng! Tồn kho: X" | Not enough stock | Reduce quantity |
| "Sản phẩm không tồn tại" | Product not found | Contact admin |
| "Lỗi tạo hóa đơn: ..." | Backend error | Check server logs |
| "Lỗi thanh toán: ..." | Payment failed | Retry payment |

---

## 📋 Files to Know

| File | Purpose |
|------|---------|
| `src/modules/pos/invoice.service.ts` | Generate & format invoices |
| `src/modules/pos/dto/invoice.dto.ts` | Validate invoice requests |
| `src/modules/pos/sales.controller.ts` | Handle /generate-invoice endpoint |
| `frontend/src/features/staff/pages/StaffPosPage.tsx` | POS UI & logic |

---

## 🎓 Learn More

📖 Full docs in:
- `docs/POS-INVOICE-FEATURE.md`
- `docs/POS-INVOICE-USAGE-GUIDE.md`
- `docs/POS-INVOICE-FLOW-DIAGRAM.md`
- `docs/POS-INVOICE-CODE-EXAMPLES.md`

---

**Version:** 1.0
**Date:** December 24, 2025
**Status:** ✅ Ready
