# Test API Script
Write-Host "Testing Smart Badminton Booking API..." -ForegroundColor Green

# Test 1: Register new user
Write-Host "`n1. Testing POST /auth/register..." -ForegroundColor Yellow
$registerBody = @{
    email = "customer1@test.com"
    password = "Test123!"
    fullName = ""
    phoneNumber = ""
    role = "CUSTOMER"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/auth/register" -Method Post -Body $registerBody -ContentType "application/json"
    Write-Host "✅ Registration successful!" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json -Depth 3)
} catch {
    Write-Host "❌ Registration failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails) {
        Write-Host ($_.ErrorDetails.Message)
    }
}

# Test 2: Login
Write-Host "`n2. Testing POST /auth/login..." -ForegroundColor Yellow
$loginBody = @{
    email = "customer1@test.com"
    password = "Test123!"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:3000/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    Write-Host "✅ Login successful!" -ForegroundColor Green
    $token = $loginResponse.access_token
    Write-Host "Token: $token"
    
    # Test 3: Get profile with token
    Write-Host "`n3. Testing GET /users/profile (with JWT)..." -ForegroundColor Yellow
    $headers = @{
        Authorization = "Bearer $token"
    }
    
    $profile = Invoke-RestMethod -Uri "http://localhost:3000/users/profile" -Method Get -Headers $headers
    Write-Host "✅ Profile retrieved!" -ForegroundColor Green
    Write-Host ($profile | ConvertTo-Json -Depth 3)
    
} catch {
    Write-Host "❌ Request failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails) {
        Write-Host ($_.ErrorDetails.Message)
    }
}

Write-Host "`n✅ API tests completed!" -ForegroundColor Green
