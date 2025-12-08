const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    // Ищем BTC/USD в разных форматах
    const symbols = await prisma.symbol.findMany({
      where: {
        OR: [
          { name: { contains: 'BTC' } },
          { name: { contains: 'BTCUSD' } },
          { ticker: { contains: 'BTC' } }
        ]
      }
    })

    if (symbols.length === 0) {
      console.log('❌ Символы BTC не найдены')
      return
    }

    console.log('\n📊 Комиссии для BTC символов:\n')
    
    for (const symbol of symbols) {
      const feeTaker = Number(symbol.feeTaker)
      const feeMaker = Number(symbol.feeMaker)
      
      console.log(`Символ: ${symbol.name}`)
      console.log(`  Ticker: ${symbol.ticker || 'N/A'}`)
      console.log(`  Fee Taker: ${feeTaker} (${(feeTaker * 100).toFixed(4)}%)`)
      console.log(`  Fee Maker: ${feeMaker} (${(feeMaker * 100).toFixed(4)}%)`)
      
      // Пример расчета для сделки 0.01 BTC по цене 97196
      const examplePrice = 97196
      const exampleQty = 0.01
      const openFee = examplePrice * exampleQty * feeTaker
      const closeFee = examplePrice * exampleQty * feeTaker
      const totalFee = openFee + closeFee
      
      console.log(`  Пример для сделки 0.01 BTC @ $${examplePrice.toLocaleString()}:`)
      console.log(`    Комиссия при открытии: $${openFee.toFixed(2)}`)
      console.log(`    Комиссия при закрытии: $${closeFee.toFixed(2)}`)
      console.log(`    Общая комиссия: $${totalFee.toFixed(2)}`)
      console.log('')
    }
    
    // Также показываем все символы с комиссией > 0.0005 (0.05%)
    console.log('\n⚠️  Символы с комиссией > 0.05%:\n')
    const highFeeSymbols = await prisma.symbol.findMany({
      where: {
        OR: [
          { feeTaker: { gt: '0.0005' } },
          { feeMaker: { gt: '0.0005' } }
        ]
      },
      orderBy: { feeTaker: 'desc' }
    })
    
    if (highFeeSymbols.length === 0) {
      console.log('  Нет символов с высокой комиссией')
    } else {
      for (const symbol of highFeeSymbols) {
        const feeTaker = Number(symbol.feeTaker)
        console.log(`  ${symbol.name}: ${(feeTaker * 100).toFixed(4)}%`)
      }
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()

