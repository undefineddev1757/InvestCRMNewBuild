import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const symbols = await prisma.symbol.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        minQty: true,
        qtyStep: true,
        priceStep: true,
        allowedLeverages: true,
        mmr: true,
        feeTaker: true,
        feeMaker: true,
        markPriceSource: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    const data = symbols.map(s => ({
      id: s.id,
      name: s.name,
      min_qty: s.minQty.toString(),
      qty_step: s.qtyStep.toString(),
      price_step: s.priceStep.toString(),
      allowed_leverages: s.allowedLeverages as number[],
      mmr: s.mmr.toString(),
      fee_taker: s.feeTaker.toString(),
      fee_maker: s.feeMaker.toString(),
      mark_price_source: s.markPriceSource,
      created_at: s.createdAt,
      updated_at: s.updatedAt,
    }))

    return NextResponse.json({ symbols: data })
  } catch (error) {
    console.error('GET /api/v1/symbols error:', error)
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}


