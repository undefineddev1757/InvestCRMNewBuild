import { NextResponse } from 'next/server'
import { getCuratedSymbols } from '@/lib/curated-symbols'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = (searchParams.get('search') || '').toLowerCase()
    const type = searchParams.get('type') || ''
    const limit = parseInt(searchParams.get('limit') || '500')

    // Сначала пробуем получить символы из базы данных
    try {
      console.log('Fetching symbols from database...')
      const where: any = {}
      
      if (search) {
        where.name = { contains: search, mode: 'insensitive' }
      }

      const dbSymbols = await prisma.symbol.findMany({
        where,
        take: limit,
        orderBy: { name: 'asc' }
      })
      
      console.log('Database symbols found:', dbSymbols.length)

      // Преобразуем символы из БД в формат CuratedSymbol
      const curatedSymbols = dbSymbols.map(symbol => {
        const rawName = symbol.name // ожидаем формат вида BTC/USD
        const type = (symbol.type || '').toLowerCase()
        const exchange = type === 'crypto' ? 'CRYPTO' : type === 'forex' || type === 'currency' ? 'FOREX' : 'XNYS'
        const market = type === 'crypto' ? 'crypto' : type === 'forex' || type === 'currency' ? 'fx' : 'stocks'
        // Тикер отдаем из поля ticker если он есть; иначе формируем
        let ticker = symbol.ticker || ''
        if (!ticker) {
          if (type === 'crypto') {
            const parts = rawName.includes('/') ? rawName.split('/') : [rawName.slice(0, rawName.length - 3), rawName.slice(-3)]
            const base = (parts[0] || '').toUpperCase()
            const quote = 'USD' // Всегда USD для крипты в Polygon тикере
            ticker = `X:${base}-${quote}`
          } else if (type === 'forex' || type === 'currency') {
            ticker = `C:${rawName.replace('/', '')}`
          } else {
            ticker = rawName.replace('/', '')
          }
        }
        return {
          ticker,
          name: rawName,
          shortName: rawName,
          exchange,
          market,
          pricePrecision: type === 'forex' || type === 'currency' ? 5 : 2,
          volumePrecision: type === 'crypto' ? 8 : 0,
          priceCurrency: 'USD',
          type: type || 'CS',
          active: true
        }
      })

      return NextResponse.json({ 
        success: true, 
        data: curatedSymbols, 
        total: curatedSymbols.length,
        source: 'database'
      })

    } catch (dbError) {
      console.error('Database error, falling back to static symbols:', dbError)
      
      // Fallback на статические символы
      let list = getCuratedSymbols()
      if (type) {
        list = list.filter(s => String(s.type) === type || String(s.market) === type)
      }
      if (search) {
        list = list.filter(s =>
          s.ticker.toLowerCase().includes(search) ||
          (s.name || '').toLowerCase().includes(search) ||
          (s.shortName || '').toLowerCase().includes(search)
        )
      }
      return NextResponse.json({ 
        success: true, 
        data: list.slice(0, limit), 
        total: list.length,
        source: 'static'
      })
    }
  } catch (e) {
    return NextResponse.json({ success: false, error: 'internal' }, { status: 500 })
  }
}




