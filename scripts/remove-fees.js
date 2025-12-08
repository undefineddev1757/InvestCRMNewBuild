const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    console.log('\n🔧 Удаление комиссий для всех символов...\n')
    
    // Обновляем все символы
    const allSymbols = await prisma.symbol.findMany()
    
    let updated = 0
    for (const symbol of allSymbols) {
      const oldFeeTaker = Number(symbol.feeTaker)
      const oldFeeMaker = Number(symbol.feeMaker)
      
      // Устанавливаем комиссии в 0
      const newFeeTaker = 0
      const newFeeMaker = 0
      
      if (oldFeeTaker !== 0 || oldFeeMaker !== 0) {
        await prisma.symbol.update({
          where: { id: symbol.id },
          data: {
            feeTaker: '0',
            feeMaker: '0'
          }
        })
        
        console.log(`✅ ${symbol.name}:`)
        console.log(`   Fee Taker: ${(oldFeeTaker * 100).toFixed(4)}% → 0%`)
        console.log(`   Fee Maker: ${(oldFeeMaker * 100).toFixed(4)}% → 0%`)
        updated++
      }
    }
    
    if (updated === 0) {
      console.log('✅ Все комиссии уже удалены')
    } else {
      console.log(`\n✅ Обновлено символов: ${updated}`)
    }
    
    // Показываем пример расчета для BTC/USD
    const btc = await prisma.symbol.findFirst({
      where: {
        OR: [
          { name: 'BTC/USD' },
          { name: 'BTCUSD' }
        ]
      }
    })
    
    if (btc) {
      const feeTaker = Number(btc.feeTaker)
      const examplePrice = 97196
      const exampleQty = 0.01
      const openFee = examplePrice * exampleQty * feeTaker
      const closeFee = examplePrice * exampleQty * feeTaker
      const totalFee = openFee + closeFee
      
      console.log(`\n📊 Пример для BTC/USD (0.01 BTC @ $${examplePrice.toLocaleString()}):`)
      console.log(`   Комиссия при открытии: $${openFee.toFixed(2)}`)
      console.log(`   Комиссия при закрытии: $${closeFee.toFixed(2)}`)
      console.log(`   Общая комиссия: $${totalFee.toFixed(2)}`)
      console.log(`   ✅ Теперь комиссии нет!`)
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()

