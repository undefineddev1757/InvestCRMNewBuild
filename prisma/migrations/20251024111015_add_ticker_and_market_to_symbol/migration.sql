/*
  Warnings:

  - A unique constraint covering the columns `[ticker]` on the table `Symbol` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Symbol" ADD COLUMN     "market" TEXT,
ADD COLUMN     "ticker" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Symbol_ticker_key" ON "Symbol"("ticker");
