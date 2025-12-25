# PHASE 1 CHATBOT TESTING SCRIPT
# Simplified version - ASCII only

Write-Host "PHASE 1 TESTING - System Prompt Enhancement" -ForegroundColor Cyan
Write-Host "============================================================"

$API_URL = "http://localhost:3000/api/chat"
$PASS = 0
$FAIL = 0
$TOTAL = 16

function Test-Chat {
    param([string]$Name, [string]$Msg, [string]$Keyword, [int]$Num)
    
    Write-Host "`n[$Num/$TOTAL] $Name"
    Write-Host "Q: $Msg"
    
    try {
        $body = @{ message = $Msg } | ConvertTo-Json
        $res = Invoke-RestMethod -Uri $API_URL -Method POST -Body $body -ContentType "application/json"
        
        $reply = $res.reply
        if ($reply.Length -gt 100) {
            Write-Host "A: $($reply.Substring(0,100))..." -ForegroundColor Gray
        } else {
            Write-Host "A: $reply" -ForegroundColor Gray
        }
        
        if ($reply -match $Keyword) {
            Write-Host "PASS - Found: $Keyword" -ForegroundColor Green
            return $true
        } else {
            Write-Host "FAIL - Missing: $Keyword" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

Write-Host "`nWaiting for backend..." -ForegroundColor Cyan
Start-Sleep -Seconds 3

Write-Host "`n============================================================"
Write-Host "1. GIA SAN" -ForegroundColor Magenta
Write-Host "============================================================"
if (Test-Chat -Name "Gia sang" -Msg "sân giá bao nhiêu vào sáng?" -Keyword "50.000" -Num 1) { $PASS++ } else { $FAIL++ }
if (Test-Chat -Name "Gia toi" -Msg "tối chơi mất bao nhiêu?" -Keyword "100.000" -Num 2) { $PASS++ } else { $FAIL++ }
if (Test-Chat -Name "Bang gia" -Msg "giá sân bao nhiêu?" -Keyword "50.000|100.000" -Num 3) { $PASS++ } else { $FAIL++ }

Write-Host "`n============================================================"
Write-Host "2. GIO MO CUA" -ForegroundColor Magenta
Write-Host "============================================================"
if (Test-Chat -Name "Gio mo" -Msg "mấy giờ mở cửa?" -Keyword "6:00|21:00" -Num 4) { $PASS++ } else { $FAIL++ }
if (Test-Chat -Name "Gio dong" -Msg "đóng cửa khi nào?" -Keyword "21:00" -Num 5) { $PASS++ } else { $FAIL++ }

Write-Host "`n============================================================"
Write-Host "3. NGOAI PHAM VI" -ForegroundColor Magenta
Write-Host "============================================================"
if (Test-Chat -Name "Nau an" -Msg "bạn biết nấu phở không?" -Keyword "chuyên về|cầu lông" -Num 6) { $PASS++ } else { $FAIL++ }
if (Test-Chat -Name "Chinh tri" -Msg "ai thắng cử tổng thống?" -Keyword "chuyên về|cầu lông" -Num 7) { $PASS++ } else { $FAIL++ }
if (Test-Chat -Name "Thoi tiet" -Msg "thời tiết hôm nay thế nào?" -Keyword "chuyên về|cầu lông" -Num 8) { $PASS++ } else { $FAIL++ }

Write-Host "`n============================================================"
Write-Host "4. CHINH SACH" -ForegroundColor Magenta
Write-Host "============================================================"
if (Test-Chat -Name "Huy san" -Msg "nếu hủy sân thì mất tiền không?" -Keyword "24h|100%" -Num 9) { $PASS++ } else { $FAIL++ }
if (Test-Chat -Name "Thanh toan" -Msg "cọc bao nhiêu phần trăm?" -Keyword "100%" -Num 10) { $PASS++ } else { $FAIL++ }

Write-Host "`n============================================================"
Write-Host "5. POS PRODUCTS" -ForegroundColor Magenta
Write-Host "============================================================"
if (Test-Chat -Name "Do uong" -Msg "có nước gì?" -Keyword "Aquafina|Revive|Sting" -Num 11) { $PASS++ } else { $FAIL++ }
if (Test-Chat -Name "Vot" -Msg "vợt bao nhiêu?" -Keyword "Yonex|1.500.000" -Num 12) { $PASS++ } else { $FAIL++ }

Write-Host "`n============================================================"
Write-Host "6. MARKDOWN FORMAT" -ForegroundColor Magenta
Write-Host "============================================================"
if (Test-Chat -Name "Liet ke" -Msg "liệt kê các dịch vụ của sân" -Keyword "Đặt sân|POS|sân trống" -Num 13) { $PASS++ } else { $FAIL++ }
if (Test-Chat -Name "Bang gia chi tiet" -Msg "bảng giá chi tiết" -Keyword "06:00|17:00|100.000" -Num 14) { $PASS++ } else { $FAIL++ }

Write-Host "`n============================================================"
Write-Host "7. CHAO HOI" -ForegroundColor Magenta
Write-Host "============================================================"
if (Test-Chat -Name "Chao Viet" -Msg "xin chào" -Keyword "SmartCourt|AI" -Num 15) { $PASS++ } else { $FAIL++ }
if (Test-Chat -Name "Hello" -Msg "hello" -Keyword "SmartCourt|AI" -Num 16) { $PASS++ } else { $FAIL++ }

$PassRate = [math]::Round(($PASS / $TOTAL) * 100, 2)

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "FINAL RESULTS" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "`nPASSED: $PASS / $TOTAL" -ForegroundColor Green
Write-Host "FAILED: $FAIL / $TOTAL" -ForegroundColor Red
Write-Host "PASS RATE: $PassRate%" -ForegroundColor Yellow

if ($PASS -eq $TOTAL) {
    Write-Host "`nPHASE 1 COMPLETE! All tests passed!" -ForegroundColor Green
} else {
    Write-Host "`nSome tests failed. Review above." -ForegroundColor Yellow
}
