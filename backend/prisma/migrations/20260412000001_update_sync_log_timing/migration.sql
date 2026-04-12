-- AlterTable: substitui executed_at + total_synced por started_at, ended_at, total_fetched, total_stored
ALTER TABLE "SyncLog"
    RENAME COLUMN "executed_at" TO "started_at";

ALTER TABLE "SyncLog"
    ADD COLUMN "ended_at"      TIMESTAMP(3),
    ADD COLUMN "total_fetched" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "total_stored"  INTEGER NOT NULL DEFAULT 0;

-- Migra dados existentes: total_synced → total_fetched (melhor aproximação disponível)
UPDATE "SyncLog" SET "total_fetched" = "total_synced";

ALTER TABLE "SyncLog"
    DROP COLUMN "total_synced";
