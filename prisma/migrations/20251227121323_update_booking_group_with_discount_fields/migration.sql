/*
  Warnings:

  - The `daysOfWeek` column on the `BookingGroup` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to alter the column `totalPrice` on the `BookingGroup` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(10,2)`.
  - You are about to alter the column `totalPaid` on the `BookingGroup` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(10,2)`.
  - Added the required column `finalPrice` to the `BookingGroup` table without a default value. This is not possible if the table is not empty.
  - Added the required column `originalPrice` to the `BookingGroup` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalSessions` to the `BookingGroup` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "BookingGroupStatus" AS ENUM ('PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED');

-- AlterTable
ALTER TABLE "BookingGroup" ADD COLUMN     "discountRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN     "finalPrice" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "originalPrice" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "status" "BookingGroupStatus" NOT NULL DEFAULT 'CONFIRMED',
ADD COLUMN     "totalSessions" INTEGER NOT NULL,
DROP COLUMN "daysOfWeek",
ADD COLUMN     "daysOfWeek" INTEGER[],
ALTER COLUMN "totalPrice" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "totalPaid" SET DATA TYPE DECIMAL(10,2);
