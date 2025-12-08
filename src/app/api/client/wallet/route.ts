import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUserOrClient } from '@/lib/get-current-user'

export async function GET(req: NextRequest) {
  try {
    // Получаем клиента через JWT токен
    const userOrClient = await getCurrentUserOrClient(req)
    
    if (!userOrClient || userOrClient.type !== 'client') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const wallets = await prisma.wallet.findMany({
      where: {
        clientId: userOrClient.data.id
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ wallets })
  } catch (error) {
    console.error('GET /api/client/wallet error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}




