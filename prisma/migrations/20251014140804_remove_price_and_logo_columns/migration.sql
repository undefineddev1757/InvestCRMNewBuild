/*
  Warnings:

  - You are about to drop the column `currentPrice` on the `Symbol` table. All the data in the column will be lost.
  - You are about to drop the column `logoUrl` on the `Symbol` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Symbol" DROP COLUMN "currentPrice",
DROP COLUMN "logoUrl";
