const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function createTestClient() {
  try {
    console.log('👤 Створюємо тестового клієнта...')
    
    // Хешуємо пароль
    const hashedPassword = await bcrypt.hash('client123', 12)
    
    // Створюємо тестового клієнта
    const client = await prisma.user.create({
      data: {
        name: 'Іван Петренко',
        email: 'client@test.com',
        password: hashedPassword,
        phone: '+380501234567',
        emailVerified: new Date(), // Підтверджуємо email одразу
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })
    
    console.log('✅ Тестовий клієнт створений успішно!')
    console.log('📧 Email:', client.email)
    console.log('🔑 Password: client123')
    console.log('📱 Phone:', client.phone)
    console.log('👤 Name:', client.name)
    console.log('🆔 ID:', client.id)
    console.log('')
    console.log('🌐 Тепер ви можете зайти в систему:')
    console.log('   URL: http://localhost:3000/auth/signin')
    console.log('   Email: client@test.com')
    console.log('   Password: client123')
    
    // Счета
    const finNumber = '456484'
    const liveNumber = '485506'
    const demoNumber = '485507'

    await prisma.financialAccount.upsert({
      where: { number: finNumber },
      update: {},
      create: {
        userId: client.id,
        number: finNumber,
        currency: 'USD',
        balance: 1000,
        availableBalance: 1000,
      }
    })

    await prisma.tradingAccount.upsert({
      where: { number: liveNumber },
      update: {},
      create: {
        userId: client.id,
        number: liveNumber,
        type: 'LIVE',
        currency: 'USD',
        balance: 0,
        availableBalance: 0,
        margin: 0,
        profit: 0,
      }
    })

    await prisma.tradingAccount.upsert({
      where: { number: demoNumber },
      update: {},
      create: {
        userId: client.id,
        number: demoNumber,
        type: 'DEMO',
        currency: 'USD',
        balance: 9998.89,
        availableBalance: 9998.89,
        margin: 0,
        profit: 0,
      }
    })

  } catch (error) {
    if (error.code === 'P2002') {
      console.log('⚠️  Користувач з таким email вже існує')
      
      // Оновлюємо існуючого користувача
      const hashedPassword = await bcrypt.hash('client123', 12)
      const updatedClient = await prisma.user.update({
        where: { email: 'client@test.com' },
        data: {
          password: hashedPassword,
          emailVerified: new Date(),
          updatedAt: new Date()
        }
      })
      
      console.log('✅ Тестовий клієнт оновлений!')
      console.log('📧 Email:', updatedClient.email)
      console.log('🔑 Password: client123')
      console.log('👤 Name:', updatedClient.name)
    } else {
      console.error('❌ Помилка при створенні клієнта:', error)
    }
  } finally {
    await prisma.$disconnect()
  }
}

createTestClient()
