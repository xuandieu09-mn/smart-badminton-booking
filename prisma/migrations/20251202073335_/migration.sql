-- DropIndex
DROP INDEX "idx_booking_code";

-- DropIndex
DROP INDEX "idx_booking_court_time";

-- DropIndex
DROP INDEX "idx_booking_status";

-- AlterTable
ALTER TABLE "Booking" ALTER COLUMN "createdBy" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Court" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PricingRule" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Wallet" ALTER COLUMN "updatedAt" DROP DEFAULT;
