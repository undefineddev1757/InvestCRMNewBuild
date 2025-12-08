import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUserOrClient } from '@/lib/get-current-user'

/**
 * GET /api/client/me
 * Получить информацию о текущем клиенте (включая accessLevel)
 * Требует JWT токен в заголовке Authorization
 */
export async function GET(req: NextRequest) {
  try {
    const userOrClient = await getCurrentUserOrClient(req)

    if (!userOrClient || userOrClient.type !== 'client') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const client = await prisma.client.findUnique({
      where: { id: userOrClient.data.id },
      select: {
        id: true,
        name: true,
        email: true,
        accessLevel: true,
        isActive: true,
        emailVerified: true,
        canCreateDeals: true,
        canCreateWithdrawals: true,
        canCreateTickets: true,
        depositRequiredAmount: true,
        depositRequiredAt: true,
      }
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    return NextResponse.json({ client })
  } catch (error) {
    console.error('[CLIENT-ME] Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

