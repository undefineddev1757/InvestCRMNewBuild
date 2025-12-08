const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    console.log('\n🔧 Обнуление комиссий в открытых позициях...\n')
    
    // Обнуляем комиссии во всех открытых позициях
    const result = await prisma.position.updateMany({
      where: {
        status: 'OPEN',
        fee: { not: '0' }
      },
      data: {
        fee: '0'
      }
    })
    
    console.log(`✅ Обновлено открытых позиций: ${result.count}`)
    
    // Также обнуляем комиссии в закрытых позициях, которые были закрыты недавно
    const closedResult = await prisma.position.updateMany({
      where: {
        status: 'CLOSED',
        fee: { not: '0' },
        closedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // За последние 24 часа
        }
      },
      data: {
        fee: '0'
      }
    })
    
    console.log(`✅ Обновлено закрытых позиций (за последние 24 часа): ${closedResult.count}`)
    
    // Показываем статистику
    const openWithFees = await prisma.position.count({
      where: {
        status: 'OPEN',
        fee: { not: '0' }
      }
    })
    
    console.log(`\n📊 Осталось открытых позиций с комиссией: ${openWithFees}`)
    
  } catch (error) {
    console.error('❌ Ошибка:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()

