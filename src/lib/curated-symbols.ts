// Curated symbols list provided by admin. Format: Name\tGroup\tTicker
const RAW = `
Bitcoin	Cryptocurrencies	BTCUSD
`

// Fallback symbols if database is not available
const FALLBACK_SYMBOLS = [
  { ticker: 'BTCUSD', name: 'Bitcoin / US Dollar', shortName: 'BTC/USD', exchange: 'CRYPTO', market: 'crypto', pricePrecision: 2, volumePrecision: 8, priceCurrency: 'USD', type: 'crypto', active: true },
  { ticker: 'ETHUSD', name: 'Ethereum / US Dollar', shortName: 'ETH/USD', exchange: 'CRYPTO', market: 'crypto', pricePrecision: 2, volumePrecision: 8, priceCurrency: 'USD', type: 'crypto', active: true },
  { ticker: 'EURUSD', name: 'Euro / US Dollar', shortName: 'EUR/USD', exchange: 'FOREX', market: 'fx', pricePrecision: 5, volumePrecision: 2, priceCurrency: 'USD', type: 'currency', active: true },
  { ticker: 'AAPL', name: 'Apple Inc.', shortName: 'AAPL', exchange: 'XNYS', market: 'stocks', pricePrecision: 2, volumePrecision: 0, priceCurrency: 'USD', type: 'CS', active: true },
]

export type CuratedSymbol = {
  ticker: string
  name: string
  shortName: string
  exchange: string
  market: 'stocks' | 'fx' | 'crypto' | 'indices' | 'commodities'
  pricePrecision: number
  volumePrecision: number
  priceCurrency: string
  type: string
  active: boolean
}

function toFxTicker(t: string): string {
  const bare = t.replace('/', '')
  return `C:${bare.toUpperCase()}`
}

function toCryptoTicker(t: string): string {
  const bare = t.replace('/', '')
  return `X:${bare.toUpperCase()}`
}

export function getCuratedSymbols(): CuratedSymbol[] {
  const lines = RAW.split('\n').map(l => l.trim()).filter(Boolean)
  const out: CuratedSymbol[] = []
  for (const line of lines) {
    const [name, group, codeRaw] = line.split('\t')
    if (!name || !group || !codeRaw) continue
    const code = codeRaw.trim().toUpperCase()
    if (group === 'Forex') {
      out.push({
        ticker: toFxTicker(code),
        name,
        shortName: code.slice(0,3)+'/'+code.slice(3),
        exchange: 'FOREX',
        market: 'fx',
        pricePrecision: code.includes('JPY') ? 3 : 5,
        volumePrecision: 2,
        priceCurrency: code.slice(3),
        type: 'currency',
        active: true,
      })
    } else if (group === 'Cryptocurrencies') {
      out.push({
        ticker: toCryptoTicker(code),
        name,
        shortName: code.replace('USD','/USD'),
        exchange: 'CRYPTO',
        market: 'crypto',
        pricePrecision: 2,
        volumePrecision: 8,
        priceCurrency: 'USD',
        type: 'crypto',
        active: true,
      })
    } else {
      // Stocks default
      out.push({
        ticker: code,
        name,
        shortName: code,
        exchange: group.includes('US') ? 'XNYS' : 'XNAS',
        market: 'stocks',
        pricePrecision: 2,
        volumePrecision: 0,
        priceCurrency: 'USD',
        type: 'CS',
        active: true,
      })
    }
  }
  return out
}


