import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserOrClient, getAllTradingAccounts } from '@/lib/get-current-user'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const statusParam = (new URL(req.url).searchParams.get('status') || 'ALL').toUpperCase()
    
    const userOrClient = await getCurrentUserOrClient(req)
    if (!userOrClient) return NextResponse.json({ positions: [] })

    const accounts = await getAllTradingAccounts(userOrClient)
    const accountIds = accounts.map(a => a.id)
    if (accountIds.length === 0) return NextResponse.json({ positions: [] })

    const where: any = { tradingAccountId: { in: accountIds } }
    if (statusParam === 'OPEN') where.status = 'OPEN'
    if (statusParam === 'CLOSED') where.status = 'CLOSED'

    const positions = await prisma.position.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        symbol: { select: { id: true, name: true } }
      }
    })

    // Подтягиваем реализованный PnL из AuditLog для закрытых позиций
    const closeLogs = await prisma.auditLog.findMany({
      where: {
        tradingAccountId: { in: accountIds },
        type: 'POSITION_CLOSE',
      },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    })

    const realizedMap: Record<string, number> = {}
    for (const log of closeLogs) {
      try {
        const payload: any = log.payload as any
        const pid = payload?.positionId
        const pnl = Number(payload?.realized_pnl)
        if (pid && Number.isFinite(pnl)) {
          // берём самый свежий лог для позиции
          if (!(pid in realizedMap)) realizedMap[pid] = pnl
        }
      } catch {}
    }

    const enriched = positions.map(p => ({
      ...p,
      realizedPnl: p.status === 'CLOSED' ? (realizedMap[p.id] ?? null) : null,
    }))

    return NextResponse.json({ positions: enriched })
  } catch (error) {
    console.error('GET /api/v1/positions/history error:', error)
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}


