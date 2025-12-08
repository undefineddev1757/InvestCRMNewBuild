import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUserOrClient } from '@/lib/get-current-user'

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const emailParam = url.searchParams.get('email')

    console.log('[DEMO-TOPUP] Email from query:', emailParam)

    let userOrClient = await getCurrentUserOrClient(req)

    // Если не нашли через getCurrentUserOrClient, попробуем найти клиента по email из параметра
    if (!userOrClient && emailParam) {
      console.log('[DEMO-TOPUP] Trying to find client by email:', emailParam)
      const client = await prisma.client.findUnique({
        where: { email: emailParam },
        select: { id: true, email: true, name: true, isActive: true }
      })

      if (client && client.isActive) {
        userOrClient = { type: 'client' as const, data: client }
      }
    }

    if (!userOrClient) {
      console.log('[DEMO-TOPUP] No user/client found')
      return NextResponse.json({ code: 'UNAUTHORIZED' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const amount = Number(body?.amount ?? 10000)
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ code: 'INVALID_AMOUNT' }, { status: 400 })
    }

    const clientId = userOrClient.data.id
    console.log('[DEMO-TOPUP] Client ID:', clientId, 'Amount:', amount)

    // Ищем демо-счет клиента
    const demo = await prisma.tradingAccount.findFirst({ 
      where: { clientId: clientId, type: 'DEMO' }, 
      orderBy: { createdAt: 'asc' } 
    })

    if (!demo) {
      console.log('[DEMO-TOPUP] Demo account not found for client:', clientId)
      return NextResponse.json({ code: 'DEMO_NOT_FOUND' }, { status: 404 })
    }

    console.log('[DEMO-TOPUP] Found demo account:', demo.id, 'Current balance:', demo.balance)

    const updated = await prisma.tradingAccount.update({
      where: { id: demo.id },
      data: {
        balance: (Number(demo.balance) + amount).toFixed(8),
        availableBalance: (Number(demo.availableBalance) + amount).toFixed(8),
      }
    })

    console.log('[DEMO-TOPUP] Updated balance:', updated.balance)

    return NextResponse.json({
      account: {
        id: updated.id,
        balance: Number(updated.balance),
        availableBalance: Number(updated.availableBalance),
      }
    })
  } catch (e) {
    console.error('POST /api/accounts/demo-topup error:', e)
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}


