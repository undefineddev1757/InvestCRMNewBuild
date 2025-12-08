import { defaultRiskConfig } from './config'
import { calcAll, CalcInputs, calcIsolatedEquity, calcCrossEquity } from './trading'

export type MarginMode = 'isolated' | 'cross'

export interface SymbolRiskParams {
  mmr: number
  feeTaker: number
  feeMaker: number
}

export interface PreviewInputs {
  side: 'long' | 'short'
  qty: number
  entryPrice: number
  markPrice: number
  leverage: number
  mode: MarginMode
  symbol: SymbolRiskParams
}

export interface PreviewOutputs {
  notional: number
  initialMargin: number
  maintenanceMargin: number
  pnl: number
  roePct: number
  liquidationPrice: number
  feeTakerEstimate: number
}

export function previewPosition(inputs: PreviewInputs): PreviewOutputs {
  const calcInputs: CalcInputs = {
    side: inputs.side,
    qty: inputs.qty,
    entryPrice: inputs.entryPrice,
    markPrice: inputs.markPrice,
    leverage: inputs.leverage,
    mmr: inputs.symbol.mmr as number,
    mmrBuffer: defaultRiskConfig.mmrBuffer,
    feeBuffer: defaultRiskConfig.feeBuffer,
  }
  const res = calcAll(calcInputs)
  const feeTakerEstimate = Math.abs(inputs.qty) * inputs.markPrice * (inputs.symbol.feeTaker as number)
  return { ...res, feeTakerEstimate }
}

export function isIsolatedMarginCall(equity: number, maintenanceMargin: number, feeBufferAbs: number): boolean {
  return equity <= (maintenanceMargin + feeBufferAbs)
}

export function isIsolatedLiquidation(equity: number, maintenanceMargin: number): boolean {
  return equity <= maintenanceMargin
}

export function calcEquity(mode: MarginMode, params: {
  positionInitialMargin?: number
  positionPnl?: number
  positionFeesAccrued?: number
  accountBalance?: number
  accountPnlSum?: number
  accountFeesSum?: number
}): number {
  const base = { mode } as any
  if (mode === 'isolated') return calcIsolatedEquity({ ...base, ...params })
  return calcCrossEquity({ ...base, ...params })
}


