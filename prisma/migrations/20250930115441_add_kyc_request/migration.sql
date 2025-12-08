-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'RESUBMIT');

-- CreateTable
CREATE TABLE "KycRequest" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "documentFront" TEXT,
    "documentBack" TEXT,
    "status" "KycStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KycRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KycRequest_clientId_key" ON "KycRequest"("clientId");

-- CreateIndex
CREATE INDEX "KycRequest_status_idx" ON "KycRequest"("status");

-- CreateIndex
CREATE INDEX "KycRequest_submittedAt_idx" ON "KycRequest"("submittedAt");

-- AddForeignKey
ALTER TABLE "KycRequest" ADD CONSTRAINT "KycRequest_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
