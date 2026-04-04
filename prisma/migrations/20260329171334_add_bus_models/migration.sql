-- CreateEnum
CREATE TYPE "BusScheduleDayType" AS ENUM ('weekday', 'weekend');

-- CreateTable
CREATE TABLE "BusCampus" (
    "id" INTEGER NOT NULL,
    "nameCn" TEXT NOT NULL,
    "nameEn" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "BusCampus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusRoute" (
    "id" INTEGER NOT NULL,
    "nameCn" TEXT NOT NULL,
    "nameEn" TEXT,

    CONSTRAINT "BusRoute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusRouteStop" (
    "id" SERIAL NOT NULL,
    "routeId" INTEGER NOT NULL,
    "campusId" INTEGER NOT NULL,
    "stopOrder" INTEGER NOT NULL,

    CONSTRAINT "BusRouteStop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusScheduleVersion" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "sourceMessage" TEXT,
    "sourceUrl" TEXT,
    "rawJson" JSONB NOT NULL,
    "effectiveFrom" DATE,
    "effectiveUntil" DATE,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusScheduleVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusTrip" (
    "id" SERIAL NOT NULL,
    "versionId" INTEGER NOT NULL,
    "routeId" INTEGER NOT NULL,
    "dayType" "BusScheduleDayType" NOT NULL,
    "position" INTEGER NOT NULL,
    "stopTimes" JSONB NOT NULL,

    CONSTRAINT "BusTrip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusUserPreference" (
    "userId" TEXT NOT NULL,
    "preferredOriginCampusId" INTEGER,
    "preferredDestinationCampusId" INTEGER,
    "favoriteCampusIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "favoriteRouteIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "showDepartedTrips" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusUserPreference_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "BusCampus_nameCn_key" ON "BusCampus"("nameCn");

-- CreateIndex
CREATE INDEX "BusCampus_nameCn_idx" ON "BusCampus"("nameCn");

-- CreateIndex
CREATE INDEX "BusCampus_nameEn_idx" ON "BusCampus"("nameEn");

-- CreateIndex
CREATE INDEX "BusRoute_nameCn_idx" ON "BusRoute"("nameCn");

-- CreateIndex
CREATE INDEX "BusRoute_nameEn_idx" ON "BusRoute"("nameEn");

-- CreateIndex
CREATE INDEX "BusRouteStop_campusId_idx" ON "BusRouteStop"("campusId");

-- CreateIndex
CREATE UNIQUE INDEX "BusRouteStop_routeId_stopOrder_key" ON "BusRouteStop"("routeId", "stopOrder");

-- CreateIndex
CREATE UNIQUE INDEX "BusScheduleVersion_key_key" ON "BusScheduleVersion"("key");

-- CreateIndex
CREATE UNIQUE INDEX "BusScheduleVersion_checksum_key" ON "BusScheduleVersion"("checksum");

-- CreateIndex
CREATE INDEX "BusScheduleVersion_isEnabled_effectiveFrom_effectiveUntil_idx" ON "BusScheduleVersion"("isEnabled", "effectiveFrom", "effectiveUntil");

-- CreateIndex
CREATE INDEX "BusTrip_dayType_routeId_idx" ON "BusTrip"("dayType", "routeId");

-- CreateIndex
CREATE INDEX "BusTrip_versionId_idx" ON "BusTrip"("versionId");

-- CreateIndex
CREATE UNIQUE INDEX "BusTrip_versionId_dayType_routeId_position_key" ON "BusTrip"("versionId", "dayType", "routeId", "position");

-- CreateIndex
CREATE INDEX "BusUserPreference_preferredOriginCampusId_idx" ON "BusUserPreference"("preferredOriginCampusId");

-- CreateIndex
CREATE INDEX "BusUserPreference_preferredDestinationCampusId_idx" ON "BusUserPreference"("preferredDestinationCampusId");

-- AddForeignKey
ALTER TABLE "BusRouteStop" ADD CONSTRAINT "BusRouteStop_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "BusRoute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusRouteStop" ADD CONSTRAINT "BusRouteStop_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "BusCampus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusTrip" ADD CONSTRAINT "BusTrip_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "BusScheduleVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusTrip" ADD CONSTRAINT "BusTrip_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "BusRoute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusUserPreference" ADD CONSTRAINT "BusUserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusUserPreference" ADD CONSTRAINT "BusUserPreference_preferredOriginCampusId_fkey" FOREIGN KEY ("preferredOriginCampusId") REFERENCES "BusCampus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusUserPreference" ADD CONSTRAINT "BusUserPreference_preferredDestinationCampusId_fkey" FOREIGN KEY ("preferredDestinationCampusId") REFERENCES "BusCampus"("id") ON DELETE SET NULL ON UPDATE CASCADE;
