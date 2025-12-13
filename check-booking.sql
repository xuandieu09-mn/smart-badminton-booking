-- Kiểm tra booking với mã TEST04 hoặc các booking CONFIRMED khác
SELECT 
    "bookingCode",
    "status",
    "startTime",
    "endTime",
    "courtId",
    "userId",
    "guestName",
    "createdAt"
FROM "Booking"
WHERE "bookingCode" = 'TEST04' OR "bookingCode" LIKE 'BOOK-%'
ORDER BY "createdAt" DESC
LIMIT 20;

-- Kiểm tra tất cả booking CONFIRMED
SELECT 
    "bookingCode",
    "status",
    "startTime",
    "endTime"
FROM "Booking"
WHERE "status" = 'CONFIRMED'
ORDER BY "startTime" DESC
LIMIT 10;
