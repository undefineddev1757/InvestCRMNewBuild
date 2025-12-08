import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { eventBus, adjustmentsChannel } from '@/lib/pubsub'

// GET /api/admin/symbols/adjustments?symbol=BTCUSD&all=1
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const symbol = (searchParams.get('symbol') || '').toUpperCase()
    const all = searchParams.get('all') === '1'
    console.log(`🔍 [adjustments API] Looking for symbol:`, symbol, 'all:', all)
    if (!symbol) return NextResponse.json({ adjustments: [] })

    const where: any = { symbolName: symbol }
    if (!all) where.endsAt = { gte: new Date() }

    const adjustments = await prisma.priceAdjustment.findMany({
      where,
      orderBy: { startAt: 'desc' },
      select: {
        id: true,
        type: true,
        value: true,
        startAt: true,
        endsAt: true,
        durationMinutes: true,
        basePrice: true,
      },
    })

    console.log(`🔍 [adjustments API] Found:`, adjustments.length, 'adjustments')
    return NextResponse.json({ adjustments })
  } catch (e) {
    return NextResponse.json({ adjustments: [] })
  }
}

// POST { symbol, type, value, minutes, basePrice? }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log(`💾 [adjustments API] Creating adjustment for symbol:`, body.symbol)
    const symbol = String(body.symbol || '').toUpperCase()
    const type = body.type === 'ABSOLUTE' ? 'ABSOLUTE' : 'PERCENT'
    const value = Number(body.value)
    const minutes = Math.max(1, Number(body.minutes || 5))
    const basePriceRaw = body.basePrice
    const basePrice = Number.isFinite(Number(basePriceRaw)) ? Number(basePriceRaw) : null
    console.log(`💾 [adjustments API] Saving as symbolName:`, symbol, 'type:', type, 'value:', value, 'basePrice:', basePrice)

    const startAt = new Date()
    const endsAt = new Date(startAt.getTime() + minutes * 60 * 1000)

    // Пытаемся сохранить с basePrice; если колонка отсутствует (старый БД), пробуем без неё
    const dataWithBase: any = {
      symbolName: symbol,
      type: type as any,
      value: value as any,
      startAt,
      endsAt,
      durationMinutes: minutes,
      basePrice: basePrice as any,
    }
    let created
    try {
      created = await prisma.priceAdjustment.create({ data: dataWithBase, select: { id: true } })
    } catch (e) {
      const dataWithoutBase: any = {
        symbolName: symbol,
        type: type as any,
        value: value as any,
        startAt,
        endsAt,
        durationMinutes: minutes,
      }
      created = await prisma.priceAdjustment.create({ data: dataWithoutBase, select: { id: true } })
    }

    // broadcast create event
    try {
      eventBus.publish(adjustmentsChannel(symbol), { type: 'created', symbol, id: created.id })
    } catch {}

    return NextResponse.json({ ok: true, id: created.id })
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
