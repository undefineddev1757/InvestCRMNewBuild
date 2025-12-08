import { NextResponse } from 'next/server'

const POLYGON_API_KEY = process.env.POLYGON_API_KEY as string

// Минимальный фоллбек-список (чтобы не отдавать 503)
const FALLBACK_SYMBOLS: any[] = [
  // Crypto
  { ticker: 'X:BTCUSD', name: 'Bitcoin / US Dollar', shortName: 'BTC/USD', exchange: 'CRYPTO', market: 'crypto', pricePrecision: 2, volumePrecision: 8, priceCurrency: 'USD', type: 'crypto', active: true },
  { ticker: 'X:ETHUSD', name: 'Ethereum / US Dollar', shortName: 'ETH/USD', exchange: 'CRYPTO', market: 'crypto', pricePrecision: 2, volumePrecision: 8, priceCurrency: 'USD', type: 'crypto', active: true },
  { ticker: 'X:XRPUSD', name: 'Ripple / US Dollar', shortName: 'XRP/USD', exchange: 'CRYPTO', market: 'crypto', pricePrecision: 4, volumePrecision: 8, priceCurrency: 'USD', type: 'crypto', active: true },
  { ticker: 'X:ADAUSD', name: 'Cardano / US Dollar', shortName: 'ADA/USD', exchange: 'CRYPTO', market: 'crypto', pricePrecision: 4, volumePrecision: 8, priceCurrency: 'USD', type: 'crypto', active: true },
  { ticker: 'X:LTCUSD', name: 'Litecoin / US Dollar', shortName: 'LTC/USD', exchange: 'CRYPTO', market: 'crypto', pricePrecision: 2, volumePrecision: 8, priceCurrency: 'USD', type: 'crypto', active: true },
  // Forex
  { ticker: 'C:EURUSD', name: 'Euro / US Dollar', shortName: 'EUR/USD', exchange: 'FOREX', market: 'fx', pricePrecision: 5, volumePrecision: 2, priceCurrency: 'USD', type: 'currency', active: true },
  { ticker: 'C:GBPUSD', name: 'British Pound / US Dollar', shortName: 'GBP/USD', exchange: 'FOREX', market: 'fx', pricePrecision: 5, volumePrecision: 2, priceCurrency: 'USD', type: 'currency', active: true },
  { ticker: 'C:USDJPY', name: 'US Dollar / Japanese Yen', shortName: 'USD/JPY', exchange: 'FOREX', market: 'fx', pricePrecision: 3, volumePrecision: 2, priceCurrency: 'JPY', type: 'currency', active: true },
  { ticker: 'C:USDCHF', name: 'US Dollar / Swiss Franc', shortName: 'USD/CHF', exchange: 'FOREX', market: 'fx', pricePrecision: 5, volumePrecision: 2, priceCurrency: 'CHF', type: 'currency', active: true },
]

function filterAndSlice(list: any[], search: string, type: string, limit: number) {
  let filtered = list
  if (search) {
    const s = search.toLowerCase()
    filtered = filtered.filter((sym: any) =>
      String(sym.ticker).toLowerCase().includes(s) ||
      String(sym.name || '').toLowerCase().includes(s) ||
      String(sym.shortName || '').toLowerCase().includes(s)
    )
  }
  if (type) {
    filtered = filtered.filter((sym: any) => String(sym.type) === type)
  }
  return filtered.slice(0, limit)
}

// Кэш в памяти (1 час)
let symbolsCache: any[] | null = null
let lastCacheUpdate = 0
const CACHE_DURATION = 60 * 60 * 1000
let isCurrentlyFetching = false

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const type = searchParams.get('type') || ''
    const limit = parseInt(searchParams.get('limit') || '100')
    const strict = searchParams.get('strict') === '1'

    if (!POLYGON_API_KEY) {
      if (strict) {
        return NextResponse.json({ success: false, error: 'POLYGON_API_KEY not configured' }, { status: 503 })
      }
      const data = filterAndSlice(FALLBACK_SYMBOLS, search, type, limit)
      return NextResponse.json({ success: true, data, total: data.length, cached: false, fallback: true })
    }

    const now = Date.now()
    if (!symbolsCache || now - lastCacheUpdate > CACHE_DURATION) {
      if (!isCurrentlyFetching) {
        isCurrentlyFetching = true
        try {
          symbolsCache = await fetchAllSymbolsFromPolygonStrict()
          lastCacheUpdate = Date.now()
        } finally {
          isCurrentlyFetching = false
        }
      }
    }

    if (!symbolsCache) {
      if (strict) {
        return NextResponse.json({ success: false, error: 'Polygon symbols unavailable' }, { status: 503 })
      }
      const data = filterAndSlice(FALLBACK_SYMBOLS, search, type, limit)
      return NextResponse.json({ success: true, data, total: data.length, cached: false, fallback: true })
    }

    let filtered = symbolsCache
    if (search) {
      const s = search.toLowerCase()
      filtered = filtered.filter((sym: any) =>
        sym.ticker.toLowerCase().includes(s) ||
        sym.name?.toLowerCase().includes(s) ||
        sym.shortName?.toLowerCase().includes(s)
      )
    }
    if (type) {
      filtered = filtered.filter((sym: any) => sym.type === type)
    }
    filtered = filtered.slice(0, limit)

    return NextResponse.json({ success: true, data: filtered, total: filtered.length, cached: true, lastUpdate: lastCacheUpdate })
  } catch (error) {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const type = searchParams.get('type') || ''
    const limit = parseInt(searchParams.get('limit') || '100')
    const strict = searchParams.get('strict') === '1'
    if (strict) {
      return NextResponse.json({ success: false, error: 'Failed to fetch symbols' }, { status: 503 })
    }
    const data = filterAndSlice(FALLBACK_SYMBOLS, search, type, limit)
    return NextResponse.json({ success: true, data, total: data.length, cached: false, fallback: true })
  }
}

async function fetchAllSymbolsFromPolygonStrict(): Promise<any[]> {
  const [crypto, forex] = await Promise.all([
    fetch(`https://api.polygon.io/v3/reference/tickers?market=crypto&active=true&limit=1000&apikey=${POLYGON_API_KEY}`, { headers: { 'User-Agent': 'InvestCRM/1.0' } }).then(r => r.ok ? r.json() : Promise.reject(r)).then(j => j.results || []),
    fetch(`https://api.polygon.io/v3/reference/tickers?market=fx&active=true&limit=1000&apikey=${POLYGON_API_KEY}`, { headers: { 'User-Agent': 'InvestCRM/1.0' } }).then(r => r.ok ? r.json() : Promise.reject(r)).then(j => j.results || []),
  ])

  const cryptoMapped = crypto.map((item: any) => ({
      ticker: item.ticker,
      name: item.name || `${item.ticker} Cryptocurrency`,
      shortName: item.ticker.replace('X:', ''),
      exchange: 'CRYPTO',
      market: 'crypto',
    pricePrecision: 8,
      volumePrecision: 8,
      priceCurrency: item.currency_name || 'USD',
      type: 'crypto',
    active: item.active,
  }))

  const forexMapped = forex.map((item: any) => ({
      ticker: item.ticker,
      name: item.name || `${item.ticker} Currency Pair`,
      shortName: item.ticker.replace('C:', ''),
      exchange: 'FOREX',
      market: 'fx',
      pricePrecision: item.ticker.includes('JPY') ? 3 : 5,
      volumePrecision: 2,
      priceCurrency: item.base_currency_symbol || 'USD',
      type: 'currency',
    active: item.active,
  }))

  return [...cryptoMapped, ...forexMapped]
}
