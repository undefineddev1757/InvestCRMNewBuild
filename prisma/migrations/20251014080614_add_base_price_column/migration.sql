-- AlterTable
ALTER TABLE "PriceAdjustment" ADD COLUMN     "basePrice" DECIMAL(65,30);

-- RenameIndex
ALTER INDEX "PriceAdjustment_symbol_ends_idx" RENAME TO "PriceAdjustment_symbolName_endsAt_idx";
