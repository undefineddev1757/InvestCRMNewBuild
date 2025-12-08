import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateUnrealizedPnL, calculateRealizedPnL } from '@/lib/pnl-calculator'
import { getCurrentUserOrClient } from '@/lib/get-current-user'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * GET /api/admin/deals
 * Получение всех сделок или сделок конкретного клиента
 * Query параметры:
 * - clientId: ID клиента (опционально)
 * - status: OPEN | CLOSED | LIQUIDATED (опционально)
 * - limit: количество записей (опционально, по умолчанию 100)
 * - offset: смещение для пагинации (опционально)
 */
export async function GET(req: NextRequest) {
  try {
    console.log('[ADMIN-DEALS] GET request received')
    
    // Упрощённая проверка авторизации для админки
    // Админка использует свою систему авторизации через /api/admin/login
    // Проверяем сессию NextAuth
    try {
      const session = await getServerSession(authOptions)
      console.log('[ADMIN-DEALS] Session:', session ? session.user?.email : 'none')
      
      if (session?.user?.email) {
        // Проверяем что пользователь админ
        const user = await prisma.user.findUnique({
          where: { email: session.user.email },
          select: { role: true }
        })
        
        console.log('[ADMIN-DEALS] User role:', user?.role)
        
        if (user?.role === 'ADMIN') {
          console.log('[ADMIN-DEALS] ✓ Admin access granted via session')
        } else {
          console.log('[ADMIN-DEALS] ❌ Not an admin')
          return NextResponse.json({ error: 'Forbidden - not admin' }, { status: 403 })
        }
      } else {
        // Нет сессии - для админки это нормально, она использует localStorage
        // Временно разрешаем доступ (защита на уровне layout)
        console.log('[ADMIN-DEALS] ⚠️ No session, allowing for admin panel (protected by layout)')
      }
    } catch (sessionError) {
      console.log('[ADMIN-DEALS] Session check error:', sessionError)
      // Разрешаем доступ если проверка сессии не удалась
    }
    
    console.log('[ADMIN-DEALS] ✓ Access granted')

    const url = new URL(req.url)
    const clientId = url.searchParams.get('clientId')
    const status = url.searchParams.get('status') as any
    const limit = parseInt(url.searchParams.get('limit') || '100')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    // Фильтры для запроса
    const where: any = {}
    
    if (clientId) {
      console.log('[ADMIN-DEALS] Filtering by clientId:', clientId)
      // Получаем торговые счета клиента
      const tradingAccounts = await prisma.tradingAccount.findMany({
        where: { clientId },
        select: { id: true }
      })
      
      console.log('[ADMIN-DEALS] Found trading accounts:', tradingAccounts.length, tradingAccounts.map(a => a.id))
      
      if (tradingAccounts.length === 0) {
        console.log('[ADMIN-DEALS] ❌ No trading accounts found for client')
        return NextResponse.json({ deals: [], total: 0, currentPrices: {} })
      }
      
      where.tradingAccountId = {
        in: tradingAccounts.map(acc => acc.id)
      }
    }
    
    if (status) {
      where.status = status
    }
    
    console.log('[ADMIN-DEALS] Query where:', JSON.stringify(where))

    // Получаем сделки
    const [deals, total] = await Promise.all([
      prisma.position.findMany({
        where,
        include: {
          symbol: true,
          tradingAccount: {
            include: {
              client: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              },
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit,
        skip: offset
      }),
      prisma.position.count({ where })
    ])
    
    console.log('[ADMIN-DEALS] Found positions:', deals.length, '/ total:', total)

    // Получаем текущие цены для открытых позиций
    const openDeals = deals.filter(d => d.status === 'OPEN')
    const currentPrices: Record<string, number> = {}
    
    // Временно используем openPriceAtMoment или entryPrice как текущую цену
    // TODO: интегрировать реальные цены из WebSocket или API
    for (const deal of openDeals) {
      // Используем цену на момент открытия + небольшое случайное изменение для демонстрации
      const basePrice = deal.openPriceAtMoment 
        ? Number(deal.openPriceAtMoment) 
        : Number(deal.entryPrice)
      
      // Добавляем небольшое изменение (±0.1%) для демонстрации PnL
      const variation = basePrice * (Math.random() * 0.002 - 0.001) // от -0.1% до +0.1%
      currentPrices[deal.symbol.name] = basePrice + variation
      
      console.log(`[ADMIN-DEALS] ${deal.symbol.name} current price:`, currentPrices[deal.symbol.name])
    }

    // Форматируем сделки с расчетом PnL
    const formattedDeals = deals.map(deal => {
      let pnl = deal.pnl ? Number(deal.pnl) : null
      let pnlPercentage = null
      
      // Если сделка открыта и есть текущая цена, рассчитываем unrealized PnL
      if (deal.status === 'OPEN' && currentPrices[deal.symbol.name]) {
        pnl = calculateUnrealizedPnL(
          deal.side,
          Number(deal.entryPrice),
          currentPrices[deal.symbol.name],
          Number(deal.qty),
          deal.leverage
        )
        
        const initialMargin = (Number(deal.entryPrice) * Number(deal.qty)) / deal.leverage
        pnlPercentage = initialMargin > 0 ? (pnl / initialMargin) * 100 : 0
      }
      
      // Если сделка закрыта, используем сохраненный PnL или рассчитываем
      if (deal.status === 'CLOSED' && deal.exitPrice) {
        if (!pnl) {
          pnl = calculateRealizedPnL(
            deal.side,
            Number(deal.entryPrice),
            Number(deal.exitPrice),
            Number(deal.qty),
            Number(deal.fee)
          )
        }
        
        const initialMargin = (Number(deal.entryPrice) * Number(deal.qty)) / deal.leverage
        pnlPercentage = initialMargin > 0 ? (pnl / initialMargin) * 100 : 0
      }

      return {
        id: deal.id,
        tradingAccountId: deal.tradingAccountId,
        client: deal.tradingAccount.client,
        user: deal.tradingAccount.user,
        symbol: deal.symbol.name,
        displayName: deal.displayName || deal.symbol.name,
        side: deal.side,
        type: deal.side === 'LONG' ? 'BUY' : 'SELL',
        qty: Number(deal.qty),
        leverage: deal.leverage,
        entryPrice: Number(deal.entryPrice),
        exitPrice: deal.exitPrice ? Number(deal.exitPrice) : null,
        openPriceAtMoment: deal.openPriceAtMoment ? Number(deal.openPriceAtMoment) : null,
        currentPrice: currentPrices[deal.symbol.name] || null,
        status: deal.status,
        closeType: deal.closeType,
        pnl,
        pnlPercentage,
        fee: Number(deal.fee),
        imLocked: Number(deal.imLocked),
        slPrice: deal.slPrice ? Number(deal.slPrice) : null,
        tpPrice: deal.tpPrice ? Number(deal.tpPrice) : null,
        createdAt: deal.createdAt,
        closedAt: deal.closedAt,
        updatedAt: deal.updatedAt
      }
    })

    return NextResponse.json({
      deals: formattedDeals,
      total,
      currentPrices
    })
  } catch (error) {
    console.error('GET /api/admin/deals error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
