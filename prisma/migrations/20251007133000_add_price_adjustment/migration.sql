-- CreateEnum
DO $$ BEGIN CREATE TYPE "PriceAdjustmentType" AS ENUM ('PERCENT', 'ABSOLUTE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "PriceAdjustment" (
  "id" TEXT PRIMARY KEY,
  "symbolName" TEXT NOT NULL,
  "type" "PriceAdjustmentType" NOT NULL,
  "value" DECIMAL(65,30) NOT NULL,
  "startAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "durationMinutes" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE INDEX IF NOT EXISTS "PriceAdjustment_symbol_ends_idx" ON "PriceAdjustment"("symbolName", "endsAt");


