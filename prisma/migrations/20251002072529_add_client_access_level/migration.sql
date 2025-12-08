-- CreateEnum
CREATE TYPE "AccessLevel" AS ENUM ('BASE', 'FULL');

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "accessLevel" "AccessLevel" NOT NULL DEFAULT 'BASE';
