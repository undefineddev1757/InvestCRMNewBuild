import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserOrClient } from '@/lib/get-current-user'
import { prisma } from '@/lib/prisma'
import { calculateRealizedPnL } from '@/lib/pnl-calculator'

export async function POST(req: NextRequest, { params }: any) {
  const correlationId = req.headers.get('x-correlation-id') || undefined
  try {
    const userOrClient = await getCurrentUserOrClient(req)
    if (!userOrClient) return NextResponse.json({ code: 'UNAUTHORIZED' }, { status: 401 })

    const position = await prisma.position.findUnique({ where: { id: params.id } })
    if (!position) return NextResponse.json({ code: 'NOT_FOUND' }, { status: 404 })

    const account = await prisma.tradingAccount.findUnique({ where: { id: position.tradingAccountId } })
    if (!account) return NextResponse.json({ code: 'NOT_FOUND' }, { status: 404 })
    
    // Проверяем доступ к аккаунту
    let hasAccess = false
    if (userOrClient.type === 'user' && account.userId === userOrClient.data.id) {
      hasAccess = true
    } else if (userOrClient.type === 'client' && account.clientId === userOrClient.data.id) {
      hasAccess = true
    }
    
    if (!hasAccess) return NextResponse.json({ code: 'FORBIDDEN' }, { status: 403 })

    if (position.status !== 'OPEN') {
      return NextResponse.json({ code: 'POSITION_NOT_OPEN' }, { status: 409 })
    }

    // Определяем текущую рыночную цену для рассчёта PnL
    const body = await req.json().catch(() => ({})) as any
    const symbol = await prisma.symbol.findUnique({ where: { id: position.symbolId } })
    let mark = Number(body?.price)
    
    console.log(`[CLOSE POSITION] Received close request for position ${position.id}:`, {
      bodyPrice: body?.price,
      parsedMark: mark,
      positionEntryPrice: position.entryPrice,
      symbolName: symbol?.name,
      symbolTicker: symbol?.ticker
    })
    
    // Если цена не передана или невалидна, используем entry price (PnL = 0)
    if (!Number.isFinite(mark) || mark <= 0) {
      console.warn(`[CLOSE POSITION] Invalid or missing price, using entry price: ${position.entryPrice}`)
      mark = Number(position.entryPrice)
    }

    const qty = Number(position.qty)
    const entry = Number(position.entryPrice)
    const side = position.side
    
    // Рассчитываем комиссию за закрытие
    // Комиссии отключены (установлены в 0), поэтому не вычитаем их
    const openFee = 0 // Комиссия при открытии (отключена)
    const feeTaker = 0 // Комиссия символа (отключена)
    const closeFee = 0 // Комиссия при закрытии (отключена)
    const totalFee = 0 // Общая комиссия (отключена)
    
    // Рассчитываем PnL: комиссии отключены, поэтому используем grossPnL напрямую
    // НЕ используем calculateRealizedPnL, так как комиссии = 0
    const grossPnL = side === 'LONG' 
      ? (mark - entry) * qty 
      : (entry - mark) * qty
    
    // PnL = grossPnL (комиссии отключены, totalFee = 0)
    const pnl = grossPnL
    
    const priceDiff = side === 'LONG' ? (mark - entry) : (entry - mark)
    const priceDiffPercent = side === 'LONG' 
      ? ((mark - entry) / entry * 100) 
      : ((entry - mark) / entry * 100)
    
    console.log(`[CLOSE POSITION] Position ${position.id} calculation:`, {
      side,
      entry: entry.toFixed(2),
      mark: mark.toFixed(2),
      qty: qty.toFixed(8),
      priceDiff: priceDiff.toFixed(2),
      priceDiffPercent: priceDiffPercent.toFixed(4) + '%',
      openFee: openFee.toFixed(8),
      feeTaker: feeTaker,
      feeTakerPercent: (feeTaker * 100).toFixed(4) + '%',
      closeFee: closeFee.toFixed(8),
      totalFee: totalFee.toFixed(8),
      grossPnL: grossPnL.toFixed(8),
      pnl: pnl.toFixed(8),
      accountBalanceBefore: account.balance.toString(),
      accountAvailableBefore: account.availableBalance.toString(),
      // Дополнительная информация для отладки
      expectedUnrealizedPnL: side === 'LONG' 
        ? ((mark - entry) * qty).toFixed(8)
        : ((entry - mark) * qty).toFixed(8),
      note: 'Fees are disabled (all set to 0)'
    })
    
    // ВАЖНО: Проверяем, что комиссии действительно 0
    if (totalFee > 0.0001) {
      console.error(`[CLOSE POSITION] ⚠️ WARNING: Total fee is not zero! totalFee=${totalFee}, openFee=${openFee}, closeFee=${closeFee}, feeTaker=${feeTaker}`)
    }
    
    // ВАЖНО: Проверяем, что PnL равен grossPnL (комиссии должны быть 0)
    const pnlDiff = Math.abs(pnl - grossPnL)
    if (pnlDiff > 0.0001) {
      console.error(`[CLOSE POSITION] ⚠️ WARNING: PnL differs from grossPnL! pnl=${pnl}, grossPnL=${grossPnL}, diff=${pnlDiff}`)
    }
    
    // ВАЖНО: Проверяем, что цена закрытия разумная
    const priceChangePercent = side === 'LONG' 
      ? ((mark - entry) / entry * 100)
      : ((entry - mark) / entry * 100)
    
    if (Math.abs(priceChangePercent) > 10) {
      console.warn(`[CLOSE POSITION] ⚠️ WARNING: Large price change! entry=${entry}, mark=${mark}, change=${priceChangePercent.toFixed(2)}%`)
    }
    
    // Определяем тип закрытия
    const closeType = body?.closeType || 'MARKET'

    const updated = await prisma.$transaction(async (tx) => {
      // Рассчитываем новые балансы с учетом освобождения IM (если isolated) и PnL
      const im = position.mode === 'ISOLATED' ? Number(position.imLocked) : 0
      const newBalance = Number(account.balance) + pnl
      const newAvailable = Number(account.availableBalance) + pnl + im
      const newMargin = Number(account.margin) - im
      
      // Один UPDATE вместо двух для скорости
      await tx.tradingAccount.update({
        where: { id: account.id },
        data: {
          balance: newBalance.toFixed(8),
          availableBalance: newAvailable.toFixed(8),
          margin: newMargin.toFixed(8),
          profit: (Number(account.profit) + pnl).toFixed(8),
        }
      })

      const pos = await tx.position.update({ 
        where: { id: position.id }, 
        data: { 
          status: 'CLOSED',
          exitPrice: mark.toString(),
          pnl: pnl.toString(),
          closeType: closeType,
          closedAt: new Date(),
        } 
      })
      await tx.auditLog.create({
        data: {
          tradingAccountId: account.id,
          type: 'POSITION_CLOSE',
          payload: { positionId: position.id, realized_pnl: pnl, mark },
          correlationId,
        }
      })
      return pos
    })

    return NextResponse.json({ position: { id: updated.id, status: updated.status, updated_at: updated.updatedAt }, realized_pnl: pnl })
  } catch (error) {
    console.error('POST /api/v1/positions/{id}/close error:', error)
    return NextResponse.json({ message: 'Internal error', correlation_id: correlationId }, { status: 500 })
  }
}


