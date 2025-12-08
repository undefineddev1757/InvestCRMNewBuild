#!/usr/bin/env node

/**
 * Скрипт для массового импорта криптовалютных символов
 * Использование: node scripts/import-crypto-symbols.js
 */

const symbols = [
  'EOS/USD',
  'DSH/USD',
  'NEO/USD',
  'TRX/USD',
  'ETC/USD',
  'ZRX/USD',
  'XEM/USD',
  'XVG/USD',
  'OMG/USD',
  'ETH/EUR',
  '1INCH/USD',
  'ADA/USD',
  'ALGO/USD',
  'APE/USD',
  'ATOM/USD',
  'AXS/USD',
  'BNB/USD',
  'CHZ/USD',
  'DOGE/USD',
  'DOT/USD',
  'EGLD/USD',
  'FIL/USD',
  'FTM/USD',
  'HBAR/USD',
  'ICP/USD',
  'IOTA/USD',
  'LUNA/USD',
  'MANA/USD',
  'MATIC/USD',
  'NEAR/USD',
  'QNT/USD',
  'RUNE/USD',
  'SAND/USD',
  'SOL/USD',
  'THETA/USD',
  'UNI/USD',
  'VET/USD',
  'XLM/USD',
  'XTZ/USD',
  'LTC/EUR',
  'XRP/EUR',
  'AVAX/USD',
  'BCH/USD',
  'BTC/EUR',
  'BTC/USD',
  'ETH/USD',
  'LINK/USD',
  'LTC/USD',
  'XMR/USD',
  'XRP/USD',
]

/**
 * Преобразует символ в формат Polygon ticker
 * EOS/USD -> X:EOS-USD
 * BTC/EUR -> X:BTC-EUR
 */
function toPolygonTicker(symbol) {
  const [base, quote] = symbol.split('/')
  return `X:${base}-${quote}`
}

/**
 * Генерирует JSON для массового импорта
 */
function generateImportData() {
  return symbols.map(symbol => ({
    name: symbol, // Имя символа как есть (EOS/USD)
    ticker: toPolygonTicker(symbol), // Polygon ticker (X:EOS-USD)
    type: 'crypto',
    market: 'crypto',
    group: 'crypto'
  }))
}

// Выводим JSON для использования в API
const importData = {
  symbols: generateImportData()
}

console.log(JSON.stringify(importData, null, 2))

// Инструкция
console.error('\n📋 Инструкция:')
console.error('1. Скопируйте JSON выше')
console.error('2. Откройте админ-панель → Пары → Массовый импорт')
console.error('3. Вставьте JSON в поле и нажмите "Импортировать"')
console.error('\nИли используйте curl:')
console.error(`curl -X POST http://localhost:3000/api/admin/symbols/mass-import \\`)
console.error(`  -H "Content-Type: application/json" \\`)
console.error(`  -d '${JSON.stringify(importData)}'`)

