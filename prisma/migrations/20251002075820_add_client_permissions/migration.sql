-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "canCreateDeals" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "canCreateTickets" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "canCreateWithdrawals" BOOLEAN NOT NULL DEFAULT true;
