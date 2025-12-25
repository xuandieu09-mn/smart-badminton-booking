# 🧪 PHASE 1 CHATBOT TESTING SCRIPT
# Date: 2025-12-22
# Purpose: Auto-test 16 test cases from PHASE1-TESTING-GUIDE.md

Write-Host "🚀 PHASE 1 TESTING - System Prompt Enhancement" -ForegroundColor Cyan
Write-Host "=" * 60

$API_URL = "http://localhost:3000/api/chat"
$PASS_COUNT = 0
$FAIL_COUNT = 0
$TOTAL_TESTS = 16

# Function to test chat
function Test-Chat {
    param(
        [string]$TestName,
        [string]$Message,
        [string]$ExpectedKeyword,
        [int]$TestNumber
    )
    
    Write-Host "`n[$TestNumber/$TOTAL_TESTS] $TestName" -ForegroundColor Yellow
    Write-Host "   Question: $Message"
    
    try {
        $body = @{ message = $Message } | ConvertTo-Json -Compress
        $response = Invoke-RestMethod -Uri $API_URL -Method POST -Body $body -ContentType "application/json" -ErrorAction Stop
        
        $reply = $response.reply
        Write-Host "   Bot: $($reply.Substring(0, [Math]::Min(150, $reply.Length)))..." -ForegroundColor Gray
        
        if ($reply -match $ExpectedKeyword) {
            Write-Host "   ✅ PASS - Found keyword: $ExpectedKeyword" -ForegroundColor Green
            return $true
        } else {
            Write-Host "   ❌ FAIL - Missing keyword: $ExpectedKeyword" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "   ❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Wait for backend to be ready
Write-Host "`n⏳ Waiting 3 seconds for backend to be ready..." -ForegroundColor Cyan
Start-Sleep -Seconds 3

# ==================== 1️⃣ GIÁ SÂN ====================
Write-Host "`n" + ("=" * 60)
Write-Host "1️⃣  TESTING: Giá Sân (3 cases)" -ForegroundColor Magenta
Write-Host ("=" * 60)

if (Test-Chat -TestName "Giá sáng" -Message "sân giá bao nhiêu vào sáng?" -ExpectedKeyword "50.000" -TestNumber 1) { $PASS_COUNT++ } else { $FAIL_COUNT++ }
if (Test-Chat -TestName "Giá tối cao điểm" -Message "tối chơi mất bao nhiêu?" -ExpectedKeyword "100.000" -TestNumber 2) { $PASS_COUNT++ } else { $FAIL_COUNT++ }
if (Test-Chat -TestName "Bảng giá tổng quát" -Message "giá sân bao nhiêu?" -ExpectedKeyword "50.000|100.000" -TestNumber 3) { $PASS_COUNT++ } else { $FAIL_COUNT++ }

# ==================== 2️⃣ GIỜ MỞ CỬA ====================
Write-Host "`n" + ("=" * 60)
Write-Host "2️⃣  TESTING: Giờ Mở Cửa (2 cases)" -ForegroundColor Magenta
Write-Host ("=" * 60)

if (Test-Chat -TestName "Giờ mở cửa" -Message "mấy giờ mở cửa?" -ExpectedKeyword "6:00|21:00" -TestNumber 4) { $PASS_COUNT++ } else { $FAIL_COUNT++ }
if (Test-Chat -TestName "Giờ đóng cửa" -Message "đóng cửa khi nào?" -ExpectedKeyword "21:00" -TestNumber 5) { $PASS_COUNT++ } else { $FAIL_COUNT++ }

# ==================== 3️⃣ NGOÀI PHẠM VI ====================
Write-Host "`n" + ("=" * 60)
Write-Host "3️⃣  TESTING: Câu Hỏi Ngoài Phạm Vi (3 cases)" -ForegroundColor Magenta
Write-Host ("=" * 60)

if (Test-Chat -TestName "Nấu ăn (ngoài phạm vi)" -Message "bạn biết nấu phở không?" -ExpectedKeyword "chuyên về|cầu lông|sân" -TestNumber 6) { $PASS_COUNT++ } else { $FAIL_COUNT++ }
if (Test-Chat -TestName "Chính trị (từ chối)" -Message "ai thắng cử tổng thống?" -ExpectedKeyword "chuyên về|cầu lông|sân" -TestNumber 7) { $PASS_COUNT++ } else { $FAIL_COUNT++ }
if (Test-Chat -TestName "Thời tiết (từ chối)" -Message "thời tiết hôm nay thế nào?" -ExpectedKeyword "chuyên về|cầu lông|sân" -TestNumber 8) { $PASS_COUNT++ } else { $FAIL_COUNT++ }

# ==================== 4️⃣ CHÍNH SÁCH ====================
Write-Host "`n" + ("=" * 60)
Write-Host "4️⃣  TESTING: Chính Sách (2 cases)" -ForegroundColor Magenta
Write-Host ("=" * 60)

if (Test-Chat -TestName "Hủy sân" -Message "nếu hủy sân thì mất tiền không?" -ExpectedKeyword "24h|100%" -TestNumber 9) { $PASS_COUNT++ } else { $FAIL_COUNT++ }
if (Test-Chat -TestName "Thanh toán" -Message "cọc bao nhiêu phần trăm?" -ExpectedKeyword "100%" -TestNumber 10) { $PASS_COUNT++ } else { $FAIL_COUNT++ }

# ==================== 5️⃣ POS THAM KHẢO ====================
Write-Host "`n" + ("=" * 60)
Write-Host "5️⃣  TESTING: POS Tham Khảo (2 cases)" -ForegroundColor Magenta
Write-Host ("=" * 60)

if (Test-Chat -TestName "Đồ uống" -Message "có nước gì?" -ExpectedKeyword "Aquafina|Revive|Sting" -TestNumber 11) { $PASS_COUNT++ } else { $FAIL_COUNT++ }
if (Test-Chat -TestName "Vợt" -Message "vợt bao nhiêu?" -ExpectedKeyword "Yonex|1.500.000" -TestNumber 12) { $PASS_COUNT++ } else { $FAIL_COUNT++ }

# ==================== 6️⃣ MARKDOWN FORMATTING ====================
Write-Host "`n" + ("=" * 60)
Write-Host "6️⃣  TESTING: Markdown Formatting (2 cases)" -ForegroundColor Magenta
Write-Host ("=" * 60)

if (Test-Chat -TestName "Liệt kê dịch vụ" -Message "liệt kê các dịch vụ của sân" -ExpectedKeyword "Đặt sân|POS|sân trống" -TestNumber 13) { $PASS_COUNT++ } else { $FAIL_COUNT++ }
if (Test-Chat -TestName "Bảng giá chi tiết" -Message "bảng giá chi tiết" -ExpectedKeyword "06:00|17:00|100.000" -TestNumber 14) { $PASS_COUNT++ } else { $FAIL_COUNT++ }

# ==================== 7️⃣ CHÀO HỎI ====================
Write-Host "`n" + ("=" * 60)
Write-Host "7  TESTING: Chao Hoi va Gioi Thieu" -ForegroundColor Magenta
Write-Host ("=" * 60)

if (Test-Chat -TestName "Chao tieng Viet" -Message "xin chào" -ExpectedKeyword "SmartCourt|AI|giúp" -TestNumber 15) { $PASS_COUNT++ } else { $FAIL_COUNT++ }
if (Test-Chat -TestName "Hello tieng Anh" -Message "hello" -ExpectedKeyword "SmartCourt|AI|giúp" -TestNumber 16) { $PASS_COUNT++ } else { $FAIL_COUNT++ }

# ==================== FINAL RESULTS ====================
Write-Host "`n" + ("=" * 60) -ForegroundColor Cyan
Write-Host "🎯 FINAL RESULTS" -ForegroundColor Cyan
Write-Host ("=" * 60) -ForegroundColor Cyan

$PASS_RATE = [math]::Round(($PASS_COUNT / $TOTAL_TESTS) * 100, 2)

Write-Host "`n✅ PASSED: $PASS_COUNT / $TOTAL_TESTS" -ForegroundColor Green
Write-Host "❌ FAILED: $FAIL_COUNT / $TOTAL_TESTS" -ForegroundColor Red
Write-Host "📊 PASS RATE: $PASS_RATE%" -ForegroundColor $(if ($PASS_RATE -eq 100) { "Green" } else { "Yellow" })

if ($PASS_COUNT -eq $TOTAL_TESTS) {
    Write-Host "`n🎉 PHASE 1 COMPLETE! All tests passed!" -ForegroundColor Green
    Write-Host "✅ Ready to proceed to Phase 2!" -ForegroundColor Green
} else {
    Write-Host "`n⚠️  Some tests failed. Review the results above." -ForegroundColor Yellow
}

Write-Host "`n" + ("=" * 60)
