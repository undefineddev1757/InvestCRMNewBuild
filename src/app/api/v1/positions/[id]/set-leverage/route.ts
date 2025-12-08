import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { previewPosition } from '@/lib/risk'

function bad(message: string, status = 400) {
  return NextResponse.json({ code: 'VALIDATION_FAILED', message }, { status })
}

export async function POST(req: NextRequest, { params }: any) {
  const correlationId = req.headers.get('x-correlation-id') || undefined
  try {
    const session = await getServerSession(authOptions)
    const url = new URL(req.url)
    const emailParam = url.searchParams.get('email') || undefined
    const email = session?.user?.email || emailParam
    if (!email) return NextResponse.json({ code: 'UNAUTHORIZED' }, { status: 401 })

    const id = params.id
    const body = await req.json().catch(() => ({}))
    const { leverage } = body || {}
    if (!Number.isInteger(leverage) || leverage <= 0) return bad('INVALID_LEVERAGE')

    const position = await prisma.position.findUnique({ where: { id }, include: { symbol: true, tradingAccount: true } as any }) as any
    if (!position) return bad('POSITION_NOT_FOUND', 404)

    // доступ по пользователю
    const account = await prisma.tradingAccount.findUnique({ where: { id: position.tradingAccountId } })
    if (!account) return bad('ACCOUNT_NOT_FOUND', 404)
    const user = await prisma.user.findUnique({ where: { id: account.userId || '' } })
    if (!user) return bad('USER_NOT_FOUND', 404)
    if (user.email !== email) return NextResponse.json({ code: 'FORBIDDEN' }, { status: 403 })

    // валидация плеча по символу
    const allowed = (position.symbol.allowedLeverages as unknown as number[]) || []
    if (!allowed.includes(leverage)) return bad('INVALID_LEVERAGE')

    // предпросчёт
    const mark = Number(position.entryPrice) // TODO: получить mark из источника
    const preview = previewPosition({
      side: position.side === 'LONG' ? 'long' : 'short',
      qty: Number(position.qty),
      entryPrice: Number(position.entryPrice),
      markPrice: mark,
      leverage,
      mode: position.mode === 'ISOLATED' ? 'isolated' : 'cross',
      symbol: { mmr: Number(position.symbol.mmr), feeTaker: Number(position.symbol.feeTaker), feeMaker: Number(position.symbol.feeMaker) },
    })

    // правила для isolated: при уменьшении плеча IM растёт — проверяем доступную маржу
    if (position.mode === 'ISOLATED') {
      const oldIM = Number(position.imLocked)
      const deltaIM = preview.initialMargin - oldIM
      if (deltaIM > 0) {
        const available = Number(account.availableBalance)
        if (deltaIM > available + 1e-9) {
          return NextResponse.json({ code: 'INSUFFICIENT_MARGIN', required_delta: deltaIM, available }, { status: 400 })
        }
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (position.mode === 'ISOLATED') {
        const oldIM = Number(position.imLocked)
        const deltaIM = preview.initialMargin - oldIM
        if (Math.abs(deltaIM) > 1e-12) {
          await tx.tradingAccount.update({
            where: { id: account.id },
            data: {
              availableBalance: (Number(account.availableBalance) - deltaIM).toFixed(8),
              margin: (Number(account.margin) + deltaIM).toFixed(8),
            }
          })
        }
      }

      const pos = await tx.position.update({
        where: { id: position.id },
        data: {
          leverage,
          imLocked: preview.initialMargin.toString(),
          mmrCached: preview.maintenanceMargin.toString(),
          liqPriceCached: preview.liquidationPrice.toString(),
        }
      })

      await tx.auditLog.create({
        data: {
          tradingAccountId: account.id,
          type: 'POSITION_SET_LEVERAGE',
          payload: {
            positionId: position.id,
            oldLeverage: position.leverage,
            newLeverage: leverage,
            preview: JSON.parse(JSON.stringify(preview)) as any,
          } as any,
          correlationId,
        }
      })

      return pos
    })

    return NextResponse.json({
      position: {
        id: updated.id,
        leverage: updated.leverage,
        im_locked: updated.imLocked,
        mmr_cached: updated.mmrCached,
        liq_price: updated.liqPriceCached,
        updated_at: updated.updatedAt,
      }
    })
  } catch (error) {
    console.error('POST /api/v1/positions/{id}/set-leverage error:', error)
    return NextResponse.json({ message: 'Internal error', correlation_id: correlationId }, { status: 500 })
  }
}


