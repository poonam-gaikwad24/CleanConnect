/*
  Warnings:

  - You are about to drop the column `aiCategory` on the `Complaint` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Complaint" DROP COLUMN "aiCategory";

-- AlterTable
ALTER TABLE "Toilet" ALTER COLUMN "externalId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "ToiletRegistrationRequest" (
    "id" TEXT NOT NULL,
    "requestCode" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "landmark" TEXT,
    "address" TEXT,
    "description" TEXT,
    "imageUrl" TEXT,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "adminNotes" TEXT,
    "resultingToiletId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ToiletRegistrationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ToiletRegistrationRequest_requestCode_key" ON "ToiletRegistrationRequest"("requestCode");

-- CreateIndex
CREATE UNIQUE INDEX "ToiletRegistrationRequest_resultingToiletId_key" ON "ToiletRegistrationRequest"("resultingToiletId");

-- CreateIndex
CREATE INDEX "ToiletRegistrationRequest_userId_idx" ON "ToiletRegistrationRequest"("userId");

-- CreateIndex
CREATE INDEX "ToiletRegistrationRequest_status_idx" ON "ToiletRegistrationRequest"("status");

-- AddForeignKey
ALTER TABLE "ToiletRegistrationRequest" ADD CONSTRAINT "ToiletRegistrationRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToiletRegistrationRequest" ADD CONSTRAINT "ToiletRegistrationRequest_resultingToiletId_fkey" FOREIGN KEY ("resultingToiletId") REFERENCES "Toilet"("id") ON DELETE SET NULL ON UPDATE CASCADE;
