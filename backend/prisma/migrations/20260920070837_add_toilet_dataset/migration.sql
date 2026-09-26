-- CreateTable
CREATE TABLE "Toilet" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "ward" INTEGER,
    "type" TEXT,
    "location" TEXT NOT NULL,
    "landmark" TEXT,
    "status" TEXT,
    "isMonetized" BOOLEAN,
    "hasIct" BOOLEAN,
    "hasGoogleMapsListing" BOOLEAN,
    "hasIec" BOOLEAN,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Toilet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Toilet_externalId_key" ON "Toilet"("externalId");

-- CreateIndex
CREATE INDEX "Toilet_ward_idx" ON "Toilet"("ward");
