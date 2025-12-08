-- Add ticker and market columns to Symbol
ALTER TABLE "Symbol" ADD COLUMN IF NOT EXISTS "ticker" TEXT;
ALTER TABLE "Symbol" ADD COLUMN IF NOT EXISTS "market" TEXT;

-- Create unique index on ticker if not exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = ANY (current_schemas(false)) AND indexname = 'Symbol_ticker_key'
  ) THEN
    CREATE UNIQUE INDEX "Symbol_ticker_key" ON "Symbol"("ticker");
  END IF;
END $$;















