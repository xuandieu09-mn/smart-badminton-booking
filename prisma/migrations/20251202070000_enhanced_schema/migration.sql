-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING_PAYMENT', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED', 'CANCELLED_LATE', 'EXPIRED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "BookingType" AS ENUM ('REGULAR', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('VNPAY', 'MOMO', 'WALLET', 'CASH');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PAID', 'REFUNDED', 'FAILED');

-- CreateEnum
CREATE TYPE "WalletTransactionType" AS ENUM ('DEPOSIT', 'REFUND', 'PAYMENT', 'ADMIN_ADJUSTMENT');

-- AlterTable User
ALTER TABLE "User" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable Court
ALTER TABLE "Court" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Drop existing constraint before altering Booking table
ALTER TABLE "Booking" DROP CONSTRAINT IF EXISTS "no_overlap_booking";
ALTER TABLE "Booking" DROP CONSTRAINT IF EXISTS "Booking_userId_fkey";

-- AlterTable Booking
ALTER TABLE "Booking" ADD COLUMN "bookingCode" TEXT;
ALTER TABLE "Booking" ADD COLUMN "guestName" TEXT;
ALTER TABLE "Booking" ADD COLUMN "guestPhone" TEXT;
ALTER TABLE "Booking" ADD COLUMN "type" "BookingType" NOT NULL DEFAULT 'REGULAR';
ALTER TABLE "Booking" ADD COLUMN "paymentMethod" "PaymentMethod";
ALTER TABLE "Booking" ADD COLUMN "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID';
ALTER TABLE "Booking" ADD COLUMN "createdBy" TEXT NOT NULL DEFAULT 'CUSTOMER';
ALTER TABLE "Booking" ADD COLUMN "createdByStaffId" INTEGER;
ALTER TABLE "Booking" ADD COLUMN "checkedInAt" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN "checkedInByStaffId" INTEGER;
ALTER TABLE "Booking" ADD COLUMN "expiresAt" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Convert status column to enum type with explicit mapping
-- Map legacy statuses to new enum values appropriately:
-- - PENDING -> PENDING_PAYMENT (waiting for payment)
-- - CONFIRMED stays as CONFIRMED
-- - Any unknown status -> PENDING_PAYMENT (safe default for manual review)
ALTER TABLE "Booking" ALTER COLUMN "status" TYPE TEXT;
UPDATE "Booking" SET "status" = 
  CASE 
    WHEN "status" = 'PENDING' THEN 'PENDING_PAYMENT'
    WHEN "status" = 'CONFIRMED' THEN 'CONFIRMED'
    WHEN "status" = 'CHECKED_IN' THEN 'CHECKED_IN'
    WHEN "status" = 'COMPLETED' THEN 'COMPLETED'
    WHEN "status" = 'CANCELLED' THEN 'CANCELLED'
    WHEN "status" IN ('PENDING_PAYMENT', 'CANCELLED_LATE', 'EXPIRED', 'BLOCKED') THEN "status"
    ELSE 'PENDING_PAYMENT'  -- Safe default for unknown statuses
  END;
ALTER TABLE "Booking" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Booking" ALTER COLUMN "status" TYPE "BookingStatus" USING "status"::"BookingStatus";
ALTER TABLE "Booking" ALTER COLUMN "status" SET DEFAULT 'PENDING_PAYMENT';

-- Make userId nullable
ALTER TABLE "Booking" ALTER COLUMN "userId" DROP NOT NULL;

-- Generate booking codes for existing records
UPDATE "Booking" SET "bookingCode" = UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6)) WHERE "bookingCode" IS NULL;

-- Make bookingCode NOT NULL and UNIQUE
ALTER TABLE "Booking" ALTER COLUMN "bookingCode" SET NOT NULL;
CREATE UNIQUE INDEX "Booking_bookingCode_key" ON "Booking"("bookingCode");

-- CreateTable Wallet
CREATE TABLE "Wallet" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "balance" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable WalletTransaction
CREATE TABLE "WalletTransaction" (
    "id" SERIAL NOT NULL,
    "walletId" INTEGER NOT NULL,
    "type" "WalletTransactionType" NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "bookingId" INTEGER,
    "description" TEXT,
    "balanceBefore" DECIMAL(65,30) NOT NULL,
    "balanceAfter" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable Payment
CREATE TABLE "Payment" (
    "id" SERIAL NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "transactionId" TEXT,
    "gatewayResponse" JSONB,
    "status" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable PricingRule
CREATE TABLE "PricingRule" (
    "id" SERIAL NOT NULL,
    "courtId" INTEGER,
    "name" TEXT NOT NULL,
    "dayOfWeek" INTEGER,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "pricePerHour" DECIMAL(65,30) NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PricingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable BookingCancellation
CREATE TABLE "BookingCancellation" (
    "id" SERIAL NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "cancelledBy" INTEGER NOT NULL,
    "cancelledByRole" "Role" NOT NULL,
    "reason" TEXT,
    "refundAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "refundMethod" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingCancellation_pkey" PRIMARY KEY ("id")
);

-- CreateTable AdminAction
CREATE TABLE "AdminAction" (
    "id" SERIAL NOT NULL,
    "adminId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" INTEGER NOT NULL,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_userId_key" ON "Wallet"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_bookingId_key" ON "Payment"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingCancellation_bookingId_key" ON "BookingCancellation"("bookingId");

-- AddForeignKey (Booking -> User with nullable userId)
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey (Booking -> Staff creator)
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_createdByStaffId_fkey" FOREIGN KEY ("createdByStaffId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey (Wallet -> User)
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey (WalletTransaction -> Wallet)
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey (Payment -> Booking)
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey (PricingRule -> Court)
ALTER TABLE "PricingRule" ADD CONSTRAINT "PricingRule_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "Court"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey (BookingCancellation -> Booking)
ALTER TABLE "BookingCancellation" ADD CONSTRAINT "BookingCancellation_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey (AdminAction -> User)
ALTER TABLE "AdminAction" ADD CONSTRAINT "AdminAction_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Enable extension for exclusion constraint
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Add exclusion constraint (chống double booking)
-- Chỉ áp dụng cho các booking không bị hủy/hết hạn
ALTER TABLE "Booking"
ADD CONSTRAINT "prevent_double_booking"
EXCLUDE USING GIST (
  "courtId" WITH =,
  tsrange("startTime", "endTime") WITH &&
)
WHERE ("status" NOT IN ('CANCELLED', 'CANCELLED_LATE', 'EXPIRED'));

-- Index cho performance
CREATE INDEX "idx_booking_code" ON "Booking"("bookingCode");
CREATE INDEX "idx_booking_status" ON "Booking"("status");
CREATE INDEX "idx_booking_expires_at" ON "Booking"("expiresAt") WHERE "expiresAt" IS NOT NULL;
CREATE INDEX "idx_booking_court_time" ON "Booking"("courtId", "startTime", "endTime");
