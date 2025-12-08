// Скрипт для принудительного обновления графика
console.log('🔄 Force updating chart...')

// Функция для принудительного обновления графика
function forceChartUpdate() {
  console.log('🔄 Force updating chart...')
  
  if (typeof window !== 'undefined') {
    // Принудительно переключаемся на SPCE
    window.__currentChartSymbol = 'SPCE'
    
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
          ticker: 'SPCE',
          name: 'SPCE',
          shortName: 'SPCE',
          type: 'CS',
          exchange: 'XNYS',
          market: 'stocks',
          priceCurrency: 'USD',
          pricePrecision: 2
        })
        console.log('✅ Chart updated to SPCE')
      } catch (error) {
        console.error('❌ Error updating chart:', error)
      }
    } else {
      console.log('❌ Chart not found')
    }
  }
}

// Запускаем принудительное обновление
forceChartUpdate()

console.log('✅ Force update completed!')
