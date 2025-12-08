import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: any) {
  const correlationId = req.headers.get('x-correlation-id') || undefined
  try {
    const session = await getServerSession(authOptions)
    const email = session?.user?.email
    if (!email) return NextResponse.json({ code: 'UNAUTHORIZED' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const { sl_price, tp_price } = body || {}

    const position = await prisma.position.findUnique({ where: { id: params.id } })
    if (!position) return NextResponse.json({ code: 'NOT_FOUND' }, { status: 404 })
    const account = await prisma.tradingAccount.findUnique({ where: { id: position.tradingAccountId } })
    if (!account) return NextResponse.json({ code: 'NOT_FOUND' }, { status: 404 })
    const user = await prisma.user.findUnique({ where: { id: account.userId || '' } })
    if (!user || user.email !== email) return NextResponse.json({ code: 'FORBIDDEN' }, { status: 403 })

    const updated = await prisma.$transaction(async (tx) => {
      const pos = await tx.position.update({
        where: { id: position.id },
        data: {
          slPrice: sl_price != null ? sl_price.toString() : null,
          tpPrice: tp_price != null ? tp_price.toString() : null,
        }
      })
      await tx.auditLog.create({
        data: {
          tradingAccountId: account.id,
          type: 'POSITION_UPDATE_PROTECTION',
          payload: { positionId: position.id, sl_price, tp_price },
          correlationId,
        }
      })
      return pos
    })

    return NextResponse.json({ position: { id: updated.id, sl_price: updated.slPrice, tp_price: updated.tpPrice, updated_at: updated.updatedAt } })
  } catch (error) {
    console.error('POST /api/v1/positions/{id}/update-protection error:', error)
    return NextResponse.json({ message: 'Internal error', correlation_id: correlationId }, { status: 500 })
  }
}


