const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// Функция для определения правильного тикера для Polygon API
function getPolygonTicker(symbol) {
  const { name, type } = symbol
  
  // Для криптовалют: добавляем префикс X:
  if (type === 'crypto') {
    return `X:${name}`
  }
  
  // Для валют: добавляем префикс C:
  if (type === 'currency') {
    return `C:${name}`
  }
  
  // Для акций: без префикса
  if (type === 'CS') {
    return name
  }
  
  // По умолчанию: без префикса
  return name
}

// Функция для проверки доступности тикера в Polygon
async function checkPolygonTicker(ticker) {
  const apiKey = process.env.POLYGON_API_KEY || process.env.NEXT_PUBLIC_POLYGON_API_KEY
  
  if (!apiKey) {
    console.log(`❌ ${ticker}: No API key found`)
    return false
  }
  
  try {
    const url = `https://api.polygon.io/v2/aggs/ticker/${ticker}/prev?adjusted=true&apikey=${apiKey}`
    const response = await fetch(url)
    
    if (response.ok) {
      const data = await response.json()
      if (data.results && data.results.length > 0) {
        const price = data.results[0].c
        console.log(`✅ ${ticker}: $${price}`)
        return true
      }
    }
    
    console.log(`❌ ${ticker}: Not found or no data`)
    return false
  } catch (error) {
    console.log(`❌ ${ticker}: Error - ${error.message}`)
    return false
  }
}

async function checkAllSymbols() {
  try {
    console.log('🔍 Checking symbols in database...\n')
    
    const symbols = await prisma.symbol.findMany({
      orderBy: { name: 'asc' }
    })
    
    if (symbols.length === 0) {
      console.log('No symbols found in database!')
      return
    }
    
    console.log(`Found ${symbols.length} symbols:\n`)
    
    for (const symbol of symbols) {
      const polygonTicker = getPolygonTicker(symbol)
      console.log(`📊 ${symbol.name} (${symbol.type}) → ${polygonTicker}`)
      
      // Проверяем доступность в Polygon (только если есть API ключ)
      if (process.env.POLYGON_API_KEY || process.env.NEXT_PUBLIC_POLYGON_API_KEY) {
        await checkPolygonTicker(polygonTicker)
      } else {
        console.log(`   (API key not configured - skipping check)`)
      }
      
      console.log('')
    }
    
    console.log('\n📋 Summary:')
    console.log('- Crypto symbols: X:TICKER')
    console.log('- Forex symbols: C:TICKER') 
    console.log('- Stock symbols: TICKER (no prefix)')
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkAllSymbols()
