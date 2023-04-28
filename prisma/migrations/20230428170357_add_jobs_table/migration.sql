-- CreateEnum
CREATE TYPE "JobState" AS ENUM ('queued', 'pending', 'failed', 'completed');

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "args" JSONB NOT NULL,
    "message" TEXT,
    "duration" INTEGER,
    "state" "JobState" NOT NULL DEFAULT 'queued',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);
