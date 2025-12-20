-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "paidAmount" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- Data Migration: Set paidAmount = totalPrice for all existing paid bookings
UPDATE "Booking" 
SET "paidAmount" = "totalPrice" 
WHERE "paymentStatus" = 'PAID';
