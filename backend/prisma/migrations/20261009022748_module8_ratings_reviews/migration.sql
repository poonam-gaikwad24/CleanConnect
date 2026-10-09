/*
  Warnings:

  - You are about to drop the column `aiCategory` on the `Complaint` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'REVISION_REQUIRED', 'VERIFIED');

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

-- CreateTable
CREATE TABLE "MaintenanceTask" (
    "id" TEXT NOT NULL,
    "taskCode" TEXT NOT NULL,
    "complaintId" TEXT NOT NULL,
    "assignedStaffId" TEXT NOT NULL,
    "taskInstruction" TEXT NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'ASSIGNED',
    "proofImageUrl" TEXT,
    "staffComment" TEXT,
    "adminComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "MaintenanceTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "userId" TEXT NOT NULL,
    "toiletId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ToiletRegistrationRequest_requestCode_key" ON "ToiletRegistrationRequest"("requestCode");

-- CreateIndex
CREATE UNIQUE INDEX "ToiletRegistrationRequest_resultingToiletId_key" ON "ToiletRegistrationRequest"("resultingToiletId");

-- CreateIndex
CREATE INDEX "ToiletRegistrationRequest_userId_idx" ON "ToiletRegistrationRequest"("userId");

-- CreateIndex
CREATE INDEX "ToiletRegistrationRequest_status_idx" ON "ToiletRegistrationRequest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceTask_taskCode_key" ON "MaintenanceTask"("taskCode");

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceTask_complaintId_key" ON "MaintenanceTask"("complaintId");

-- CreateIndex
CREATE INDEX "MaintenanceTask_assignedStaffId_idx" ON "MaintenanceTask"("assignedStaffId");

-- CreateIndex
CREATE INDEX "MaintenanceTask_status_idx" ON "MaintenanceTask"("status");

-- CreateIndex
CREATE INDEX "Review_toiletId_idx" ON "Review"("toiletId");

-- CreateIndex
CREATE UNIQUE INDEX "Review_userId_toiletId_key" ON "Review"("userId", "toiletId");

-- AddForeignKey
ALTER TABLE "ToiletRegistrationRequest" ADD CONSTRAINT "ToiletRegistrationRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToiletRegistrationRequest" ADD CONSTRAINT "ToiletRegistrationRequest_resultingToiletId_fkey" FOREIGN KEY ("resultingToiletId") REFERENCES "Toilet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceTask" ADD CONSTRAINT "MaintenanceTask_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "Complaint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceTask" ADD CONSTRAINT "MaintenanceTask_assignedStaffId_fkey" FOREIGN KEY ("assignedStaffId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_toiletId_fkey" FOREIGN KEY ("toiletId") REFERENCES "Toilet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
