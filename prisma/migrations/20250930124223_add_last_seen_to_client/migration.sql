-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "lastSeen" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Client_lastSeen_idx" ON "Client"("lastSeen");
