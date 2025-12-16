# Test script for Booking Completion Flow (PowerShell)

Write-Host "🧪 Testing Booking Completion Flow" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan

# Backend URL
$BASE_URL = "http://localhost:3000/api"

# Test credentials
$STAFF_EMAIL = "staff1@test.com"
$STAFF_PASSWORD = "password123"

Write-Host ""
Write-Host "1. Login as Staff..." -ForegroundColor Yellow

$loginBody = @{
    email = $STAFF_EMAIL
    password = $STAFF_PASSWORD
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$BASE_URL/auth/login" `
        -Method Post `
        -ContentType "application/json" `
        -Body $loginBody
    
    $TOKEN = $loginResponse.access_token
    
    if (-not $TOKEN) {
        Write-Host "❌ Login failed. Check credentials." -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ Login successful. Token: $($TOKEN.Substring(0, [Math]::Min(20, $TOKEN.Length)))..." -ForegroundColor Green
} catch {
    Write-Host "❌ Login failed: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "2. Get all bookings..." -ForegroundColor Yellow

$headers = @{
    Authorization = "Bearer $TOKEN"
}

try {
    $bookings = Invoke-RestMethod -Uri "$BASE_URL/bookings" `
        -Method Get `
        -Headers $headers
    
    Write-Host "✅ Retrieved $($bookings.Count) bookings" -ForegroundColor Green
    
    # Display bookings
    $bookings | ForEach-Object {
        Write-Host "   - ID: $($_.id) | Code: $($_.bookingCode) | Status: $($_.status)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Failed to get bookings: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "3. Find a CHECKED_IN booking for testing..." -ForegroundColor Yellow

$checkedInBooking = $bookings | Where-Object { $_.status -eq "CHECKED_IN" } | Select-Object -First 1

if (-not $checkedInBooking) {
    Write-Host "⚠️  No CHECKED_IN booking found. Create one first." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "📝 To create a test booking:" -ForegroundColor Cyan
    Write-Host "   1. Login as customer" -ForegroundColor Gray
    Write-Host "   2. Create a booking" -ForegroundColor Gray
    Write-Host "   3. Pay for it (status becomes CONFIRMED)" -ForegroundColor Gray
    Write-Host "   4. Staff check-in (status becomes CHECKED_IN)" -ForegroundColor Gray
    Write-Host ""
    exit 0
}

$CHECKED_IN_ID = $checkedInBooking.id
Write-Host "✅ Found CHECKED_IN booking: ID=$CHECKED_IN_ID, Code=$($checkedInBooking.bookingCode)" -ForegroundColor Green

Write-Host ""
Write-Host "4. Manually finish the booking..." -ForegroundColor Yellow

try {
    $finishResponse = Invoke-RestMethod -Uri "$BASE_URL/bookings/$CHECKED_IN_ID/finish" `
        -Method Post `
        -Headers $headers
    
    Write-Host "✅ Response:" -ForegroundColor Green
    $finishResponse | ConvertTo-Json -Depth 3 | Write-Host
    
    if ($finishResponse.booking.status -eq "COMPLETED") {
        Write-Host ""
        Write-Host "✅ SUCCESS! Booking manually completed" -ForegroundColor Green
        Write-Host "   - Booking ID: $CHECKED_IN_ID" -ForegroundColor Gray
        Write-Host "   - Booking Code: $($finishResponse.booking.bookingCode)" -ForegroundColor Gray
        Write-Host "   - New Status: COMPLETED" -ForegroundColor Gray
        Write-Host "   - Finished By: $($finishResponse.finishedBy)" -ForegroundColor Gray
    } else {
        Write-Host "❌ FAILED to complete booking" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Failed to finish booking: $_" -ForegroundColor Red
    Write-Host $_.Exception.Response.StatusCode -ForegroundColor Red
}

Write-Host ""
Write-Host "5. Verify court status updated..." -ForegroundColor Yellow

try {
    $courtStatus = Invoke-RestMethod -Uri "$BASE_URL/courts/realtime-status" `
        -Method Get `
        -Headers $headers
    
    Write-Host "✅ Court Status:" -ForegroundColor Green
    $courtStatus.courts | ForEach-Object {
        $currentBookingInfo = if ($_.currentBooking) { $_.currentBooking.bookingCode } else { "None" }
        Write-Host "   - $($_.courtName): $($_.status) | Current: $currentBookingInfo" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "📊 Summary:" -ForegroundColor Cyan
    Write-Host "   - Total Courts: $($courtStatus.summary.totalCourts)" -ForegroundColor Gray
    Write-Host "   - Available: $($courtStatus.summary.available)" -ForegroundColor Green
    Write-Host "   - Occupied: $($courtStatus.summary.occupied)" -ForegroundColor Red
    Write-Host "   - Reserved: $($courtStatus.summary.reserved)" -ForegroundColor Yellow
} catch {
    Write-Host "⚠️  Failed to get court status: $_" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "✅ Test completed!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Open Staff Dashboard: http://localhost:5173/staff" -ForegroundColor Gray
Write-Host "   2. Verify COMPLETED badge (gray, ✅)" -ForegroundColor Gray
Write-Host "   3. Check court monitor shows available" -ForegroundColor Gray
Write-Host "   4. Wait 5 min for cron to auto-complete other bookings" -ForegroundColor Gray
Write-Host ""
