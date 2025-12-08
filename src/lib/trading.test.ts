import { describe, it, expect } from 'vitest'
import { calcNotional, calcInitialMargin, calcMaintenanceMargin, calcPnl, calcRoe, calcLiquidationPriceApprox, calcAll } from './trading'

describe('trading formulas', () => {
  it('calcNotional', () => {
    expect(calcNotional(2, 1000)).toBe(2000)
  })

  it('calcInitialMargin', () => {
    expect(calcInitialMargin(2000, 10)).toBe(200)
  })

  it('calcMaintenanceMargin', () => {
    expect(calcMaintenanceMargin(2, 1000, 0.005)).toBeCloseTo(10)
  })

  it('calcPnl long/short', () => {
    expect(calcPnl('long', 100, 120, 2)).toBe(40)
    expect(calcPnl('short', 100, 80, 2)).toBe(40)
  })

  it('calcRoe', () => {
    expect(calcRoe(40, 200)).toBe(20)
  })

  it('calcLiquidationPriceApprox long', () => {
    const liq = calcLiquidationPriceApprox({ side: 'long', qty: 1, entryPrice: 100, markPrice: 100, leverage: 10, mmr: 0.005 })
    expect(liq).toBeGreaterThan(90)
    expect(liq).toBeLessThan(100)
  })

  it('calcAll end-to-end', () => {
    const out = calcAll({ side: 'long', qty: 1, entryPrice: 100, markPrice: 110, leverage: 10, mmr: 0.005 })
    expect(out.notional).toBe(110)
    expect(out.initialMargin).toBe(11)
    expect(out.pnl).toBe(10)
    expect(out.roePct).toBeCloseTo(90.909, 2)
    expect(out.liquidationPrice).toBeLessThan(100)
  })
})


