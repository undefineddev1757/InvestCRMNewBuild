-- Safe creation of trading domain tables (PostgreSQL)

-- Enums
DO $$ BEGIN CREATE TYPE "Side" AS ENUM ('LONG','SHORT'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "MarginMode" AS ENUM ('ISOLATED','CROSS'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "OrderType" AS ENUM ('LIMIT','MARKET','STOP'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "OrderSide" AS ENUM ('BUY','SELL'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "OrderStatus" AS ENUM ('NEW','PARTIALLY_FILLED','FILLED','CANCELED','REJECTED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "PositionStatus" AS ENUM ('OPEN','CLOSED','LIQUIDATED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "RiskEventKind" AS ENUM ('MARGIN_CALL','LIQ_PARTIAL','LIQ_FULL'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "Symbol" (
  id text PRIMARY KEY,
  name text UNIQUE NOT NULL,
  "minQty" numeric NOT NULL DEFAULT 0.0001,
  "qtyStep" numeric NOT NULL DEFAULT 0.0001,
  "priceStep" numeric NOT NULL DEFAULT 0.0001,
  "allowedLeverages" jsonb NOT NULL,
  mmr numeric NOT NULL,
  "feeTaker" numeric NOT NULL DEFAULT 0,
  "feeMaker" numeric NOT NULL DEFAULT 0,
  "markPriceSource" text NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "Position" (
  id text PRIMARY KEY,
  "tradingAccountId" text NOT NULL,
  "symbolId" text NOT NULL,
  side "Side" NOT NULL,
  qty numeric NOT NULL,
  "entryPrice" numeric NOT NULL,
  mode "MarginMode" NOT NULL,
  leverage integer NOT NULL,
  "imLocked" numeric NOT NULL,
  "mmrCached" numeric NOT NULL,
  "liqPriceCached" numeric NULL,
  status "PositionStatus" NOT NULL DEFAULT 'OPEN',
  "slPrice" numeric NULL,
  "tpPrice" numeric NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT fk_pos_tracc FOREIGN KEY ("tradingAccountId") REFERENCES "TradingAccount"(id) ON DELETE CASCADE,
  CONSTRAINT fk_pos_symbol FOREIGN KEY ("symbolId") REFERENCES "Symbol"(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_position_tracc ON "Position" ("tradingAccountId");
CREATE INDEX IF NOT EXISTS idx_position_symbol ON "Position" ("symbolId");
CREATE INDEX IF NOT EXISTS idx_position_status ON "Position" (status);

CREATE TABLE IF NOT EXISTS "Order" (
  id text PRIMARY KEY,
  "positionId" text NULL,
  "tradingAccountId" text NOT NULL,
  "symbolId" text NOT NULL,
  type "OrderType" NOT NULL,
  side "OrderSide" NOT NULL,
  qty numeric NOT NULL,
  price numeric NULL,
  status "OrderStatus" NOT NULL DEFAULT 'NEW',
  "slPrice" numeric NULL,
  "tpPrice" numeric NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT fk_order_pos FOREIGN KEY ("positionId") REFERENCES "Position"(id),
  CONSTRAINT fk_order_tracc FOREIGN KEY ("tradingAccountId") REFERENCES "TradingAccount"(id) ON DELETE CASCADE,
  CONSTRAINT fk_order_symbol FOREIGN KEY ("symbolId") REFERENCES "Symbol"(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_order_tracc ON "Order" ("tradingAccountId");
CREATE INDEX IF NOT EXISTS idx_order_symbol ON "Order" ("symbolId");
CREATE INDEX IF NOT EXISTS idx_order_status ON "Order" (status);

CREATE TABLE IF NOT EXISTS "Fill" (
  id text PRIMARY KEY,
  "orderId" text NOT NULL,
  price numeric NOT NULL,
  qty numeric NOT NULL,
  fee numeric NOT NULL DEFAULT 0,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT fk_fill_order FOREIGN KEY ("orderId") REFERENCES "Order"(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "AuditLog" (
  id text PRIMARY KEY,
  "tradingAccountId" text NOT NULL,
  type text NOT NULL,
  payload jsonb NOT NULL,
  "correlationId" text NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT fk_audit_tracc FOREIGN KEY ("tradingAccountId") REFERENCES "TradingAccount"(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_audit_tracc ON "AuditLog" ("tradingAccountId");
CREATE INDEX IF NOT EXISTS idx_audit_type ON "AuditLog" (type);

CREATE TABLE IF NOT EXISTS "RiskEvent" (
  id text PRIMARY KEY,
  "tradingAccountId" text NOT NULL,
  "symbolId" text NOT NULL,
  "positionId" text NULL,
  kind "RiskEventKind" NOT NULL,
  snapshot jsonb NOT NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT fk_risk_tracc FOREIGN KEY ("tradingAccountId") REFERENCES "TradingAccount"(id) ON DELETE CASCADE,
  CONSTRAINT fk_risk_symbol FOREIGN KEY ("symbolId") REFERENCES "Symbol"(id) ON DELETE CASCADE,
  CONSTRAINT fk_risk_position FOREIGN KEY ("positionId") REFERENCES "Position"(id)
);
CREATE INDEX IF NOT EXISTS idx_risk_tracc ON "RiskEvent" ("tradingAccountId");
CREATE INDEX IF NOT EXISTS idx_risk_symbol ON "RiskEvent" ("symbolId");
CREATE INDEX IF NOT EXISTS idx_risk_kind ON "RiskEvent" (kind);



