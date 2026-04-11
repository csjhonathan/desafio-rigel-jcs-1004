-- CreateTable
CREATE TABLE "Recipient" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "communication_id" TEXT NOT NULL,

    CONSTRAINT "Recipient_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Recipient" ADD CONSTRAINT "Recipient_communication_id_fkey"
    FOREIGN KEY ("communication_id") REFERENCES "Communication"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
