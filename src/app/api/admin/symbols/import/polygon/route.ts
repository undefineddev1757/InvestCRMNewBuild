import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function normalizeName(ticker: string): { name: string; kind: 'crypto' | 'forex' | 'other' } {
  if (!ticker) return { name: '', kind: 'other' }
  if (ticker.startsWith('X:')) return { name: ticker.replace('X:', '').replace('/', ''), kind: 'crypto' }
  if (ticker.startsWith('C:')) return { name: ticker.replace('C:', '').replace('/', ''), kind: 'forex' }
  return { name: ticker.replace('/', ''), kind: 'other' }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as any
    const tickers: string[] = Array.isArray(body?.tickers) ? body.tickers : []
    if (!tickers.length) {
      return NextResponse.json({ message: 'tickers[] required' }, { status: 400 })
    }

    const created: string[] = []
    const skipped: string[] = []

    for (const t of tickers) {
      const { name, kind } = normalizeName(String(t))
      if (!name) continue
      const exists = await prisma.symbol.findUnique({ where: { name } })
      if (exists) { skipped.push(name); continue }
      const isCrypto = kind === 'crypto'
      const isForex = kind === 'forex'
      const price_step = isCrypto ? '0.01' : isForex ? (name.includes('JPY') ? '0.001' : '0.00001') : '0.01'
      await prisma.symbol.create({
        data: {
          name,
          minQty: (isCrypto ? '0.0001' : '1000'),
          qtyStep: (isCrypto ? '0.0001' : '1000'),
          priceStep: price_step,
          allowedLeverages: isCrypto ? [1,2,5,10,20,50,100] : [1,2,5,10,20,50,100,200],
          mmr: isCrypto ? '0.005' : '0.003',
          feeTaker: '0',
          feeMaker: '0',
          markPriceSource: 'polygon',
        }
      })
      created.push(name)
    }

    return NextResponse.json({ ok: true, created, skipped })
  } catch (e) {
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}


