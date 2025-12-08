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
    const { mode } = body || {}
    if (!['isolated', 'cross'].includes(mode)) return bad('INVALID_MODE')

    const position = await prisma.position.findUnique({ where: { id }, include: { symbol: true, tradingAccount: true } as any }) as any
    if (!position) return bad('POSITION_NOT_FOUND', 404)

    // доступ
    const account = await prisma.tradingAccount.findUnique({ where: { id: position.tradingAccountId } })
    if (!account) return bad('ACCOUNT_NOT_FOUND', 404)
    const user = await prisma.user.findUnique({ where: { id: account.userId || '' } })
    if (!user) return bad('USER_NOT_FOUND', 404)
    if (user.email !== email) return NextResponse.json({ code: 'FORBIDDEN' }, { status: 403 })

    const targetMode = mode === 'isolated' ? 'ISOLATED' : 'CROSS'
    if (position.mode === targetMode) {
      return NextResponse.json({ position: { id: position.id, mode: position.mode } })
    }

    // предпросчёт IM для isolated
    const mark = Number(position.entryPrice) // TODO: взять mark
    const preview = previewPosition({
      side: position.side === 'LONG' ? 'long' : 'short',
      qty: Number(position.qty),
      entryPrice: Number(position.entryPrice),
      markPrice: mark,
      leverage: Number(position.leverage),
      mode: mode,
      symbol: { mmr: Number(position.symbol.mmr), feeTaker: Number(position.symbol.feeTaker), feeMaker: Number(position.symbol.feeMaker) },
    })

    const updated = await prisma.$transaction(async (tx) => {
      if (targetMode === 'ISOLATED') {
        // Cross -> Isolated: нужно залочить IM
        const requiredIM = preview.initialMargin
        const available = Number(account.availableBalance)
        if (requiredIM > available + 1e-9) {
          throw new Error(`INSUFFICIENT_MARGIN:${requiredIM}:${available}`)
        }
        await tx.tradingAccount.update({
          where: { id: account.id },
          data: {
            availableBalance: (Number(account.availableBalance) - requiredIM).toFixed(8),
            margin: (Number(account.margin) + requiredIM).toFixed(8),
          }
        })
        const pos = await tx.position.update({
          where: { id: position.id },
          data: {
            mode: 'ISOLATED',
            imLocked: requiredIM.toString(),
            mmrCached: preview.maintenanceMargin.toString(),
            liqPriceCached: preview.liquidationPrice.toString(),
          }
        })
        await tx.auditLog.create({
          data: {
            tradingAccountId: account.id,
            type: 'POSITION_SET_MODE',
            payload: {
              positionId: position.id,
              oldMode: position.mode,
              newMode: 'ISOLATED',
              preview: JSON.parse(JSON.stringify(preview)) as any,
            } as any,
            correlationId,
          }
        })
        return pos
      } else {
        // Isolated -> Cross: освободить IM
        const released = Number(position.imLocked)
        if (released > 0) {
          await tx.tradingAccount.update({
            where: { id: account.id },
            data: {
              availableBalance: (Number(account.availableBalance) + released).toFixed(8),
              margin: (Number(account.margin) - released).toFixed(8),
            }
          })
        }
        const pos = await tx.position.update({
          where: { id: position.id },
          data: {
            mode: 'CROSS',
            imLocked: '0',
            mmrCached: preview.maintenanceMargin.toString(),
            liqPriceCached: preview.liquidationPrice.toString(),
          }
        })
        await tx.auditLog.create({
          data: {
            tradingAccountId: account.id,
            type: 'POSITION_SET_MODE',
            payload: { positionId: position.id, oldMode: position.mode, newMode: 'CROSS' } as any,
            correlationId,
          }
        })
        return pos
      }
    })

    return NextResponse.json({ position: { id: updated.id, mode: updated.mode, im_locked: updated.imLocked, updated_at: updated.updatedAt } })
  } catch (error: any) {
    if (typeof error?.message === 'string' && error.message.startsWith('INSUFFICIENT_MARGIN')) {
      const [, reqIM, avail] = error.message.split(':')
      return NextResponse.json({ code: 'INSUFFICIENT_MARGIN', required: Number(reqIM), available: Number(avail) }, { status: 400 })
    }
    console.error('POST /api/v1/positions/{id}/set-mode error:', error)
    return NextResponse.json({ message: 'Internal error', correlation_id: correlationId }, { status: 500 })
  }
}


