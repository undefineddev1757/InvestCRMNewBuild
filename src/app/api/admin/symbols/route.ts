import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET: список символов (для админки)
export async function GET() {
  try {
    const symbols = await prisma.symbol.findMany({ orderBy: { createdAt: 'asc' } })
    const data = symbols.map(s => ({
      id: s.id,
      name: s.name,
      type: s.type,
      ticker: s.ticker,
      market: s.market,
      min_qty: s.minQty.toString(),
      qty_step: s.qtyStep.toString(),
      price_step: s.priceStep.toString(),
      allowed_leverages: s.allowedLeverages as unknown as number[],
      mmr: s.mmr.toString(),
      fee_taker: s.feeTaker.toString(),
      fee_maker: s.feeMaker.toString(),
      mark_price_source: s.markPriceSource,
      logo_url: s.logoUrl || null,
      created_at: s.createdAt,
      updated_at: s.updatedAt,
    }))
    return NextResponse.json({ symbols: data })
  } catch (e) {
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}

// POST: создать символ
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const {
      name,
      type = null,
      ticker = null,
      market = null,
      min_qty = '0.0001',
      qty_step = '0.0001',
      price_step = '0.0001',
      allowed_leverages = [1, 2, 5, 10],
      mmr = '0.005',
      fee_taker = '0',
      fee_maker = '0',
      mark_price_source = null,
      logo_url = null,
    } = body || {}

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ message: 'name is required' }, { status: 400 })
    }

    const created = await prisma.symbol.create({
      data: {
        name,
        type: type || undefined,
        ticker: ticker || undefined,
        market: market || undefined,
        minQty: min_qty.toString(),
        qtyStep: qty_step.toString(),
        priceStep: price_step.toString(),
        allowedLeverages: allowed_leverages,
        mmr: mmr.toString(),
        feeTaker: fee_taker.toString(),
        feeMaker: fee_maker.toString(),
        markPriceSource: mark_price_source,
        logoUrl: logo_url,
      },
    })
    return NextResponse.json({ id: created.id })
  } catch (e) {
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}


