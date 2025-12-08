import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface ImportSymbol {
  name: string
  group?: string
  ticker: string
  type?: string
  market?: string
}

function mapGroupToType(group?: string): string {
  const groupLower = (group || '').toLowerCase()
  
  if (groupLower.includes('crypto')) return 'crypto'
  if (groupLower.includes('forex') || groupLower.includes('fx')) return 'forex'
  if (groupLower.includes('stock')) return 'stock'
  if (groupLower.includes('commodit')) return 'commodity'
  if (groupLower.includes('index')) return 'index'
  
  return 'stock' // Default
}

function mapGroupToMarket(group?: string): string {
  const groupLower = (group || '').toLowerCase()
  
  if (groupLower.includes('crypto')) return 'crypto'
  if (groupLower.includes('forex') || groupLower.includes('fx')) return 'forex'
  if (groupLower.includes('stock')) return 'stocks'
  if (groupLower.includes('commodit')) return 'commodities'
  if (groupLower.includes('index')) return 'indices'
  
  return 'stocks'
}

function getExchangeFromGroup(group?: string): string {
  const groupLower = (group || '').toLowerCase()
  
  if (groupLower.includes('us stock')) return 'XNYS'
  if (groupLower.includes('eu stock')) return 'XETR'
  if (groupLower.includes('ru stock')) return 'MOEX'
  if (groupLower.includes('as stock')) return 'XHKG'
  if (groupLower.includes('crypto')) return 'CRYPTO'
  if (groupLower.includes('forex')) return 'FOREX'
  
  return 'XNYS' // Default to NYSE
}

function getPricePrecision(ticker: string, type: string): number {
  if (type === 'forex') {
    return ticker.includes('JPY') ? 3 : 5
  }
  if (type === 'crypto') {
    return ticker.includes('BTC') || ticker.includes('ETH') ? 2 : 4
  }
  return 2 // Default for stocks
}

function getVolumePrecision(type: string): number {
  if (type === 'crypto') return 8
  if (type === 'forex') return 2
  return 0 // Default for stocks
}

function getPriceCurrency(ticker: string, type: string): string {
  if (type === 'forex') {
    return ticker.slice(-3) // Last 3 characters (USD, EUR, etc.)
  }
  if (type === 'crypto') {
    return ticker.includes('USD') ? 'USD' : 'EUR'
  }
  return 'USD' // Default
}

export async function POST(req: NextRequest) {
  try {
    const { symbols }: { symbols: ImportSymbol[] } = await req.json()

    if (!Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'Не предоставлены символы для импорта' 
      }, { status: 400 })
    }

    const results = {
      success: 0,
      errors: [] as string[],
      warnings: [] as string[]
    }

    for (const symbol of symbols) {
      try {
        const { name, group, ticker } = symbol
        
        if (!name || !ticker) {
          results.errors.push(`Неполные данные: ${JSON.stringify(symbol)}`)
          continue
        }

        // Проверяем, существует ли уже такой символ
        const existing = await prisma.symbol.findFirst({
          where: { OR: [{ name: name }, { ticker: ticker }] }
        })

        if (existing) {
          results.warnings.push(`Символ ${ticker} уже существует`)
          continue
        }

        const type = (symbol.type || (group ? mapGroupToType(group) : 'stock')).toLowerCase()
        const market = symbol.market || (group ? mapGroupToMarket(group) : (type === 'crypto' ? 'crypto' : type === 'forex' ? 'forex' : 'stocks'))
        const exchange = getExchangeFromGroup(group || (type === 'crypto' ? 'crypto' : type === 'forex' ? 'forex' : 'stock'))
        const pricePrecision = getPricePrecision(ticker, type)
        const volumePrecision = getVolumePrecision(type)
        const priceCurrency = getPriceCurrency(ticker, type)

        // Создаем символ в базе данных (используем только существующие поля)
        await prisma.symbol.create({
          data: {
            name,
            type,
            ticker,
            market,
            minQty: '0.01',
            qtyStep: '0.01',
            priceStep: type === 'forex' ? '0.00001' : '0.01',
            allowedLeverages: type === 'crypto' ? [1, 2, 3, 5, 10] : [1, 2, 3, 5],
            mmr: '0.1',
            feeTaker: '0',
            feeMaker: '0',
            markPriceSource: 'POLYGON'
          }
        })

        results.success++

      } catch (error) {
        console.error(`Error importing symbol ${symbol.ticker}:`, error)
        results.errors.push(`Ошибка импорта ${symbol.ticker}: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`)
      }
    }

    return NextResponse.json(results)

  } catch (error) {
    console.error('Mass import error:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'Внутренняя ошибка сервера' 
    }, { status: 500 })
  }
}
