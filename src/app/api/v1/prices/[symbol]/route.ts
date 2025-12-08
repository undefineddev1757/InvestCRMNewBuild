import { NextRequest, NextResponse } from 'next/server'
import { getMark, setMark } from '@/lib/marks-cache'

const POLYGON_API_KEY = process.env.POLYGON_API_KEY as string

// Получить последнюю цену из Polygon (crypto или forex)
async function fetchFromPolygon(symbolRaw: string): Promise<{ mark: number; last: number; bid?: number; ask?: number } | null> {
  const s = symbolRaw.replace(/^C:/, '').replace(/^X:/, '').toUpperCase()
  // Попробуем варианты разделения: 3-символьная котируемая валюта и 4-символьная (USDT)
  const candidates = [3, 4]
  for (const qlen of candidates) {
    if (s.length <= qlen) continue
    const base = s.slice(0, s.length - qlen)
    const quote = s.slice(-qlen)
    try {
      // 1) Crypto last trade v2 (pair with hyphen)
      const cryptoV2 = `https://api.polygon.io/v2/last/trade/crypto/${encodeURIComponent(base)}-${encodeURIComponent(quote)}?apiKey=${POLYGON_API_KEY}`
      const cr2 = await fetch(cryptoV2)
      if (cr2.ok) {
        const cj2 = await cr2.json().catch(() => ({})) as any
        const price2 = Number(cj2?.results?.p ?? cj2?.price)
        if (Number.isFinite(price2) && price2 > 0) {
          return { mark: price2, last: price2 }
        }
      }
    } catch {}
    try {
      // 2) Crypto last trade v2 (C: pair)
      const cryptoV2C = `https://api.polygon.io/v2/last/trade/C:${encodeURIComponent(base + quote)}?apiKey=${POLYGON_API_KEY}`
      const cr2c = await fetch(cryptoV2C)
      if (cr2c.ok) {
        const cj2c = await cr2c.json().catch(() => ({})) as any
        const price2c = Number(cj2c?.results?.p ?? cj2c?.price)
        if (Number.isFinite(price2c) && price2c > 0) {
          return { mark: price2c, last: price2c }
        }
      }
    } catch {}
    try {
      // 3) Crypto last trade v1 (legacy)
      const cryptoUrl = `https://api.polygon.io/v1/last/crypto/${encodeURIComponent(base)}/${encodeURIComponent(quote)}?apiKey=${POLYGON_API_KEY}`
      const cr = await fetch(cryptoUrl)
      if (cr.ok) {
        const cj = await cr.json().catch(() => ({})) as any
        const price = Number(cj?.last?.price ?? cj?.price)
        if (Number.isFinite(price) && price > 0) {
          return { mark: price, last: price }
        }
      }
    } catch {}
    try {
      // 4) Forex last quote (bid/ask)
      const fxUrl = `https://api.polygon.io/v1/last_quote/currencies/${encodeURIComponent(base)}/${encodeURIComponent(quote)}?apiKey=${POLYGON_API_KEY}`
      const fr = await fetch(fxUrl)
      if (fr.ok) {
        const fj = await fr.json().catch(() => ({})) as any
        const bid = Number(fj?.last?.bid ?? fj?.bid)
        const ask = Number(fj?.last?.ask ?? fj?.ask)
        const last = Number(fj?.last?.price ?? ((bid + ask) / 2))
        const mark = Number.isFinite(last) ? last : Number.isFinite(bid) && Number.isFinite(ask) ? (bid + ask) / 2 : NaN
        if (Number.isFinite(mark) && mark > 0) {
          return { mark, last: mark, bid: Number.isFinite(bid) ? bid : undefined, ask: Number.isFinite(ask) ? ask : undefined }
        }
      }
    } catch {}
  }
  // 3) Fallback: предыдущая агрегированная свеча
  try {
    // Для акций (SPCE, AAPL и т.д.) используем прямой тикер без префикса
    const tickers = s.length <= 6 ? [s, `X:${s}`, `C:${s}`] : [`X:${s}`, `C:${s}`]
    for (const t of tickers) {
      const prevUrl = `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(t)}/prev?adjusted=true&apiKey=${POLYGON_API_KEY}`
      const pr = await fetch(prevUrl)
      if (pr.ok) {
        const pj = await pr.json().catch(() => ({})) as any
        const price = Number(pj?.results?.[0]?.c ?? pj?.results?.[0]?.o)
        if (Number.isFinite(price) && price > 0) {
          return { mark: price, last: price }
        }
      }
    }
  } catch {}
  return null
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ symbol: string }> }) {
  try {
    const { symbol } = await params
    const upper = symbol.toUpperCase()

    // Возьмём из кеша, если очень свежий (1 минута)
    const cached = getMark(upper, 60000)
    if (cached && Number.isFinite(cached.price)) {
      return NextResponse.json({ symbol: upper, mark: cached.price, last: cached.price, ts: cached.ts })
    }

    const live = await fetchFromPolygon(upper)
    if (!live) {
      // Попробуем вернуть старый кэш до 30 минут, чтобы не рвать фронт
      const older = getMark(upper, 30 * 60 * 1000)
      if (older && Number.isFinite(older.price)) {
        return NextResponse.json({ symbol: upper, mark: older.price, last: older.price, ts: older.ts, stale: true })
      }
      // Безопасный ответ: последний известный close из prev-аггрегата
      try {
        const prev = await fetchFromPolygon(upper)
        if (prev) {
          setMark(upper, prev.mark)
          return NextResponse.json({ symbol: upper, ...prev, ts: Date.now(), stale: true })
        }
      } catch {}
      // Абсолютный fallback: отдаём мягкий ответ 200 без цены, чтобы клиент мог тихо зафоллбечиться
      return NextResponse.json({ symbol: upper, code: 'NO_LIVE_PRICE', message: 'Live price unavailable', stale: true }, { status: 200 })
    }

    let { mark, last, bid, ask } = live

    // Без любых корректировок из БД — отдаём как есть

    setMark(upper, mark)
    return NextResponse.json({ symbol: upper, mark, last, bid, ask, ts: Date.now() })
  } catch (error) {
    console.error('GET /api/v1/prices/{symbol} error:', error)
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}

export async function HEAD(_req: NextRequest, { params }: { params: Promise<{ symbol: string }> }) {
  try {
    const { symbol } = await params
    // HEAD-запрос используем как сигнал актуального символа; тут ничего не считаем,
    // но можем обновлять в памяти, если потребуется в будущем.
    return new NextResponse(null, { status: 200 })
  } catch {
    return new NextResponse(null, { status: 200 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ symbol: string }> }) {
  try {
    const { symbol } = await params
    const body = await req.json().catch(() => ({})) as any
    const price = Number(body?.price)
    if (!Number.isFinite(price) || price <= 0) return NextResponse.json({ code: 'INVALID_PRICE' }, { status: 400 })
    setMark(symbol, price)
    return NextResponse.json({ ok: true, symbol, price })
  } catch (e) {
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}


