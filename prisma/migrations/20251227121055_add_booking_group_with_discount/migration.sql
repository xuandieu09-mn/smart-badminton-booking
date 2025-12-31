-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "bookingGroupId" INTEGER;

-- CreateTable
CREATE TABLE "BookingGroup" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "courtId" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "daysOfWeek" TEXT NOT NULL,
    "totalPrice" DECIMAL(65,30) NOT NULL,
    "totalPaid" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "paymentMethod" "PaymentMethod",
    "groupPaymentId" TEXT,
    "groupPaymentGateway" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookingGroup_userId_idx" ON "BookingGroup"("userId");

-- CreateIndex
CREATE INDEX "BookingGroup_courtId_idx" ON "BookingGroup"("courtId");

-- CreateIndex
CREATE INDEX "Booking_bookingGroupId_idx" ON "Booking"("bookingGroupId");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_bookingGroupId_fkey" FOREIGN KEY ("bookingGroupId") REFERENCES "BookingGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingGroup" ADD CONSTRAINT "BookingGroup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingGroup" ADD CONSTRAINT "BookingGroup_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "Court"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
