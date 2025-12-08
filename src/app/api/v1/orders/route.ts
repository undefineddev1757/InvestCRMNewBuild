import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const correlationId = req.headers.get('x-correlation-id') || undefined
  try {
    const session = await getServerSession(authOptions)
    const url = new URL(req.url)
    const emailParam = url.searchParams.get('email') || undefined
    const email = session?.user?.email || emailParam
    if (!email) return NextResponse.json({ code: 'UNAUTHORIZED' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const { positionId, symbol, type, side, qty, price, sl_price, tp_price } = body || {}
    if (!symbol || !type || !side || !qty) {
      return NextResponse.json({ code: 'VALIDATION_FAILED' }, { status: 422 })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return NextResponse.json({ code: 'USER_NOT_FOUND' }, { status: 404 })

    const account = await prisma.tradingAccount.findFirst({ where: { userId: user.id }, orderBy: { createdAt: 'asc' } })
    if (!account) return NextResponse.json({ code: 'ACCOUNT_NOT_FOUND' }, { status: 404 })

    const sym = await prisma.symbol.findUnique({ where: { name: symbol } })
    if (!sym) return NextResponse.json({ code: 'SYMBOL_NOT_FOUND' }, { status: 404 })

    let position = null
    if (positionId) {
      position = await prisma.position.findUnique({ where: { id: positionId } })
      if (!position) return NextResponse.json({ code: 'POSITION_NOT_FOUND' }, { status: 404 })
      if (position.tradingAccountId !== account.id) return NextResponse.json({ code: 'FORBIDDEN' }, { status: 403 })
    }

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          positionId: positionId || null,
          tradingAccountId: account.id,
          symbolId: sym.id,
          type,
          side,
          qty: qty.toString(),
          price: price ? price.toString() : null,
          slPrice: sl_price ? sl_price.toString() : null,
          tpPrice: tp_price ? tp_price.toString() : null,
        }
      })
      await tx.auditLog.create({
        data: {
          tradingAccountId: account.id,
          type: 'ORDER_CREATE',
          payload: { request: body, orderId: created.id },
          correlationId,
        }
      })
      return created
    })

    return NextResponse.json({ order })
  } catch (error) {
    console.error('POST /api/v1/orders error:', error)
    return NextResponse.json({ message: 'Internal error', correlation_id: correlationId }, { status: 500 })
  }
}


