-- DropIndex
DROP INDEX "ScheduledBlock_taskId_key";

-- AlterTable
ALTER TABLE "ScheduledBlock" ADD COLUMN     "partIndex" INTEGER,
ADD COLUMN     "partTotal" INTEGER;
