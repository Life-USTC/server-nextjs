-- CreateEnum
CREATE TYPE "BusDayType" AS ENUM ('weekday', 'weekend');

-- CreateTable
CREATE TABLE "BusScheduleConfig" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveUntil" TIMESTAMP(3),
    "sourceMessage" TEXT,
    "sourceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusScheduleConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusStop" (
    "id" SERIAL NOT NULL,
    "configId" INTEGER NOT NULL,
    "externalId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "BusStop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusRoute" (
    "id" SERIAL NOT NULL,
    "configId" INTEGER NOT NULL,
    "routeNumber" INTEGER NOT NULL,

    CONSTRAINT "BusRoute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusRouteStop" (
    "id" SERIAL NOT NULL,
    "routeId" INTEGER NOT NULL,
    "stopId" INTEGER NOT NULL,
    "stopOrder" INTEGER NOT NULL,

    CONSTRAINT "BusRouteStop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusTrip" (
    "id" SERIAL NOT NULL,
    "routeId" INTEGER NOT NULL,
    "dayType" "BusDayType" NOT NULL,
    "times" JSONB NOT NULL,

    CONSTRAINT "BusTrip_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BusScheduleConfig_effectiveFrom_idx" ON "BusScheduleConfig"("effectiveFrom");

-- CreateIndex
CREATE INDEX "BusScheduleConfig_effectiveUntil_idx" ON "BusScheduleConfig"("effectiveUntil");

-- CreateIndex
CREATE INDEX "BusStop_configId_idx" ON "BusStop"("configId");

-- CreateIndex
CREATE UNIQUE INDEX "BusStop_configId_externalId_key" ON "BusStop"("configId", "externalId");

-- CreateIndex
CREATE INDEX "BusRoute_configId_idx" ON "BusRoute"("configId");

-- CreateIndex
CREATE UNIQUE INDEX "BusRoute_configId_routeNumber_key" ON "BusRoute"("configId", "routeNumber");

-- CreateIndex
CREATE INDEX "BusRouteStop_routeId_idx" ON "BusRouteStop"("routeId");

-- CreateIndex
CREATE INDEX "BusRouteStop_stopId_idx" ON "BusRouteStop"("stopId");

-- CreateIndex
CREATE UNIQUE INDEX "BusRouteStop_routeId_stopOrder_key" ON "BusRouteStop"("routeId", "stopOrder");

-- CreateIndex
CREATE INDEX "BusTrip_routeId_idx" ON "BusTrip"("routeId");

-- CreateIndex
CREATE INDEX "BusTrip_dayType_idx" ON "BusTrip"("dayType");

-- AddForeignKey
ALTER TABLE "BusStop" ADD CONSTRAINT "BusStop_configId_fkey" FOREIGN KEY ("configId") REFERENCES "BusScheduleConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusRoute" ADD CONSTRAINT "BusRoute_configId_fkey" FOREIGN KEY ("configId") REFERENCES "BusScheduleConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusRouteStop" ADD CONSTRAINT "BusRouteStop_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "BusRoute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusRouteStop" ADD CONSTRAINT "BusRouteStop_stopId_fkey" FOREIGN KEY ("stopId") REFERENCES "BusStop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusTrip" ADD CONSTRAINT "BusTrip_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "BusRoute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
