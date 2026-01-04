# Test API: Thêm sản phẩm mới (POS)

## 1. Login với Admin account
```bash
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "admin@smartcourt.vn",
  "password": "admin123"
}
```

**Response:** Lấy `accessToken`

---

## 2. Thêm sản phẩm mới
```bash
POST http://localhost:3000/api/pos/products
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "name": "Cầu Yonex AS30",
  "category": "SHUTTLECOCK",
  "price": 180000,
  "stock": 50,
  "description": "Cầu lông Yonex AS30 - Hàng chính hãng"
}
```

**Expected Response:**
```json
{
  "message": "Product created successfully",
  "product": {
    "id": 1,
    "name": "Cầu Yonex AS30",
    "category": "SHUTTLECOCK",
    "price": 180000,
    "stock": 50,
    "description": "Cầu lông Yonex AS30 - Hàng chính hãng",
    "isActive": true,
    "createdAt": "2026-01-03T...",
    "updatedAt": "2026-01-03T..."
  }
}
```

---

## 3. Lấy danh sách sản phẩm
```bash
GET http://localhost:3000/api/pos/products
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Expected Response:**
```json
{
  "products": [
    {
      "id": 1,
      "name": "Cầu Yonex AS30",
      "category": "SHUTTLECOCK",
      "price": 180000,
      "stock": 50,
      ...
    }
  ]
}
```

---

## 4. Test Categories

### Ống cầu
```json
{
  "name": "Cầu RSL Classic",
  "category": "SHUTTLECOCK",
  "price": 120000,
  "stock": 100
}
```

### Nước uống
```json
{
  "name": "Nước Aquafina 500ml",
  "category": "BEVERAGE",
  "price": 10000,
  "stock": 200
}
```

### Phụ kiện
```json
{
  "name": "Quấn cán Yonex AC102",
  "category": "ACCESSORY",
  "price": 25000,
  "stock": 50
}
```

### Dụng cụ
```json
{
  "name": "Vợt cầu lông Yonex Astrox 99",
  "category": "EQUIPMENT",
  "price": 3500000,
  "stock": 10
}
```

---

## PowerShell Script Test

```powershell
# File: test-add-product.ps1

$baseUrl = "http://localhost:3000/api"

# 1. Login
Write-Host "🔐 Logging in as admin..." -ForegroundColor Yellow
$loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -ContentType "application/json" -Body (@{
  email = "admin@smartcourt.vn"
  password = "admin123"
} | ConvertTo-Json)

$token = $loginResponse.access_token
Write-Host "✅ Login successful. Token: $($token.Substring(0,20))..." -ForegroundColor Green

# 2. Add Product
Write-Host "`n➕ Adding new product..." -ForegroundColor Yellow
$productResponse = Invoke-RestMethod -Uri "$baseUrl/pos/products" -Method Post -Headers @{
  Authorization = "Bearer $token"
  "Content-Type" = "application/json"
} -Body (@{
  name = "Cầu Yonex AS30"
  category = "SHUTTLECOCK"
  price = 180000
  stock = 50
  description = "Cầu lông Yonex AS30 - Hàng chính hãng"
} | ConvertTo-Json)

Write-Host "✅ Product added successfully!" -ForegroundColor Green
Write-Host "Product ID: $($productResponse.product.id)" -ForegroundColor Cyan
Write-Host "Name: $($productResponse.product.name)" -ForegroundColor Cyan
Write-Host "Price: $($productResponse.product.price) VNĐ" -ForegroundColor Cyan
Write-Host "Stock: $($productResponse.product.stock)" -ForegroundColor Cyan

# 3. Get all products
Write-Host "`n📦 Fetching all products..." -ForegroundColor Yellow
$allProducts = Invoke-RestMethod -Uri "$baseUrl/pos/products" -Method Get -Headers @{
  Authorization = "Bearer $token"
}

Write-Host "✅ Total products: $($allProducts.products.Count)" -ForegroundColor Green
$allProducts.products | ForEach-Object {
  Write-Host "  - $($_.name) [$($_.category)] - $($_.price)đ (Stock: $($_.stock))" -ForegroundColor White
}
```

---

## Testing Flow

1. **Khởi động backend:**
   ```bash
   npm run start:dev
   ```

2. **Chạy PowerShell script:**
   ```powershell
   .\test-add-product.ps1
   ```

3. **Test trên Frontend:**
   - Login với admin account
   - Vào `/admin/inventory`
   - Click nút **"➕ Thêm sản phẩm mới"**
   - Điền form:
     - Tên: Cầu Yonex AS30
     - Danh mục: 🏸 Ống cầu
     - Giá: 180000
     - Số lượng: 50
     - Mô tả: Cầu lông Yonex AS30 - Hàng chính hãng
   - Click **"✅ Thêm sản phẩm"**
   - Verify: Sản phẩm xuất hiện trong bảng

---

## Expected Database Entry

```sql
-- Query to verify
SELECT * FROM "Product" ORDER BY "createdAt" DESC LIMIT 1;
```

**Result:**
```
id | name              | category    | price  | stock | isActive
---|-------------------|-------------|--------|-------|----------
1  | Cầu Yonex AS30    | SHUTTLECOCK | 180000 | 50    | true
```
