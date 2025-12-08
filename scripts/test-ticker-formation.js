// Скрипт для тестирования формирования тикеров
console.log('🧪 Testing ticker formation...')

// Функция для получения правильного символа (копия из кода)
function getSymbolConfig(symbolName, symbolType) {
  const cleanSymbol = symbolName.replace('X:', '').replace('C:', '')
  
  // Используем переданный тип или fallback логику
  let type = symbolType || 'CS' // по умолчанию акция
  
  // Fallback логика если тип не передан
  if (!symbolType) {
    if (cleanSymbol.includes('BTC') || cleanSymbol.includes('ETH') || (cleanSymbol.includes('USD') && cleanSymbol.length <= 8)) {
      type = 'crypto'
    } else if (cleanSymbol.length <= 6 && cleanSymbol.includes('USD')) {
      type = 'currency'
    }
  }
  
  // Определяем параметры на основе типа
  let exchange = 'XNYS'
  let market = 'stocks'
  let ticker = cleanSymbol
  let name = cleanSymbol
  let pricePrecision = 2
  
  if (type === 'crypto') {
    exchange = 'CRYPTO'
    market = 'crypto'
    ticker = `X:${cleanSymbol}`
    name = `${cleanSymbol} USD`
    pricePrecision = 2
  } else if (type === 'currency') {
    exchange = 'FOREX'
    market = 'fx'
    ticker = `C:${cleanSymbol}`
    name = `${cleanSymbol}`
    pricePrecision = 5
  } else {
    // Акции
    exchange = 'XNYS'
    market = 'stocks'
    ticker = cleanSymbol
    name = cleanSymbol
    pricePrecision = 2
  }
  
  return {
    exchange,
    market,
    name,
    shortName: cleanSymbol,
    ticker,
    priceCurrency: 'USD',
    type,
    pricePrecision
  }
}

// Тестируем различные символы
const testSymbols = [
  { name: 'BTCUSD', type: 'crypto' },
  { name: 'SPCE', type: 'CS' },
  { name: 'EURUSD', type: 'currency' },
  { name: 'BTC/USD', type: 'crypto' }, // с слешем
  { name: 'X:BTCUSD', type: 'crypto' }, // с префиксом
]

console.log('\n📊 Testing symbol configurations:')
testSymbols.forEach(({ name, type }) => {
  const config = getSymbolConfig(name, type)
  console.log(`\n${name} (${type}):`)
  console.log(`  Ticker: ${config.ticker}`)
  console.log(`  Name: ${config.name}`)
  console.log(`  Type: ${config.type}`)
  console.log(`  Exchange: ${config.exchange}`)
})

console.log('\n✅ Ticker formation test completed!')
