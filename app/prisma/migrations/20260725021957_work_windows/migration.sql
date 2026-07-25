-- CreateTable
CREATE TABLE "WorkWindow" (
    "id" TEXT NOT NULL,
    "dayOfWeek" INTEGER,
    "date" TIMESTAMP(3),
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,
    "context" "TaskContext",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkWindow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleDayOff" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleDayOff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleDayOff_date_key" ON "ScheduleDayOff"("date");
