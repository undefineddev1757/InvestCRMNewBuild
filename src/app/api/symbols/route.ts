import { NextResponse } from 'next/server'

// Всі торгові інструменти
const TRADING_SYMBOLS = [
  // Major Forex Pairs
  {
    id: 1,
    ticker: 'EURUSD',
    name: 'Euro / US Dollar',
    shortName: 'EUR/USD',
    exchange: 'Forex',
    market: 'forex',
    pricePrecision: 5,
    volumePrecision: 2,
    priceCurrency: 'USD',
    type: 'forex',
    basePrice: 1.0850,
    isActive: true
  },
  {
    id: 2,
    ticker: 'GBPUSD',
    name: 'British Pound / US Dollar',
    shortName: 'GBP/USD',
    exchange: 'Forex',
    market: 'forex',
    pricePrecision: 5,
    volumePrecision: 2,
    priceCurrency: 'USD',
    type: 'forex',
    basePrice: 1.2650,
    isActive: true
  },
  {
    id: 3,
    ticker: 'USDJPY',
    name: 'US Dollar / Japanese Yen',
    shortName: 'USD/JPY',
    exchange: 'Forex',
    market: 'forex',
    pricePrecision: 3,
    volumePrecision: 2,
    priceCurrency: 'JPY',
    type: 'forex',
    basePrice: 149.50,
    isActive: true
  },
  {
    id: 4,
    ticker: 'USDCHF',
    name: 'US Dollar / Swiss Franc',
    shortName: 'USD/CHF',
    exchange: 'Forex',
    market: 'forex',
    pricePrecision: 5,
    volumePrecision: 2,
    priceCurrency: 'CHF',
    type: 'forex',
    basePrice: 0.8950,
    isActive: true
  },
  {
    id: 5,
    ticker: 'AUDUSD',
    name: 'Australian Dollar / US Dollar',
    shortName: 'AUD/USD',
    exchange: 'Forex',
    market: 'forex',
    pricePrecision: 5,
    volumePrecision: 2,
    priceCurrency: 'USD',
    type: 'forex',
    basePrice: 0.6580,
    isActive: true
  },
  {
    id: 6,
    ticker: 'USDCAD',
    name: 'US Dollar / Canadian Dollar',
    shortName: 'USD/CAD',
    exchange: 'Forex',
    market: 'forex',
    pricePrecision: 5,
    volumePrecision: 2,
    priceCurrency: 'CAD',
    type: 'forex',
    basePrice: 1.3750,
    isActive: true
  },
  {
    id: 7,
    ticker: 'NZDUSD',
    name: 'New Zealand Dollar / US Dollar',
    shortName: 'NZD/USD',
    exchange: 'Forex',
    market: 'forex',
    pricePrecision: 5,
    volumePrecision: 2,
    priceCurrency: 'USD',
    type: 'forex',
    basePrice: 0.5950,
    isActive: true
  },
  
  // Cross Currency Pairs
  {
    id: 8,
    ticker: 'EURGBP',
    name: 'Euro / British Pound',
    shortName: 'EUR/GBP',
    exchange: 'Forex',
    market: 'forex',
    pricePrecision: 5,
    volumePrecision: 2,
    priceCurrency: 'GBP',
    type: 'forex',
    basePrice: 0.8580,
    isActive: true
  },
  {
    id: 9,
    ticker: 'EURJPY',
    name: 'Euro / Japanese Yen',
    shortName: 'EUR/JPY',
    exchange: 'Forex',
    market: 'forex',
    pricePrecision: 3,
    volumePrecision: 2,
    priceCurrency: 'JPY',
    type: 'forex',
    basePrice: 162.30,
    isActive: true
  },
  {
    id: 10,
    ticker: 'GBPJPY',
    name: 'British Pound / Japanese Yen',
    shortName: 'GBP/JPY',
    exchange: 'Forex',
    market: 'forex',
    pricePrecision: 3,
    volumePrecision: 2,
    priceCurrency: 'JPY',
    type: 'forex',
    basePrice: 189.20,
    isActive: true
  },
  
  // Exotic Pairs
  {
    id: 11,
    ticker: 'USDTRY',
    name: 'US Dollar / Turkish Lira',
    shortName: 'USD/TRY',
    exchange: 'Forex',
    market: 'forex',
    pricePrecision: 4,
    volumePrecision: 2,
    priceCurrency: 'TRY',
    type: 'forex',
    basePrice: 28.50,
    isActive: true
  },
  {
    id: 12,
    ticker: 'USDRUB',
    name: 'US Dollar / Russian Ruble',
    shortName: 'USD/RUB',
    exchange: 'Forex',
    market: 'forex',
    pricePrecision: 4,
    volumePrecision: 2,
    priceCurrency: 'RUB',
    type: 'forex',
    basePrice: 95.20,
    isActive: true
  },
  {
    id: 13,
    ticker: 'USDZAR',
    name: 'US Dollar / South African Rand',
    shortName: 'USD/ZAR',
    exchange: 'Forex',
    market: 'forex',
    pricePrecision: 4,
    volumePrecision: 2,
    priceCurrency: 'ZAR',
    type: 'forex',
    basePrice: 18.75,
    isActive: true
  },
  
  // Cryptocurrencies
  {
    id: 14,
    ticker: 'BTCUSD',
    name: 'Bitcoin / US Dollar',
    shortName: 'BTC/USD',
    exchange: 'Crypto',
    market: 'crypto',
    pricePrecision: 2,
    volumePrecision: 8,
    priceCurrency: 'USD',
    type: 'crypto',
    basePrice: 42500,
    isActive: true
  },
  {
    id: 15,
    ticker: 'ETHUSD',
    name: 'Ethereum / US Dollar',
    shortName: 'ETH/USD',
    exchange: 'Crypto',
    market: 'crypto',
    pricePrecision: 2,
    volumePrecision: 6,
    priceCurrency: 'USD',
    type: 'crypto',
    basePrice: 2650,
    isActive: true
  },
  {
    id: 16,
    ticker: 'XRPUSD',
    name: 'Ripple / US Dollar',
    shortName: 'XRP/USD',
    exchange: 'Crypto',
    market: 'crypto',
    pricePrecision: 4,
    volumePrecision: 2,
    priceCurrency: 'USD',
    type: 'crypto',
    basePrice: 0.6250,
    isActive: true
  },
  {
    id: 17,
    ticker: 'ADAUSD',
    name: 'Cardano / US Dollar',
    shortName: 'ADA/USD',
    exchange: 'Crypto',
    market: 'crypto',
    pricePrecision: 4,
    volumePrecision: 2,
    priceCurrency: 'USD',
    type: 'crypto',
    basePrice: 0.4850,
    isActive: true
  },
  
  // Commodities
  {
    id: 18,
    ticker: 'XAUUSD',
    name: 'Gold / US Dollar',
    shortName: 'Gold',
    exchange: 'Commodities',
    market: 'commodities',
    pricePrecision: 2,
    volumePrecision: 2,
    priceCurrency: 'USD',
    type: 'commodity',
    basePrice: 2050,
    isActive: true
  },
  {
    id: 19,
    ticker: 'XAGUSD',
    name: 'Silver / US Dollar',
    shortName: 'Silver',
    exchange: 'Commodities',
    market: 'commodities',
    pricePrecision: 3,
    volumePrecision: 2,
    priceCurrency: 'USD',
    type: 'commodity',
    basePrice: 24.50,
    isActive: true
  },
  {
    id: 20,
    ticker: 'USOIL',
    name: 'Crude Oil WTI',
    shortName: 'Oil WTI',
    exchange: 'Commodities',
    market: 'commodities',
    pricePrecision: 2,
    volumePrecision: 2,
    priceCurrency: 'USD',
    type: 'commodity',
    basePrice: 78.50,
    isActive: true
  },
  {
    id: 21,
    ticker: 'UKOIL',
    name: 'Crude Oil Brent',
    shortName: 'Oil Brent',
    exchange: 'Commodities',
    market: 'commodities',
    pricePrecision: 2,
    volumePrecision: 2,
    priceCurrency: 'USD',
    type: 'commodity',
    basePrice: 82.30,
    isActive: true
  },
  
  // Stock Indices
  {
    id: 22,
    ticker: 'SPX500',
    name: 'S&P 500 Index',
    shortName: 'S&P 500',
    exchange: 'Indices',
    market: 'indices',
    pricePrecision: 1,
    volumePrecision: 0,
    priceCurrency: 'USD',
    type: 'index',
    basePrice: 4750,
    isActive: true
  },
  {
    id: 23,
    ticker: 'NAS100',
    name: 'NASDAQ 100 Index',
    shortName: 'NASDAQ',
    exchange: 'Indices',
    market: 'indices',
    pricePrecision: 1,
    volumePrecision: 0,
    priceCurrency: 'USD',
    type: 'index',
    basePrice: 16500,
    isActive: true
  },
  {
    id: 24,
    ticker: 'GER40',
    name: 'DAX 40 Index',
    shortName: 'DAX',
    exchange: 'Indices',
    market: 'indices',
    pricePrecision: 1,
    volumePrecision: 0,
    priceCurrency: 'EUR',
    type: 'index',
    basePrice: 16800,
    isActive: true
  },
  
  // Popular Stocks
  {
    id: 25,
    ticker: 'AAPL',
    name: 'Apple Inc.',
    shortName: 'Apple',
    exchange: 'NASDAQ',
    market: 'stocks',
    pricePrecision: 2,
    volumePrecision: 0,
    priceCurrency: 'USD',
    type: 'stock',
    basePrice: 185,
    isActive: true
  },
  {
    id: 26,
    ticker: 'GOOGL',
    name: 'Alphabet Inc.',
    shortName: 'Google',
    exchange: 'NASDAQ',
    market: 'stocks',
    pricePrecision: 2,
    volumePrecision: 0,
    priceCurrency: 'USD',
    type: 'stock',
    basePrice: 140,
    isActive: true
  },
  {
    id: 27,
    ticker: 'TSLA',
    name: 'Tesla Inc.',
    shortName: 'Tesla',
    exchange: 'NASDAQ',
    market: 'stocks',
    pricePrecision: 2,
    volumePrecision: 0,
    priceCurrency: 'USD',
    type: 'stock',
    basePrice: 240,
    isActive: true
  },
  {
    id: 28,
    ticker: 'MSFT',
    name: 'Microsoft Corporation',
    shortName: 'Microsoft',
    exchange: 'NASDAQ',
    market: 'stocks',
    pricePrecision: 2,
    volumePrecision: 0,
    priceCurrency: 'USD',
    type: 'stock',
    basePrice: 380,
    isActive: true
  }
]

// Функція для генерації реалістичних цін
function generateRealtimePrice(symbol: any) {
  const volatility = getVolatility(symbol)
  const change = (Math.random() - 0.5) * volatility
  const currentPrice = symbol.basePrice + change
  const changePercent = (change / symbol.basePrice) * 100
  
  return {
    ...symbol,
    currentPrice: parseFloat(currentPrice.toFixed(symbol.pricePrecision)),
    change: parseFloat(changePercent.toFixed(2)),
    volume: getRealisticVolume(symbol),
    timestamp: Date.now()
  }
}

function getVolatility(symbol: any): number {
  const basePrice = symbol.basePrice
  
  switch (symbol.type) {
    case 'forex':
      if (symbol.ticker.includes('JPY')) return basePrice * 0.005 // 0.5%
      if (symbol.ticker.includes('TRY') || symbol.ticker.includes('RUB') || symbol.ticker.includes('ZAR')) {
        return basePrice * 0.02 // 2% для экзотических пар
      }
      return basePrice * 0.003 // 0.3% для мажорных пар
    
    case 'crypto':
      return basePrice * 0.03 // 3% для криптовалют
    
    case 'commodity':
      return basePrice * 0.015 // 1.5% для сырья
    
    case 'index':
      return basePrice * 0.008 // 0.8% для индексов
    
    case 'stock':
      return basePrice * 0.02 // 2% для акций
    
    default:
      return basePrice * 0.01
  }
}

function getRealisticVolume(symbol: any): number {
  switch (symbol.type) {
    case 'forex':
      return Math.floor(Math.random() * 5000000) + 1000000 // 1M-6M
    
    case 'crypto':
      return Math.floor(Math.random() * 500000) + 100000 // 100K-600K
    
    case 'commodity':
      return Math.floor(Math.random() * 200000) + 50000 // 50K-250K
    
    case 'index':
      return Math.floor(Math.random() * 1000000) + 500000 // 500K-1.5M
    
    case 'stock':
      return Math.floor(Math.random() * 2000000) + 500000 // 500K-2.5M
    
    default:
      return Math.floor(Math.random() * 1000000) + 100000
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const type = searchParams.get('type')
    const limit = searchParams.get('limit')
    
    let filteredSymbols = TRADING_SYMBOLS.filter(symbol => symbol.isActive)
    
    // Фільтр по пошуку
    if (search) {
      const searchLower = search.toLowerCase()
      filteredSymbols = filteredSymbols.filter(symbol =>
        symbol.ticker.toLowerCase().includes(searchLower) ||
        symbol.name.toLowerCase().includes(searchLower) ||
        symbol.shortName.toLowerCase().includes(searchLower)
      )
    }
    
    // Фільтр по типу
    if (type) {
      filteredSymbols = filteredSymbols.filter(symbol => symbol.type === type)
    }
    
    // Ліміт результатів
    if (limit) {
      filteredSymbols = filteredSymbols.slice(0, parseInt(limit))
    }
    
    // Генеруємо реальні ціни
    const symbolsWithPrices = filteredSymbols.map(generateRealtimePrice)
    
    return NextResponse.json({
      success: true,
      data: symbolsWithPrices,
      total: symbolsWithPrices.length,
      timestamp: Date.now()
    })
  } catch (error) {
    console.error('Error in /api/symbols:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
