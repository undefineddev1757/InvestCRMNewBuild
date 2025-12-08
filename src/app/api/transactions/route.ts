import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getCurrentUserOrClient } from '@/lib/get-current-user'

export async function GET(req: NextRequest) {
  try {
    // Получаем клиента или пользователя через JWT токен или сессию
    const userOrClient = await getCurrentUserOrClient(req)

    if (!userOrClient) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // Ищем транзакции по clientId или userId
    const whereClause: any = {}
    if (userOrClient.type === 'client') {
      whereClause.clientId = userOrClient.data.id
    } else {
      whereClause.userId = userOrClient.data.id
    }

    const raw = await prisma.transaction.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    const transactions = raw.map(t => ({
      id: t.id,
      userId: t.userId,
      clientId: t.clientId,
      type: t.type,
      status: t.status,
      amount: t.amount?.toString?.() ?? String(t.amount),
      currency: t.currency,
      description: t.description,
      createdAt: t.createdAt,
      fromFinancialAccountId: t.fromFinancialAccountId,
      toFinancialAccountId: t.toFinancialAccountId,
      fromTradingAccountId: t.fromTradingAccountId,
      toTradingAccountId: t.toTradingAccountId,
    }))

    return NextResponse.json({ transactions })
  } catch (error) {
    console.error('Transactions GET error:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}


