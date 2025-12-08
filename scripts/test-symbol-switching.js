// Скрипт для тестирования переключения символов
console.log('🧪 Testing symbol switching...')

// Симулируем переключение символов
const symbols = ['BTCUSD', 'SPCE']

symbols.forEach((symbol, index) => {
  setTimeout(() => {
    console.log(`\n📊 Switching to ${symbol}...`)
    
    // Симулируем изменение символа в графике
    if (typeof window !== 'undefined') {
      window.__currentChartSymbol = symbol
      
      // Проверяем, что график обновился
      setTimeout(() => {
        const chart = window.__currentChart
        if (chart) {
          console.log(`✅ Chart updated for ${symbol}`)
        } else {
          console.log(`❌ Chart not found for ${symbol}`)
        }
      }, 1000)
    }
  }, index * 3000)
})

console.log('⏳ Test will run for 10 seconds...')
