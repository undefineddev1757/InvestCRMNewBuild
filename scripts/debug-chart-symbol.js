// Скрипт для отладки символа в графике
console.log('🔍 Debug chart symbol...')

// Проверяем текущее состояние
console.log('Current chart symbol:', window.__currentChartSymbol)
console.log('Current chart instance:', window.__currentChart)

// Принудительно устанавливаем SPCE
console.log('🔄 Setting symbol to SPCE...')
window.__currentChartSymbol = 'SPCE'

// Проверяем, что установилось
console.log('New chart symbol:', window.__currentChartSymbol)

// Если есть график, принудительно обновляем его
if (window.__currentChart) {
  console.log('📊 Found chart, forcing update...')
  
  try {
    // Очищаем кэш datafeed
    const datafeed = window.__currentChart.getDatafeed?.()
    if (datafeed && datafeed.clearCache) {
      datafeed.clearCache()
      console.log('🧹 Cache cleared')
    }
    
    // Обновляем символ
    window.__currentChart.setSymbol({
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

console.log('✅ Debug completed!')
