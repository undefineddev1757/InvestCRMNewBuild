import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type SymbolMeta = {
  imageUrl?: string
  emojiFallback?: string
}

function buildMetaForSymbol(name: string): SymbolMeta {
  // Крипто: BTCUSD/ETHUSD — даём стабильные ссылки (Coingecko)
  const base = name.replace(/USD$/i, '').toLowerCase()
  if (name.endsWith('USD')) {
    if (base === 'btc') return { imageUrl: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png' }
    if (base === 'eth') return { imageUrl: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png' }
  }

  // Акции (пример):
  if (name === 'AAPL') {
    return { imageUrl: 'https://s3-symbol-logo.tradingview.com/apple.svg' }
  }

  // Forex флаги как эмодзи
  const forexFlags: Record<string, string> = {
    EURUSD: '🇪🇺🇺🇸',
    GBPUSD: '🇬🇧🇺🇸',
    USDJPY: '🇺🇸🇯🇵',
    USDCHF: '🇺🇸🇨🇭',
    AUDUSD: '🇦🇺🇺🇸',
    USDCAD: '🇺🇸🇨🇦',
    NZDUSD: '🇳🇿🇺🇸',
    EURGBP: '🇪🇺🇬🇧',
    EURJPY: '🇪🇺🇯🇵',
    GBPJPY: '🇬🇧🇯🇵',
  }
  if (forexFlags[name]) {
    return { emojiFallback: forexFlags[name] }
  }

  return {}
}

export async function GET() {
  try {
    const symbols = await prisma.symbol.findMany({ select: { name: true } })
    const meta: Record<string, SymbolMeta> = {}

    // 1) Предзаполняем быстрые эвристики
    for (const s of symbols) {
      meta[s.name] = buildMetaForSymbol(s.name)
    }

    // 2) Пробуем подтянуть логотипы через Polygon.io
    const POLYGON_API_KEY = process.env.POLYGON_API_KEY

    const fetchPolygonLogo = async (ticker: string): Promise<string | undefined> => {
      try {
        if (!POLYGON_API_KEY) return undefined
        const url = `https://api.polygon.io/v3/reference/tickers/${encodeURIComponent(ticker)}?apiKey=${POLYGON_API_KEY}`
        const res = await fetch(url, { headers: { 'User-Agent': 'InvestCRM/1.0' } })
        if (!res.ok) return undefined
        const data = await res.json()
        const branding = data?.results?.branding || {}
        const candidate: string | undefined = branding.icon_url || branding.logo_url
        if (!candidate) return undefined
        return candidate.includes('apiKey=') ? candidate : `${candidate}?apiKey=${POLYGON_API_KEY}`
      } catch {
        return undefined
      }
    }

    // Ограниченная последовательная загрузка (символов немного)
    for (const s of symbols) {
      // Если уже есть imageUrl из быстрых эвристик — пропускаем
      if (meta[s.name]?.imageUrl) continue

      // Порядок проверки тикеров: акции -> crypto -> forex
      const candidates = [
        s.name,                 // акции, напр. AAPL
        `X:${s.name}`,          // крипто, напр. X:BTCUSD
        `C:${s.name}`,          // форекс, напр. C:EURUSD
      ]

      let found: string | undefined
      for (const ticker of candidates) {
        found = await fetchPolygonLogo(ticker)
        if (found) break
      }

      if (found) {
        meta[s.name] = { ...(meta[s.name] || {}), imageUrl: found }
      }
    }

    return NextResponse.json({ meta })
  } catch (e) {
    return NextResponse.json({ meta: {} })
  }
}


