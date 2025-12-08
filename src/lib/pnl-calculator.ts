import { Side } from '@prisma/client'

/**
 * Расчет unrealized PnL для открытой позиции
 * @param side - LONG или SHORT
 * @param entryPrice - Цена входа
 * @param currentPrice - Текущая рыночная цена
 * @param qty - Количество
 * @param leverage - Плечо
 * @returns PnL в валюте счета
 */
export function calculateUnrealizedPnL(
  side: Side,
  entryPrice: number,
  currentPrice: number,
  qty: number,
  leverage: number = 1
): number {
  if (side === 'LONG') {
    // Для длинной позиции: прибыль когда цена растет
    return (currentPrice - entryPrice) * qty
  } else {
    // Для короткой позиции: прибыль когда цена падает
    return (entryPrice - currentPrice) * qty
  }
}

/**
 * Расчет realized PnL для закрытой позиции
 * @param side - LONG или SHORT
 * @param entryPrice - Цена входа
 * @param exitPrice - Цена выхода
 * @param qty - Количество
 * @param fee - Комиссия
 * @returns PnL в валюте счета
 */
export function calculateRealizedPnL(
  side: Side,
  entryPrice: number,
  exitPrice: number,
  qty: number,
  fee: number = 0
): number {
  const grossPnL = side === 'LONG'
    ? (exitPrice - entryPrice) * qty
    : (entryPrice - exitPrice) * qty
  
  return grossPnL - fee
}

/**
 * Расчет PnL в процентах
 * @param pnl - PnL в валюте
 * @param entryPrice - Цена входа
 * @param qty - Количество
 * @param leverage - Плечо
 * @returns PnL в процентах
 */
export function calculatePnLPercentage(
  pnl: number,
  entryPrice: number,
  qty: number,
  leverage: number = 1
): number {
  const initialMargin = (entryPrice * qty) / leverage
  if (initialMargin === 0) return 0
  return (pnl / initialMargin) * 100
}

/**
 * Расчет ROI (Return on Investment)
 * @param pnl - PnL в валюте
 * @param initialMargin - Начальная маржа
 * @returns ROI в процентах
 */
export function calculateROI(pnl: number, initialMargin: number): number {
  if (initialMargin === 0) return 0
  return (pnl / initialMargin) * 100
}

/**
 * Расчет ликвидационной цены для изолированной маржи
 * @param side - LONG или SHORT
 * @param entryPrice - Цена входа
 * @param leverage - Плечо
 * @param mmr - Минимальный коэффициент маржи (maintenance margin rate)
 * @returns Ликвидационная цена
 */
export function calculateLiquidationPrice(
  side: Side,
  entryPrice: number,
  leverage: number,
  mmr: number = 0.005 // 0.5% по умолчанию
): number {
  if (side === 'LONG') {
    // Для длинных позиций цена ликвидации ниже цены входа
    return entryPrice * (1 - (1 / leverage) + mmr)
  } else {
    // Для коротких позиций цена ликвидации выше цены входа
    return entryPrice * (1 + (1 / leverage) - mmr)
  }
}

/**
 * Форматирование PnL с цветом для отображения
 * @param pnl - PnL значение
 * @returns Объект с форматированным значением и цветом
 */
export function formatPnL(pnl: number): { value: string; color: string; sign: string } {
  const absValue = Math.abs(pnl)
  const formatted = absValue.toFixed(2)
  
  if (pnl > 0) {
    return { value: formatted, color: 'text-green-600', sign: '+' }
  } else if (pnl < 0) {
    return { value: formatted, color: 'text-red-600', sign: '-' }
  } else {
    return { value: '0.00', color: 'text-gray-600', sign: '' }
  }
}

/**
 * Расчет требуемой маржи
 * @param price - Цена
 * @param qty - Количество
 * @param leverage - Плечо
 * @returns Требуемая маржа
 */
export function calculateRequiredMargin(
  price: number,
  qty: number,
  leverage: number
): number {
  return (price * qty) / leverage
}

/**
 * Расчет комиссии
 * @param price - Цена
 * @param qty - Количество
 * @param feeRate - Ставка комиссии (например, 0.001 = 0.1%)
 * @returns Комиссия в валюте
 */
export function calculateFee(
  price: number,
  qty: number,
  feeRate: number
): number {
  return price * qty * feeRate
}
