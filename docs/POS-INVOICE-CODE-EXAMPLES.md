# 💻 CODE EXAMPLES: Invoice System

## Backend Examples

### 1. Invoice Service Usage

```typescript
// In sales.controller.ts
import { InvoiceService } from './invoice.service';

@Post('generate-invoice')
@Roles(Role.STAFF, Role.ADMIN)
async generateInvoice(@Body() dto: GenerateInvoiceDto, @Req() req: any) {
  const staffId = req.user?.sub || req.user?.id;
  
  // Generate preview (no DB changes)
  const invoice = await this.invoiceService.generateInvoicePreview(dto, staffId);
  
  // Format as receipt text
  const printFormat = this.invoiceService.formatInvoiceForPrint(invoice);
  
  return {
    message: 'Invoice generated successfully',
    invoice,
    printFormat,
  };
}
```

### 2. Invoice Service Implementation

```typescript
// invoice.service.ts
async generateInvoicePreview(dto: GenerateInvoiceDto, staffId: number): Promise<Invoice> {
  let totalAmount = 0;
  const invoiceItems: InvoiceItem[] = [];

  // Validate each product
  for (const item of dto.items) {
    const product = await this.prisma.product.findUnique({
      where: { id: item.productId },
    });

    if (!product) {
      throw new NotFoundException(`Product #${item.productId} not found`);
    }

    if (product.stock < item.quantity) {
      throw new BadRequestException(
        `Insufficient stock for "${product.name}". ` +
        `Available: ${product.stock}, Requested: ${item.quantity}`,
      );
    }

    const subtotal = Number(product.price) * item.quantity;
    totalAmount += subtotal;

    invoiceItems.push({
      productId: product.id,
      productName: product.name,
      price: Number(product.price),
      quantity: item.quantity,
      subtotal,
      category: product.category,
    });
  }

  // Get staff info
  const staff = await this.prisma.user.findUnique({
    where: { id: staffId },
    select: { name: true },
  });

  // Generate unique invoice code
  const invoiceCode = `INV-${Date.now()}-${staffId}`;

  return {
    invoiceCode,
    customerName: dto.customerName,
    paymentMethod: dto.paymentMethod,
    items: invoiceItems,
    totalAmount,
    createdAt: new Date().toLocaleString('vi-VN'),
    staffName: staff?.name || 'Unknown Staff',
  };
}
```

### 3. Receipt Formatting

```typescript
// invoice.service.ts - formatInvoiceForPrint()
formatInvoiceForPrint(invoice: Invoice): string {
  const width = 40; // Thermal printer width

  const pad = (str: string, align: 'left' | 'center' | 'right' = 'left') => {
    if (align === 'center') {
      const padding = Math.max(0, (width - str.length) / 2);
      return ' '.repeat(Math.floor(padding)) + str;
    }
    return str.padEnd(width, ' ');
  };

  let receipt = '';

  // Header
  receipt += '='.repeat(width) + '\n';
  receipt += pad('BIÊN LAI BÁN HÀNG', 'center') + '\n';
  receipt += pad('SMART BADMINTON BOOKING', 'center') + '\n';
  receipt += '='.repeat(width) + '\n\n';

  // Invoice info
  receipt += `Mã HĐ: ${invoice.invoiceCode}\n`;
  receipt += `Thời gian: ${invoice.createdAt}\n`;
  receipt += `Nhân viên: ${invoice.staffName}\n`;
  receipt += `Khách hàng: ${invoice.customerName}\n\n`;

  // Items
  receipt += '-'.repeat(width) + '\n';
  receipt += 'Sản phẩm' + ' '.repeat(15) + 'SL' + ' '.repeat(6) + 'TT\n';
  receipt += '-'.repeat(width) + '\n';

  for (const item of invoice.items) {
    const itemName = item.productName.substring(0, 20).padEnd(20);
    const qty = item.quantity.toString().padStart(3);
    const subtotal = this.formatCurrency(item.subtotal).padStart(15);
    
    receipt += `${itemName} ${qty}x ${subtotal}\n`;
  }

  // Total
  receipt += '-'.repeat(width) + '\n';
  receipt += `TỔNG CỘNG:`.padEnd(25) + 
    this.formatCurrency(invoice.totalAmount).padStart(15) + '\n';

  receipt += '\n';
  receipt += pad('Cảm ơn quý khách!', 'center') + '\n';
  receipt += '='.repeat(width) + '\n';

  return receipt;
}

private formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
}
```

---

## Frontend Examples

### 1. Generate Invoice Function

```typescript
// StaffPosPage.tsx
const generateInvoice = async () => {
  // Validation
  if (cart.length === 0) {
    alert('⚠️ Giỏ hàng trống');
    return;
  }

  if (!customerName.trim()) {
    alert('⚠️ Vui lòng nhập tên khách hàng');
    return;
  }

  setIsGeneratingInvoice(true);

  try {
    const { data } = await API.post(
      '/pos/sales/generate-invoice',
      {
        items: cart.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
        customerName: customerName.trim(),
        paymentMethod: paymentMethod,
      },
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    setInvoice(data.invoice);
    setPrintFormat(data.printFormat);
    setShowInvoiceModal(true);
  } catch (error: any) {
    alert('❌ Lỗi tạo hóa đơn: ' + error.response?.data?.message);
  } finally {
    setIsGeneratingInvoice(false);
  }
};
```

### 2. Print Invoice Function

```typescript
// StaffPosPage.tsx
const handlePrintInvoice = () => {
  if (!printFormat) return;

  const printWindow = window.open('', '', 'width=400,height=600');
  if (printWindow) {
    printWindow.document.write(`
      <html>
        <head>
          <title>Biên lai bán hàng</title>
          <style>
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              margin: 0;
              padding: 10px;
            }
            pre {
              white-space: pre-wrap;
              word-wrap: break-word;
            }
          </style>
        </head>
        <body>
          <pre>${printFormat}</pre>
          <script>
            window.print();
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }
};
```

### 3. Confirm Payment Function

```typescript
// StaffPosPage.tsx
const handleConfirmPayment = async () => {
  if (!invoice) return;

  setLoading(true);

  try {
    const { data } = await API.post(
      '/pos/sales',
      {
        items: cart.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
        customerName: customerName.trim(),
        paymentMethod: paymentMethod,
      },
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    // Success
    alert(`✅ Thanh toán thành công!\nMã đơn: ${data.sale.saleCode}`);

    // Reset state
    setCart([]);
    setCustomerName('');
    setShowInvoiceModal(false);
    setInvoice(null);
    setPrintFormat('');
    fetchProducts(); // Refresh stock
  } catch (error: any) {
    alert('❌ Lỗi thanh toán: ' + error.response?.data?.message);
  } finally {
    setLoading(false);
  }
};
```

### 4. Invoice Modal Component (Simplified)

```typescript
// In return JSX
{showInvoiceModal && invoice && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full p-6">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 rounded-t-lg mb-4">
        <h2 className="text-2xl font-bold">📄 Biên Lai Bán Hàng</h2>
        <p className="text-sm">Mã HĐ: {invoice.invoiceCode}</p>
      </div>

      {/* Invoice Info */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold">Khách hàng</label>
            <p className="font-bold">{invoice.customerName}</p>
          </div>
          <div>
            <label className="text-xs font-semibold">Nhân viên</label>
            <p className="font-bold">{invoice.staffName}</p>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full text-sm mb-6">
        <thead className="bg-gray-100">
          <tr>
            <th className="text-left p-2">Sản phẩm</th>
            <th className="text-center p-2">SL</th>
            <th className="text-right p-2">Đơn giá</th>
            <th className="text-right p-2">Tổng</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item) => (
            <tr key={item.productId} className="border-b">
              <td className="p-2">{item.productName}</td>
              <td className="text-center p-2">{item.quantity}</td>
              <td className="text-right p-2">
                {new Intl.NumberFormat('vi-VN').format(item.price)}đ
              </td>
              <td className="text-right p-2 font-bold text-blue-600">
                {new Intl.NumberFormat('vi-VN').format(item.subtotal)}đ
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Total */}
      <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200 mb-6">
        <div className="flex justify-between">
          <span className="font-bold">TỔNG CỘNG:</span>
          <span className="text-2xl font-bold text-blue-600">
            {new Intl.NumberFormat('vi-VN', {
              style: 'currency',
              currency: 'VND',
            }).format(invoice.totalAmount)}
          </span>
        </div>
      </div>

      {/* Receipt Preview */}
      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-xs mb-6 overflow-x-auto">
        <pre className="whitespace-pre-wrap">{printFormat}</pre>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handlePrintInvoice}
          className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 rounded-lg"
        >
          🖨️ In hóa đơn
        </button>
        <button
          onClick={handleConfirmPayment}
          disabled={loading}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg"
        >
          {loading ? '⏳ Đang xử lý...' : '✅ Xác nhận thanh toán'}
        </button>
        <button
          onClick={() => setShowInvoiceModal(false)}
          className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg"
        >
          ❌ Huỷ
        </button>
      </div>
    </div>
  </div>
)}
```

---

## API Examples

### Request: Generate Invoice

```bash
curl -X POST http://localhost:3000/api/pos/sales/generate-invoice \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      { "productId": 1, "quantity": 2 },
      { "productId": 3, "quantity": 1 }
    ],
    "customerName": "Nguyễn Văn A",
    "paymentMethod": "CASH"
  }'
```

### Response: Generated Invoice

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
      {
        "productId": 1,
        "productName": "Nước cam",
        "price": 20000,
        "quantity": 2,
        "subtotal": 40000,
        "category": "BEVERAGE"
      },
      {
        "productId": 3,
        "productName": "Ống cầu",
        "price": 30000,
        "quantity": 1,
        "subtotal": 30000,
        "category": "SHUTTLECOCK"
      }
    ],
    "totalAmount": 70000
  },
  "printFormat": "════════════════════════════════════════\n        BIÊN LAI BÁN HÀNG\n    SMART BADMINTON BOOKING\n════════════════════════════════════════\n\nMã HĐ: INV-1703419200000-5\n..."
}
```

### Request: Confirm Payment

```bash
curl -X POST http://localhost:3000/api/pos/sales \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      { "productId": 1, "quantity": 2 },
      { "productId": 3, "quantity": 1 }
    ],
    "customerName": "Nguyễn Văn A",
    "paymentMethod": "CASH"
  }'
```

### Response: Sale Created

```json
{
  "message": "Sale created successfully",
  "sale": {
    "id": 1001,
    "saleCode": "SALE-1001",
    "totalAmount": 70000,
    "paymentMethod": "CASH",
    "customerName": "Nguyễn Văn A",
    "staffId": 5,
    "createdAt": "2025-12-24T14:30:00Z",
    "items": [
      {
        "id": 2001,
        "saleId": 1001,
        "productId": 1,
        "quantity": 2,
        "unitPrice": 20000,
        "subtotal": 40000
      }
    ]
  }
}
```
