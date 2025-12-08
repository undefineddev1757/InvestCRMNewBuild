-- Add deposit requirement fields to Client
-- Safe for Postgres

ALTER TABLE "Client"
ADD COLUMN IF NOT EXISTS "depositRequiredAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "depositRequiredAt" TIMESTAMP(3);


