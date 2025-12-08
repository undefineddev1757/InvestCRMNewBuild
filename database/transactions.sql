-- Safe DDL for accounts & transactions history (PostgreSQL)
-- Creates enums and tables if not exist; does NOT drop existing objects

-- Enums
DO $$ BEGIN
  CREATE TYPE "TransactionType" AS ENUM ('DEPOSIT','WITHDRAWAL','TRANSFER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "TransactionStatus" AS ENUM ('PENDING','COMPLETED','FAILED','CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "TradingAccountType" AS ENUM ('LIVE','DEMO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- FinancialAccount
CREATE TABLE IF NOT EXISTS "FinancialAccount" (
  id            text PRIMARY KEY,
  "userId"      text NOT NULL,
  number        text NOT NULL UNIQUE,
  currency      text NOT NULL DEFAULT 'USD',
  balance       numeric NOT NULL DEFAULT 0,
  "availableBalance" numeric NOT NULL DEFAULT 0,
  "createdAt"   timestamp NOT NULL DEFAULT now(),
  "updatedAt"   timestamp NOT NULL DEFAULT now(),
  CONSTRAINT fk_finacc_user FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE
);

-- TradingAccount
CREATE TABLE IF NOT EXISTS "TradingAccount" (
  id            text PRIMARY KEY,
  "userId"      text NOT NULL,
  number        text NOT NULL UNIQUE,
  type          "TradingAccountType" NOT NULL,
  currency      text NOT NULL DEFAULT 'USD',
  balance       numeric NOT NULL DEFAULT 0,
  "availableBalance" numeric NOT NULL DEFAULT 0,
  margin        numeric NOT NULL DEFAULT 0,
  profit        numeric NOT NULL DEFAULT 0,
  "createdAt"   timestamp NOT NULL DEFAULT now(),
  "updatedAt"   timestamp NOT NULL DEFAULT now(),
  CONSTRAINT fk_tracc_user FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE
);

-- Transaction
CREATE TABLE IF NOT EXISTS "Transaction" (
  id                          text PRIMARY KEY,
  "userId"                    text NOT NULL,
  type                        "TransactionType" NOT NULL,
  status                      "TransactionStatus" NOT NULL DEFAULT 'PENDING',
  amount                      numeric NOT NULL,
  currency                    text NOT NULL DEFAULT 'USD',
  description                 text NULL,
  "createdAt"                 timestamp NOT NULL DEFAULT now(),

  "fromFinancialAccountId"    text NULL,
  "toFinancialAccountId"      text NULL,
  "fromTradingAccountId"      text NULL,
  "toTradingAccountId"        text NULL,

  CONSTRAINT fk_tx_user FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE,
  CONSTRAINT fk_tx_from_fin FOREIGN KEY ("fromFinancialAccountId") REFERENCES "FinancialAccount"(id) ON DELETE SET NULL,
  CONSTRAINT fk_tx_to_fin   FOREIGN KEY ("toFinancialAccountId")   REFERENCES "FinancialAccount"(id) ON DELETE SET NULL,
  CONSTRAINT fk_tx_from_tr  FOREIGN KEY ("fromTradingAccountId")   REFERENCES "TradingAccount"(id)  ON DELETE SET NULL,
  CONSTRAINT fk_tx_to_tr    FOREIGN KEY ("toTradingAccountId")     REFERENCES "TradingAccount"(id)  ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_transaction_user_createdat ON "Transaction" ("userId", "createdAt");


