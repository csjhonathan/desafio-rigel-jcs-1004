-- CreateTable
CREATE TABLE "Communication" (
    "id" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "process_number" TEXT NOT NULL,
    "tribunal" TEXT NOT NULL,
    "available_at" TIMESTAMP(3) NOT NULL,
    "kind" TEXT NOT NULL,
    "content" TEXT,
    "has_res_judicata" BOOLEAN NOT NULL DEFAULT false,
    "ai_summary" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Communication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Communication_external_id_key" ON "Communication"("external_id");
