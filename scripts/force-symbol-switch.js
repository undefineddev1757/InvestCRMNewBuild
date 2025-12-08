// Скрипт для принудительного переключения символов в браузере
console.log('🔄 Force switching symbols...')

// Функция для принудительного переключения символа
function forceSwitchSymbol(symbol) {
  console.log(`🔄 Force switching to ${symbol}...`)
  
  // Устанавливаем символ в глобальной переменной
  if (typeof window !== 'undefined') {
    window.__currentChartSymbol = symbol
    
    // Принудительно обновляем график
    const chart = window.__currentChart
    if (chart) {
      console.log('📊 Found chart, forcing update...')
      
      // Очищаем кэш datafeed
      const datafeed = chart.getDatafeed?.()
      if (datafeed && datafeed.clearCache) {
        datafeed.clearCache()
        console.log('🧹 Cache cleared')
      }
      
      // Обновляем символ
      try {
        chart.setSymbol({
          ticker: symbol === 'BTCUSD' ? 'X:BTCUSD' : symbol,
          name: symbol,
          shortName: symbol,
          type: symbol === 'BTCUSD' ? 'crypto' : 'CS',
          exchange: symbol === 'BTCUSD' ? 'CRYPTO' : 'XNYS',
          market: symbol === 'BTCUSD' ? 'crypto' : 'stocks',
          priceCurrency: 'USD',
          pricePrecision: 2
        })
        console.log(`✅ Chart updated to ${symbol}`)
      } catch (error) {
        console.error('❌ Error updating chart:', error)
      }
    } else {
      console.log('❌ Chart not found')
    }
  }
}

// Переключаемся между символами
const symbols = ['SPCE', 'BTCUSD']

symbols.forEach((symbol, index) => {
  setTimeout(() => {
    forceSwitchSymbol(symbol)
  }, index * 3000)
})

console.log('⏳ Will switch symbols every 3 seconds...')
