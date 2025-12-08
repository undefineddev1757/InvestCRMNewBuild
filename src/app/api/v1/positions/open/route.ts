import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserOrClient, getTradingAccount } from '@/lib/get-current-user'
import { prisma } from '@/lib/prisma'
import { previewPosition } from '@/lib/risk'

function error(message: string, status = 400) {
  return NextResponse.json({ code: 'VALIDATION_FAILED', message }, { status })
}

export async function POST(req: NextRequest) {
  const correlationId = req.headers.get('x-correlation-id') || undefined
  const idempotencyKey = req.headers.get('idempotency-key') || undefined

  try {
    // Получаем клиента через JWT токен
    const userOrClient = await getCurrentUserOrClient(req)
    
    if (!userOrClient) {
      return NextResponse.json({ code: 'UNAUTHORIZED' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const { symbol, side, qty, mode, leverage, sl, tp, price } = body || {}
    if (!symbol || !side || !qty || !mode || !leverage) return error('Missing required fields')

    if (!['long', 'short'].includes(side)) return error('INVALID_SIDE')
    if (!['isolated', 'cross'].includes(mode)) return error('INVALID_MODE')
    if (typeof qty !== 'number' || qty <= 0) return error('INVALID_QTY')
    if (!Number.isInteger(leverage) || leverage <= 0) return error('INVALID_LEVERAGE')

    let tradingAccount = await getTradingAccount(userOrClient)
    
    // Если торгового счета нет, создаем его автоматически
    if (!tradingAccount) {
      console.log(`[POSITIONS/OPEN] Trading account not found, creating new one for ${userOrClient.type}:${userOrClient.data.id}`)
      
      const accountData: any = {
        number: `${userOrClient.type === 'client' ? 'CLIENT' : 'USER'}-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
        type: 'DEMO', // По умолчанию создаем DEMO счет
        currency: 'USD',
        balance: 0,
        availableBalance: 0,
        margin: 0,
        profit: 0,
      }
      
      if (userOrClient.type === 'client') {
        accountData.clientId = userOrClient.data.id
      } else {
        accountData.userId = userOrClient.data.id
      }
      
      tradingAccount = await prisma.tradingAccount.create({
        data: accountData
      })
      
      console.log(`[POSITIONS/OPEN] Created trading account: ${tradingAccount.number} (${tradingAccount.id})`)
    }

    // Пробуем найти символ в разных форматах
    let sym = await prisma.symbol.findUnique({ where: { name: symbol } })
    
    // Если не нашли, пробуем варианты с "/" и без
    if (!sym) {
      // Пробуем добавить "/" если его нет (BTCUSD -> BTC/USD)
      if (!symbol.includes('/') && symbol.length >= 6) {
        const withSlash = `${symbol.slice(0, -3)}/${symbol.slice(-3)}`
        sym = await prisma.symbol.findFirst({ 
          where: { 
            OR: [
              { name: withSlash },
              { name: symbol },
              { ticker: symbol },
              { ticker: withSlash }
            ]
          } 
        })
      } else if (symbol.includes('/')) {
        // Пробуем убрать "/" (BTC/USD -> BTCUSD)
        const withoutSlash = symbol.replace('/', '')
        sym = await prisma.symbol.findFirst({ 
          where: { 
            OR: [
              { name: withoutSlash },
              { name: symbol },
              { ticker: symbol },
              { ticker: withoutSlash }
            ]
          } 
        })
      } else {
        // Пробуем поиск по ticker
        sym = await prisma.symbol.findFirst({ 
          where: { 
            OR: [
              { ticker: symbol },
              { ticker: { contains: symbol } }
            ]
          } 
        })
      }
    }
    
    if (!sym) {
      console.error(`[POSITIONS/OPEN] Symbol not found: ${symbol}`)
      return error('SYMBOL_NOT_FOUND', 404)
    }

    const allowed = (sym.allowedLeverages as unknown as number[]) || []
    if (!allowed.includes(leverage)) return error('INVALID_LEVERAGE')
    
    // Проверка ограничений плеча в зависимости от уровня доступа клиента
    if (userOrClient.type === 'client') {
      const client = await prisma.client.findUnique({
        where: { id: userOrClient.data.id },
        select: { accessLevel: true }
      })
      
      if (client?.accessLevel === 'BASE') {
        // Базовый уровень - только плечо 1x или 5x
        if (![1, 5].includes(leverage)) {
          return error('Базовый уровень доступа позволяет использовать только плечо 1x или 5x', 403)
        }
      }
    }

    // шаги количества/цены
    const minQty = Number(sym.minQty)
    const qtyStep = Number(sym.qtyStep)
    
    // Проверка минимального количества
    if (qty < minQty) {
      return NextResponse.json({ 
        code: 'INVALID_QTY', 
        message: `Минимальное количество: ${minQty}`,
        minQty 
      }, { status: 400 })
    }
    
    // Проверка шага количества (улучшенная валидация с учетом точности)
    const remainder = qty % qtyStep
    const tolerance = qtyStep * 1e-6 // Очень маленькая толерантность для ошибок округления
    if (remainder > tolerance && (qtyStep - remainder) > tolerance) {
      // Вычисляем ближайшее допустимое значение
      const nearestValidQty = Math.round(qty / qtyStep) * qtyStep
      return NextResponse.json({ 
        code: 'INVALID_QTY_STEP', 
        message: `Количество должно быть кратно ${qtyStep}. Ближайшее допустимое значение: ${nearestValidQty.toFixed(Math.max(0, -Math.log10(qtyStep))) || nearestValidQty}`,
        qtyStep,
        nearestValidQty: Number(nearestValidQty.toFixed(8))
      }, { status: 400 })
    }

    // используем цену из клиента как entry/mark, при отсутствии — fallback
    const clientPrice = Number(price)
    const priceValid = Number.isFinite(clientPrice) && clientPrice > 0
    const markPrice = priceValid ? clientPrice : Number(sym.priceStep)
    const entryPrice = markPrice

    const preview = previewPosition({
      side, qty, entryPrice, markPrice, leverage, mode, symbol: { mmr: Number(sym.mmr), feeTaker: Number(sym.feeTaker), feeMaker: Number(sym.feeMaker) }
    })

    // проверка маржи: для isolated блокируем IM; для cross позже
    const balance = Number(tradingAccount.balance)
    const available = Number(tradingAccount.availableBalance)
    if (mode === 'isolated' && preview.initialMargin > available + 1e-9) {
      return NextResponse.json({ code: 'INSUFFICIENT_MARGIN', required: preview.initialMargin, available }, { status: 400 })
    }

    const position = await prisma.$transaction(async (tx) => {
      // списываем IM с availableBalance для isolated
      if (mode === 'isolated') {
        await tx.tradingAccount.update({
          where: { id: tradingAccount.id },
          data: {
            availableBalance: (Number(tradingAccount.availableBalance) - preview.initialMargin).toFixed(8),
            margin: (Number(tradingAccount.margin) + preview.initialMargin).toFixed(8),
          }
        })
      }

      const pos = await tx.position.create({
        data: {
          tradingAccountId: tradingAccount.id,
          symbolId: sym.id,
          side: side === 'long' ? 'LONG' : 'SHORT',
          qty: qty.toString(),
          entryPrice: entryPrice.toString(),
          openPriceAtMoment: markPrice.toString(), // Рыночная цена на момент открытия
          displayName: sym.name, // Отображаемое имя (например BTCUSD)
          mode: mode === 'isolated' ? 'ISOLATED' : 'CROSS',
          leverage,
          imLocked: preview.initialMargin.toString(),
          mmrCached: preview.maintenanceMargin.toString(),
          liqPriceCached: preview.liquidationPrice.toString(),
          slPrice: sl ? String(sl) : null,
          tpPrice: tp ? String(tp) : null,
          fee: '0', // Комиссия отключена
        }
      })

      await tx.auditLog.create({
        data: {
          tradingAccountId: tradingAccount.id,
          type: 'POSITION_OPEN',
          payload: {
            request: { symbol, side, qty, mode, leverage, sl, tp, price: entryPrice },
            preview: JSON.parse(JSON.stringify(preview)) as any,
          } as any,
          correlationId,
        }
      })

      return pos
    })

    return NextResponse.json({
      position: {
        id: position.id,
        tradingAccountId: position.tradingAccountId,
        symbolId: position.symbolId,
        side: position.side,
        qty: position.qty,
        entryPrice: position.entryPrice,
        mode: position.mode,
        leverage: position.leverage,
        im_locked: position.imLocked,
        mmr_cached: position.mmrCached,
        liq_price: position.liqPriceCached,
        status: position.status,
        created_at: position.createdAt,
      },
      calculations: preview,
    })
  } catch (error) {
    console.error('POST /api/v1/positions/open error:', error)
    return NextResponse.json({ message: 'Internal error', correlation_id: correlationId }, { status: 500 })
  }
}


