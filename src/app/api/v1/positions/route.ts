import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserOrClient, getAllTradingAccounts } from '@/lib/get-current-user'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const userOrClient = await getCurrentUserOrClient(req)
    if (!userOrClient) return NextResponse.json({ positions: [] })

    const accounts = await getAllTradingAccounts(userOrClient)
    const accountIds = accounts.map(a => a.id)
    if (accountIds.length === 0) return NextResponse.json({ positions: [] })

    const positions = await prisma.position.findMany({
      where: {
        tradingAccountId: { in: accountIds },
        status: 'OPEN',
      },
      orderBy: { createdAt: 'desc' },
      include: {
        symbol: { select: { id: true, name: true } }
      }
    })

    return NextResponse.json({ positions })
  } catch (error) {
    console.error('GET /api/v1/positions error:', error)
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}
