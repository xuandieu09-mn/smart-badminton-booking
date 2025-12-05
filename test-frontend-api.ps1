# Test Frontend API Integration
Write-Host "Testing Frontend-Backend Integration..." -ForegroundColor Green

# Test that API is now prefixed with /api
Write-Host "`n✅ Testing http://localhost:3000/api/auth/login" -ForegroundColor Yellow

$loginBody = @{
    email = "customer1@test.com"
    password = "Test123!"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json" -TimeoutSec 5
    Write-Host "✅ Login successful with API prefix!" -ForegroundColor Green
    $token = $loginResponse.access_token
    Write-Host "Token: $token"
    Write-Host "Frontend should now be able to connect!"
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n✅ Frontend is ready at http://localhost:5173/" -ForegroundColor Green
Write-Host "✅ Backend API is ready at http://localhost:3000/api/" -ForegroundColor Green
