const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function clearTestData() {
  try {
    console.log('🧹 Очищаємо тестові дані...')
    
    // Видаляємо тестових користувачів
    const testEmails = [
      'client@test.com',
      'elena@test.com', 
      'mikhail@test.com',
      'anna@test.com'
    ]
    
    for (const email of testEmails) {
      try {
        await prisma.user.delete({
          where: { email }
        })
        console.log(`✅ Видалено: ${email}`)
      } catch (error) {
        if (error.code === 'P2025') {
          console.log(`⚠️  ${email} не знайдено`)
        } else {
          console.error(`❌ Помилка при видаленні ${email}:`, error.message)
        }
      }
    }
    
    console.log('')
    console.log('🎉 Тестові дані очищені!')
    
  } catch (error) {
    console.error('❌ Помилка при очищенні:', error)
  } finally {
    await prisma.$disconnect()
  }
}

clearTestData()
