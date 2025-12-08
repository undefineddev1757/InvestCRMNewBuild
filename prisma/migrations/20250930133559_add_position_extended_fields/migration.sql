-- CreateEnum
CREATE TYPE "CloseType" AS ENUM ('MANUAL', 'MARKET', 'LIMIT', 'STOP_LOSS', 'TAKE_PROFIT', 'LIQUIDATION');

-- AlterTable
ALTER TABLE "Position" ADD COLUMN     "closeType" "CloseType",
ADD COLUMN     "closedAt" TIMESTAMP(3),
ADD COLUMN     "displayName" TEXT,
ADD COLUMN     "exitPrice" DECIMAL(65,30),
ADD COLUMN     "fee" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "openPriceAtMoment" DECIMAL(65,30),
ADD COLUMN     "pnl" DECIMAL(65,30);

-- CreateIndex
CREATE INDEX "Position_createdAt_idx" ON "Position"("createdAt");

-- CreateIndex
CREATE INDEX "Position_closedAt_idx" ON "Position"("closedAt");
