const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    console.log('\n🔧 Обновление комиссий для криптовалют...\n')
    
    // Обновляем все криптовалютные символы
    const cryptoSymbols = await prisma.symbol.findMany({
      where: {
        type: 'crypto'
      }
    })
    
    let updated = 0
    for (const symbol of cryptoSymbols) {
      const oldFeeTaker = Number(symbol.feeTaker)
      const oldFeeMaker = Number(symbol.feeMaker)
      
      // Устанавливаем разумные комиссии: 0.06% для taker, 0.04% для maker
      const newFeeTaker = 0.0006 // 0.06%
      const newFeeMaker = 0.0004 // 0.04%
      
      if (oldFeeTaker !== newFeeTaker || oldFeeMaker !== newFeeMaker) {
        await prisma.symbol.update({
          where: { id: symbol.id },
          data: {
            feeTaker: newFeeTaker.toString(),
            feeMaker: newFeeMaker.toString()
          }
        })
        
        console.log(`✅ ${symbol.name}:`)
        console.log(`   Fee Taker: ${(oldFeeTaker * 100).toFixed(4)}% → ${(newFeeTaker * 100).toFixed(4)}%`)
        console.log(`   Fee Maker: ${(oldFeeMaker * 100).toFixed(4)}% → ${(newFeeMaker * 100).toFixed(4)}%`)
        updated++
      }
    }
    
    if (updated === 0) {
      console.log('✅ Все комиссии уже обновлены')
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
      console.log(`   (было: $1.94, стало: $${totalFee.toFixed(2)})`)
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()

