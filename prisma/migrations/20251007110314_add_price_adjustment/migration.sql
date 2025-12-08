-- Safe rename: only if the old index exists (shadow DB friendly)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i'
      AND c.relname = 'PriceAdjustment_symbol_ends_idx'
  ) THEN
    ALTER INDEX "PriceAdjustment_symbol_ends_idx" RENAME TO "PriceAdjustment_symbolName_endsAt_idx";
  END IF;
END $$;
