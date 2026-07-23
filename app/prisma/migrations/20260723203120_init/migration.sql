-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('active', 'waiting', 'someday', 'done');

-- CreateEnum
CREATE TYPE "TaskState" AS ENUM ('next', 'later', 'waiting', 'stuck', 'done');

-- CreateEnum
CREATE TYPE "Energy" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "TaskContext" AS ENUM ('email', 'calls', 'deep_work', 'admin');

-- CreateEnum
CREATE TYPE "DeadlineType" AS ENUM ('hard', 'soft');

-- CreateEnum
CREATE TYPE "EmailThreadStatus" AS ENUM ('unprocessed', 'triaged', 'archived');

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "colorTag" TEXT NOT NULL DEFAULT '#ff4b1f',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'active',
    "dueDate" TIMESTAMP(3),
    "nextActionId" TEXT,
    "clientId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "note" TEXT,
    "state" "TaskState" NOT NULL DEFAULT 'next',
    "energy" "Energy",
    "context" "TaskContext",
    "deadlineType" "DeadlineType",
    "dueDate" TIMESTAMP(3),
    "phase" TEXT,
    "estimatedMinutes" INTEGER,
    "actualMinutes" INTEGER,
    "batchIndex" INTEGER,
    "batchTotal" INTEGER,
    "projectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailThread" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" "EmailThreadStatus" NOT NULL DEFAULT 'unprocessed',
    "clientId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailMessage" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "fromName" TEXT NOT NULL,
    "fromEmail" TEXT NOT NULL,
    "snippet" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "unread" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "EmailMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskEmailLink" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,

    CONSTRAINT "TaskEmailLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaptureItem" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "triaged" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaptureItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Project_nextActionId_key" ON "Project"("nextActionId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskEmailLink_taskId_threadId_key" ON "TaskEmailLink"("taskId", "threadId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_nextActionId_fkey" FOREIGN KEY ("nextActionId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailThread" ADD CONSTRAINT "EmailThread_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailMessage" ADD CONSTRAINT "EmailMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "EmailThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskEmailLink" ADD CONSTRAINT "TaskEmailLink_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskEmailLink" ADD CONSTRAINT "TaskEmailLink_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "EmailThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
