-- CreateTable
CREATE TABLE "SyncLog" (
    "id" TEXT NOT NULL,
    "executed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "success" BOOLEAN NOT NULL,
    "total_synced" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,

    CONSTRAINT "SyncLog_pkey" PRIMARY KEY ("id")
);
