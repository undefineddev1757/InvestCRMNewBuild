// Простой скрипт для обнуления комиссий в позициях
// Можно выполнить через: node -e "$(cat scripts/clear-fees-simple.js)"

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    console.log('Обнуление комиссий в открытых позициях...')
    
    const result = await prisma.position.updateMany({
      where: {
        status: 'OPEN',
        fee: { not: '0' }
      },
      data: {
        fee: '0'
      }
    })
    
    console.log(`Обновлено открытых позиций: ${result.count}`)
    
    const closedResult = await prisma.position.updateMany({
      where: {
        status: 'CLOSED',
        fee: { not: '0' },
        closedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      },
      data: {
        fee: '0'
      }
    })
    
    console.log(`Обновлено закрытых позиций (за 24ч): ${closedResult.count}`)
    console.log('Готово!')
  } catch (error) {
    console.error('Ошибка:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()

