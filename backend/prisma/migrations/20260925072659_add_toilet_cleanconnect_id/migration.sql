/*
  Warnings:

  - A unique constraint covering the columns `[cleanConnectId]` on the table `Toilet` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Toilet" ADD COLUMN     "cleanConnectId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Toilet_cleanConnectId_key" ON "Toilet"("cleanConnectId");
