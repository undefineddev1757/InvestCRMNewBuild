import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PATCH: обновить символ
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const data: any = {}
    if (body.name !== undefined) data.name = String(body.name)
  if (body.type !== undefined) data.type = String(body.type)
  if (body.ticker !== undefined) data.ticker = body.ticker == null || body.ticker === '' ? null : String(body.ticker)
  if (body.market !== undefined) data.market = body.market == null || body.market === '' ? null : String(body.market)
    if (body.min_qty !== undefined) data.minQty = String(body.min_qty)
    if (body.qty_step !== undefined) data.qtyStep = String(body.qty_step)
    if (body.price_step !== undefined) data.priceStep = String(body.price_step)
    if (body.allowed_leverages !== undefined) data.allowedLeverages = body.allowed_leverages
    if (body.mmr !== undefined) data.mmr = String(body.mmr)
    if (body.fee_taker !== undefined) data.feeTaker = String(body.fee_taker)
    if (body.fee_maker !== undefined) data.feeMaker = String(body.fee_maker)
    if (body.mark_price_source !== undefined) data.markPriceSource = body.mark_price_source

    await prisma.symbol.update({ where: { id }, data })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}

// DELETE: удалить символ
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await prisma.symbol.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}


