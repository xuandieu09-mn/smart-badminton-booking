# Test Fixed Schedule Booking API
# Prerequisites: User must be logged in and have sufficient wallet balance

$baseUrl = "http://localhost:3000"

# Step 1: Login to get access token
Write-Host "`n=== LOGIN ===" -ForegroundColor Cyan
$loginBody = @{
    email = "customer1@test.com"
    password = "password123"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
$token = $loginResponse.accessToken
Write-Host "✅ Logged in as: $($loginResponse.user.email)" -ForegroundColor Green
Write-Host "Token: $token`n"

# Step 2: Check wallet balance
Write-Host "`n=== CHECK WALLET BALANCE ===" -ForegroundColor Cyan
$headers = @{
    Authorization = "Bearer $token"
}

$wallet = Invoke-RestMethod -Uri "$baseUrl/wallet/balance" -Method Get -Headers $headers
Write-Host "💰 Current wallet balance: $($wallet.balance) VND`n" -ForegroundColor Yellow

# Step 3: Create fixed schedule booking
# Book Court 1 every Monday and Wednesday at 18:00-20:00 for 2 weeks
Write-Host "`n=== CREATE FIXED SCHEDULE BOOKING ===" -ForegroundColor Cyan

$bookingBody = @{
    courtId = 1
    startDate = "2025-12-30"  # Monday
    endDate = "2026-01-13"    # 2 weeks later
    daysOfWeek = @(1, 3)      # Monday (1) and Wednesday (3)
    startTime = "18:00"
    endTime = "20:00"
} | ConvertTo-Json

Write-Host "📅 Booking details:" -ForegroundColor Cyan
Write-Host "Court: 1"
Write-Host "Period: 2025-12-30 to 2026-01-13"
Write-Host "Days: Monday, Wednesday"
Write-Host "Time: 18:00 - 20:00`n"

try {
    $bookingResponse = Invoke-RestMethod -Uri "$baseUrl/bookings/fixed" -Method Post -Body $bookingBody -Headers $headers -ContentType "application/json"
    
    Write-Host "`n✅ SUCCESS!" -ForegroundColor Green
    Write-Host "`nBooking Group Created:" -ForegroundColor Cyan
    Write-Host "ID: $($bookingResponse.bookingGroup.id)"
    Write-Host "Total Sessions: $($bookingResponse.bookingGroup.totalSessions)"
    Write-Host "Original Price: $($bookingResponse.bookingGroup.originalPrice) VND"
    Write-Host "Discount Rate: $($bookingResponse.bookingGroup.discountRate)%"
    Write-Host "Discount Amount: $($bookingResponse.bookingGroup.discountAmount) VND" -ForegroundColor Yellow
    Write-Host "Final Price: $($bookingResponse.bookingGroup.finalPrice) VND" -ForegroundColor Green
    Write-Host "Status: $($bookingResponse.bookingGroup.status)"
    
    Write-Host "`n📦 Individual Bookings Created: $($bookingResponse.bookings.Count)" -ForegroundColor Cyan
    foreach ($booking in $bookingResponse.bookings) {
        Write-Host "  - $($booking.date) | $($booking.bookingCode) | $($booking.price) VND | $($booking.status)"
    }
    
    Write-Host "`n💼 New Wallet Balance: $($bookingResponse.wallet.newBalance) VND" -ForegroundColor Yellow
    
    Write-Host "`n📊 Summary:" -ForegroundColor Cyan
    Write-Host "Court: $($bookingResponse.summary.courtName)"
    Write-Host "Schedule: $($bookingResponse.summary.schedule)"
    Write-Host "Period: $($bookingResponse.summary.period)"
    Write-Host "Discount: $($bookingResponse.summary.discount)" -ForegroundColor Yellow
    
} catch {
    Write-Host "`n❌ ERROR!" -ForegroundColor Red
    Write-Host $_.Exception.Message
    if ($_.ErrorDetails.Message) {
        $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "`nError Details:" -ForegroundColor Red
        Write-Host $errorDetails.message
    }
}

Write-Host "`n=== TEST COMPLETE ===" -ForegroundColor Cyan
