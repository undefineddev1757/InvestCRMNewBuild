import { NextRequest, NextResponse } from 'next/server'

const POLYGON_API_KEY = process.env.POLYGON_API_KEY as string | undefined

export async function GET(req: NextRequest) {
  try {
    if (!POLYGON_API_KEY) {
      return NextResponse.json({ code: 'NO_POLYGON_KEY', message: 'POLYGON_API_KEY not configured' }, { status: 503 })
    }
    const { searchParams } = new URL(req.url)
    const ticker = searchParams.get('ticker')
    const multiplier = searchParams.get('multiplier')
    const timespan = searchParams.get('timespan')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    if (!ticker || !multiplier || !timespan || !from || !to) {
      return NextResponse.json({ code: 'BAD_REQUEST', message: 'ticker, multiplier, timespan, from, to are required' }, { status: 400 })
    }

    const url = `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(ticker)}/range/${encodeURIComponent(multiplier!)}/${encodeURIComponent(timespan!)}/${encodeURIComponent(from!)}/${encodeURIComponent(to!)}?adjusted=true&sort=asc&limit=50000&apikey=${POLYGON_API_KEY}`
    const r = await fetch(url, { headers: { 'User-Agent': 'InvestCRM/1.0' }, cache: 'no-store' })
    if (!r.ok) {
      const text = await r.text().catch(() => '')
      return NextResponse.json({ code: 'POLYGON_ERROR', status: r.status, message: text || r.statusText }, { status: r.status })
    }
    const j = await r.json()
    return NextResponse.json(j, { headers: { 'cache-control': 'private, max-age=1' } })
  } catch (e: any) {
    return NextResponse.json({ code: 'INTERNAL', message: e?.message || 'error' }, { status: 500 })
  }
}


