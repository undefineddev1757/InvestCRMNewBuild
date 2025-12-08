import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUserOrClient } from '@/lib/get-current-user'

export async function GET(req: NextRequest) {
  try {
    const userOrClient = await getCurrentUserOrClient(req)
    
    if (!userOrClient) {
      return NextResponse.json({ accounts: [] })
    }

    let accounts: any[] = []
    
    if (userOrClient.type === 'client') {
      const raw = await prisma.financialAccount.findMany({ 
        where: { clientId: userOrClient.data.id }, 
        orderBy: { createdAt: 'asc' } 
      })
      accounts = raw.map(a => ({
        id: a.id,
        userId: a.userId,
        clientId: a.clientId,
        number: a.number,
        currency: a.currency,
        balance: a.balance == null ? '0' : (typeof a.balance === 'string' ? a.balance : a.balance.toString()),
        availableBalance: a.availableBalance == null ? '0' : (typeof a.availableBalance === 'string' ? a.availableBalance : a.availableBalance.toString()),
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      }))
    } else {
      const raw = await prisma.financialAccount.findMany({ 
        where: { userId: userOrClient.data.id }, 
        orderBy: { createdAt: 'asc' } 
      })
      accounts = raw.map(a => ({
        id: a.id,
        userId: a.userId,
        clientId: a.clientId,
        number: a.number,
        currency: a.currency,
        balance: a.balance == null ? '0' : (typeof a.balance === 'string' ? a.balance : a.balance.toString()),
        availableBalance: a.availableBalance == null ? '0' : (typeof a.availableBalance === 'string' ? a.availableBalance : a.availableBalance.toString()),
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      }))
    }
    
    return NextResponse.json({ accounts })
  } catch (error) {
    console.error('Financial accounts GET error:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}


