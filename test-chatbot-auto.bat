@echo off
echo ============================================================
echo PHASE 1 CHATBOT TESTING - Automated Test Suite
echo ============================================================
echo.

set PASS=0
set FAIL=0

echo [1/16] Test: Gia sang
curl -s -X POST http://localhost:3000/api/chat -H "Content-Type: application/json" -d "{\"message\":\"gia sang\"}" > temp.json
findstr /C:"50.000" temp.json >nul && (echo PASS & set /a PASS+=1) || (echo FAIL & set /a FAIL+=1)
echo.

echo [2/16] Test: Gia toi
curl -s -X POST http://localhost:3000/api/chat -H "Content-Type: application/json" -d "{\"message\":\"gia toi\"}" > temp.json
findstr /C:"100.000" temp.json >nul && (echo PASS & set /a PASS+=1) || (echo FAIL & set /a FAIL+=1)
echo.

echo [3/16] Test: Bang gia
curl -s -X POST http://localhost:3000/api/chat -H "Content-Type: application/json" -d "{\"message\":\"bang gia\"}" > temp.json
findstr /C:"50.000" temp.json >nul && (echo PASS & set /a PASS+=1) || (echo FAIL & set /a FAIL+=1)
echo.

echo [4/16] Test: Gio mo cua
curl -s -X POST http://localhost:3000/api/chat -H "Content-Type: application/json" -d "{\"message\":\"gio mo cua\"}" > temp.json
findstr /C:"6:00" temp.json >nul && (echo PASS & set /a PASS+=1) || (echo FAIL & set /a FAIL+=1)
echo.

echo [5/16] Test: Dong cua
curl -s -X POST http://localhost:3000/api/chat -H "Content-Type: application/json" -d "{\"message\":\"dong cua khi nao\"}" > temp.json
findstr /C:"21:00" temp.json >nul && (echo PASS & set /a PASS+=1) || (echo FAIL & set /a FAIL+=1)
echo.

echo [6/16] Test: Nau pho (ngoai pham vi)
curl -s -X POST http://localhost:3000/api/chat -H "Content-Type: application/json" -d "{\"message\":\"ban biet nau pho khong\"}" > temp.json
findstr /C:"chuyen" temp.json >nul && (echo PASS & set /a PASS+=1) || (echo FAIL & set /a FAIL+=1)
echo.

echo [7/16] Test: Chinh tri (ngoai pham vi)
curl -s -X POST http://localhost:3000/api/chat -H "Content-Type: application/json" -d "{\"message\":\"ai thang cu tong thong\"}" > temp.json
findstr /C:"chuyen" temp.json >nul && (echo PASS & set /a PASS+=1) || (echo FAIL & set /a FAIL+=1)
echo.

echo [8/16] Test: Thoi tiet (ngoai pham vi)
curl -s -X POST http://localhost:3000/api/chat -H "Content-Type: application/json" -d "{\"message\":\"thoi tiet hom nay\"}" > temp.json
findstr /C:"chuyen" temp.json >nul && (echo PASS & set /a PASS+=1) || (echo FAIL & set /a FAIL+=1)
echo.

echo [9/16] Test: Huy san
curl -s -X POST http://localhost:3000/api/chat -H "Content-Type: application/json" -d "{\"message\":\"huy san mat tien khong\"}" > temp.json
findstr /C:"24h" temp.json >nul && (echo PASS & set /a PASS+=1) || (echo FAIL & set /a FAIL+=1)
echo.

echo [10/16] Test: Thanh toan
curl -s -X POST http://localhost:3000/api/chat -H "Content-Type: application/json" -d "{\"message\":\"coc bao nhieu\"}" > temp.json
findstr /C:"100" temp.json >nul && (echo PASS & set /a PASS+=1) || (echo FAIL & set /a FAIL+=1)
echo.

echo [11/16] Test: Do uong
curl -s -X POST http://localhost:3000/api/chat -H "Content-Type: application/json" -d "{\"message\":\"co nuoc gi\"}" > temp.json
findstr /C:"Aquafina" temp.json >nul && (echo PASS & set /a PASS+=1) || (echo FAIL & set /a FAIL+=1)
echo.

echo [12/16] Test: Vot
curl -s -X POST http://localhost:3000/api/chat -H "Content-Type: application/json" -d "{\"message\":\"vot bao nhieu\"}" > temp.json
findstr /C:"Yonex" temp.json >nul && (echo PASS & set /a PASS+=1) || (echo FAIL & set /a FAIL+=1)
echo.

echo [13/16] Test: Liet ke dich vu
curl -s -X POST http://localhost:3000/api/chat -H "Content-Type: application/json" -d "{\"message\":\"liet ke dich vu\"}" > temp.json
findstr /C:"san" temp.json >nul && (echo PASS & set /a PASS+=1) || (echo FAIL & set /a FAIL+=1)
echo.

echo [14/16] Test: Bang gia chi tiet
curl -s -X POST http://localhost:3000/api/chat -H "Content-Type: application/json" -d "{\"message\":\"bang gia chi tiet\"}" > temp.json
findstr /C:"06:00" temp.json >nul && (echo PASS & set /a PASS+=1) || (echo FAIL & set /a FAIL+=1)
echo.

echo [15/16] Test: Xin chao
curl -s -X POST http://localhost:3000/api/chat -H "Content-Type: application/json" -d "{\"message\":\"xin chao\"}" > temp.json
findstr /C:"SmartCourt" temp.json >nul && (echo PASS & set /a PASS+=1) || (echo FAIL & set /a FAIL+=1)
echo.

echo [16/16] Test: Hello
curl -s -X POST http://localhost:3000/api/chat -H "Content-Type: application/json" -d "{\"message\":\"hello\"}" > temp.json
findstr /C:"SmartCourt" temp.json >nul && (echo PASS & set /a PASS+=1) || (echo FAIL & set /a FAIL+=1)
echo.

echo ============================================================
echo FINAL RESULTS
echo ============================================================
echo PASSED: %PASS% / 16
echo FAILED: %FAIL% / 16
echo.

if %PASS%==16 (
    echo PHASE 1 COMPLETE - All tests passed!
) else (
    echo Some tests failed. Review above.
)

del temp.json 2>nul
pause
