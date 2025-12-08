-- CreateEnum
CREATE TYPE "DepositTicketStatus" AS ENUM ('PENDING', 'COMPLETED', 'EXPIRED', 'FAILED');

-- CreateTable
CREATE TABLE "DepositTicket" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "receivedAmount" DECIMAL(65,30),
    "walletAddress" TEXT NOT NULL,
    "walletType" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "status" "DepositTicketStatus" NOT NULL DEFAULT 'PENDING',
    "receivingTxId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DepositTicket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DepositTicket_ticketId_key" ON "DepositTicket"("ticketId");

-- CreateIndex
CREATE INDEX "DepositTicket_clientId_idx" ON "DepositTicket"("clientId");

-- CreateIndex
CREATE INDEX "DepositTicket_walletId_idx" ON "DepositTicket"("walletId");

-- CreateIndex
CREATE INDEX "DepositTicket_ticketId_idx" ON "DepositTicket"("ticketId");

-- CreateIndex
CREATE INDEX "DepositTicket_status_idx" ON "DepositTicket"("status");

-- CreateIndex
CREATE INDEX "DepositTicket_expiresAt_idx" ON "DepositTicket"("expiresAt");

-- AddForeignKey
ALTER TABLE "DepositTicket" ADD CONSTRAINT "DepositTicket_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepositTicket" ADD CONSTRAINT "DepositTicket_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;









