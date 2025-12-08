const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    // Проверяем позицию jw0npl
    const position = await prisma.position.findUnique({
      where: { id: 'jw0npl' },
      include: {
        symbol: true
      }
    })
    
    if (!position) {
      console.log('❌ Позиция не найдена')
      return
    }
    
    console.log('\n📊 Информация о позиции jw0npl:\n')
    console.log(`ID: ${position.id}`)
    console.log(`Символ: ${position.symbol?.name || 'N/A'}`)
    console.log(`Сторона: ${position.side}`)
    console.log(`Цена входа: ${position.entryPrice}`)
    console.log(`Цена выхода: ${position.exitPrice || 'N/A'}`)
    console.log(`Объем: ${position.qty}`)
    console.log(`Комиссия при открытии (position.fee): ${position.fee}`)
    console.log(`Fee Taker символа: ${position.symbol?.feeTaker || 'N/A'}`)
    console.log(`Fee Maker символа: ${position.symbol?.feeMaker || 'N/A'}`)
    console.log(`PnL: ${position.pnl || 'N/A'}`)
    console.log(`Статус: ${position.status}`)
    
    // Рассчитываем что должно быть
    if (position.exitPrice) {
      const entry = Number(position.entryPrice)
      const exit = Number(position.exitPrice)
      const qty = Number(position.qty)
      const side = position.side
      
      const grossPnL = side === 'LONG' 
        ? (exit - entry) * qty 
        : (entry - exit) * qty
      
      const openFee = Number(position.fee || 0)
      const feeTaker = Number(position.symbol?.feeTaker || 0)
      const closeFee = exit * qty * feeTaker
      const totalFee = openFee + closeFee
      
      const netPnL = grossPnL - totalFee
      
      console.log('\n📈 Расчет PnL:')
      console.log(`  Валовой PnL: $${grossPnL.toFixed(2)}`)
      console.log(`  Комиссия при открытии: $${openFee.toFixed(2)}`)
      console.log(`  Комиссия при закрытии: $${closeFee.toFixed(2)}`)
      console.log(`  Общая комиссия: $${totalFee.toFixed(2)}`)
      console.log(`  Чистый PnL: $${netPnL.toFixed(2)}`)
      console.log(`  Сохраненный PnL: $${position.pnl || 'N/A'}`)
    }
    
    // Проверяем все открытые позиции с ненулевой комиссией
    console.log('\n⚠️  Открытые позиции с ненулевой комиссией:\n')
    const openPositionsWithFees = await prisma.position.findMany({
      where: {
        status: 'OPEN',
        fee: { not: '0' }
      },
      include: {
        symbol: true
      }
    })
    
    if (openPositionsWithFees.length === 0) {
      console.log('  Нет открытых позиций с комиссией')
    } else {
      for (const pos of openPositionsWithFees) {
        console.log(`  ${pos.id}: ${pos.symbol?.name || 'N/A'} - комиссия: ${pos.fee}`)
      }
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()

