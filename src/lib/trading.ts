export type Side = 'long' | 'short'

export interface CalcInputs {
  side: Side
  qty: number
  entryPrice: number
  markPrice: number
  leverage: number
  mmr: number // maintenance margin ratio, e.g. 0.005 for 0.5%
  feeBuffer?: number // fraction of notional
  mmrBuffer?: number // fraction of notional
}

export interface CalcOutputs {
  notional: number
  initialMargin: number
  maintenanceMargin: number
  pnl: number
  roePct: number
  liquidationPrice: number
}

function clampFinite(n: number): number {
  if (!Number.isFinite(n)) return 0
  return n
}

export function calcNotional(qty: number, price: number): number {
  return Math.abs(qty) * price
}

export function calcInitialMargin(notional: number, leverage: number): number {
  if (leverage <= 0) return Infinity
  return notional / leverage
}

export function calcMaintenanceMargin(qty: number, markPrice: number, mmr: number): number {
  return Math.abs(qty) * markPrice * mmr
}

export function calcPnl(side: Side, entry: number, priceNow: number, qty: number): number {
  const diff = side === 'long' ? (priceNow - entry) : (entry - priceNow)
  return diff * qty
}

export function calcRoe(pnl: number, initialMargin: number): number {
  if (initialMargin === 0) return 0
  return (pnl / initialMargin) * 100
}

export function calcLiquidationPriceApprox(inputs: CalcInputs): number {
  const { side, entryPrice, leverage, feeBuffer = 0.0005, mmrBuffer = 0.001 } = inputs
  const buf = (1 + clampFinite(feeBuffer) + clampFinite(mmrBuffer))
  const base = entryPrice / Math.max(leverage, 1e-9)
  if (side === 'long') {
    return entryPrice - base * (buf - 1)
  } else {
    return entryPrice + base * buf
  }
}

export function calcAll(inputs: CalcInputs): CalcOutputs {
  const notional = calcNotional(inputs.qty, inputs.markPrice)
  const im = calcInitialMargin(notional, inputs.leverage)
  const mm = calcMaintenanceMargin(inputs.qty, inputs.markPrice, inputs.mmr)
  const pnl = calcPnl(inputs.side, inputs.entryPrice, inputs.markPrice, inputs.qty)
  const roe = calcRoe(pnl, im)
  const liq = calcLiquidationPriceApprox(inputs)
  return {
    notional,
    initialMargin: im,
    maintenanceMargin: mm,
    pnl,
    roePct: roe,
    liquidationPrice: liq,
  }
}

export interface EquityInputs {
  mode: 'isolated' | 'cross'
  positionInitialMargin?: number
  positionPnl?: number
  positionFeesAccrued?: number
  accountBalance?: number
  accountPnlSum?: number
  accountFeesSum?: number
}

export function calcIsolatedEquity(inputs: EquityInputs): number {
  const im = inputs.positionInitialMargin ?? 0
  const pnl = inputs.positionPnl ?? 0
  const fees = inputs.positionFeesAccrued ?? 0
  return im + pnl - fees
}

export function calcCrossEquity(inputs: EquityInputs): number {
  const balance = inputs.accountBalance ?? 0
  const pnl = inputs.accountPnlSum ?? 0
  const fees = inputs.accountFeesSum ?? 0
  return balance + pnl - fees
}



