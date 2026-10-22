-- CreateEnum
CREATE TYPE "task_status" AS ENUM ('new', 'in_progress', 'completed');

-- CreateEnum
CREATE TYPE "task_priority" AS ENUM ('low', 'normal', 'high');

-- CreateTable
CREATE TABLE "tasks" (
    "id" UUID NOT NULL,
    "title" VARCHAR(60) NOT NULL,
    "description" VARCHAR(200) NOT NULL,
    "priority" "task_priority" NOT NULL DEFAULT 'normal',
    "status" "task_status" NOT NULL DEFAULT 'new',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "status_changed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tasks_status_status_changed_at_idx" ON "tasks"("status", "status_changed_at");
