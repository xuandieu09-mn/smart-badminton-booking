-- AlterTable
-- Add peakPricePerHour field to Court table for time-based pricing
-- Standard Price: pricePerHour (opening - 17:00)
-- Peak Price: peakPricePerHour (17:00 - closing)

ALTER TABLE "Court" ADD COLUMN "peakPricePerHour" DECIMAL(65,30) NOT NULL DEFAULT 100000;
