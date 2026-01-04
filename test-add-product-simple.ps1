# Test Add Product API
$baseUrl = "http://localhost:3000/api"

# Login as admin
Write-Host "[1/4] Login as admin..." -ForegroundColor Yellow
try {
  $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body (@{
    email = "admin@badminton.com"
    password = "Admin@123"
  } | ConvertTo-Json) -ContentType "application/json"

  $token = $loginResponse.accessToken
  Write-Host "Login successful!" -ForegroundColor Green
  Write-Host "Token: $($token.Substring(0, 20))..." -ForegroundColor Cyan
} catch {
  Write-Host "Login failed: $_" -ForegroundColor Red
  exit 1
}

# Add test products
Write-Host "`n[2/4] Adding test products..." -ForegroundColor Yellow
$products = @(
  @{
    name = "Cau Yonex AS-50"
    category = "SHUTTLECOCK"
    price = 150000
    stock = 50
    description = "Cau lon cao cap Yonex"
  },
  @{
    name = "Nuoc suoi Aquafina"
    category = "BEVERAGE"
    price = 5000
    stock = 200
    description = "Nuoc suoi tinh khiet"
  },
  @{
    name = "Nuoc uong Revive"
    category = "BEVERAGE"
    price = 10000
    stock = 100
    description = "Nuoc tang luc"
  },
  @{
    name = "Quan can vot"
    category = "ACCESSORY"
    price = 20000
    stock = 80
    description = "Quan can vot chuyen nghiep"
  },
  @{
    name = "Vot Yonex Astrox 99"
    category = "EQUIPMENT"
    price = 3500000
    stock = 10
    description = "Vot cau long chuyen nghiep"
  }
)

$addedCount = 0
foreach ($product in $products) {
  try {
    Write-Host "  Sending request with token: $($token.Substring(0, 20))..." -ForegroundColor Gray
    $result = Invoke-RestMethod -Uri "$baseUrl/pos/products" -Method Post -Body ($product | ConvertTo-Json) -ContentType "application/json" -Headers @{
      Authorization = "Bearer $token"
    }
    Write-Host "  + Added: $($product.name)" -ForegroundColor Green
    $addedCount++
  } catch {
    Write-Host "  - Failed: $($product.name)" -ForegroundColor Red
    Write-Host "    Error: $($_.Exception.Response.StatusCode) - $($_.Exception.Message)" -ForegroundColor Red
  }
}

Write-Host "Added $addedCount/$($products.Count) products" -ForegroundColor Cyan

# Get all products
Write-Host "`n[3/4] Fetching all products..." -ForegroundColor Yellow
try {
  $allProducts = Invoke-RestMethod -Uri "$baseUrl/pos/products" -Method Get -Headers @{
    Authorization = "Bearer $token"
  }

  Write-Host "Total products in database: $($allProducts.Count)" -ForegroundColor Green
  Write-Host "Latest 5 products:" -ForegroundColor Cyan
  $allProducts | Select-Object -Last 5 | ForEach-Object {
    Write-Host "  - $($_.name) ($($_.category)) - Stock: $($_.stock)" -ForegroundColor White
  }
} catch {
  Write-Host "Failed to fetch products: $_" -ForegroundColor Red
}

# Get inventory stats
Write-Host "`n[4/4] Getting inventory statistics..." -ForegroundColor Yellow
try {
  $stats = Invoke-RestMethod -Uri "$baseUrl/inventory/stats" -Method Get -Headers @{
    Authorization = "Bearer $token"
  }

  Write-Host "Inventory Stats:" -ForegroundColor Green
  Write-Host "  Total Products: $($stats.totalProducts)" -ForegroundColor Cyan
  Write-Host "  Low Stock: $($stats.lowStock)" -ForegroundColor Yellow
  Write-Host "  Out of Stock: $($stats.outOfStock)" -ForegroundColor Red
  Write-Host "  Total Value: $($stats.totalValue) VND" -ForegroundColor Green
} catch {
  Write-Host "Stats endpoint not available" -ForegroundColor Yellow
}

Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host "TEST COMPLETED!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Open frontend: http://localhost:5173/admin/inventory"
Write-Host "2. Login with admin@badminton.com / Admin@123"
Write-Host "3. Verify products have been added to inventory"
