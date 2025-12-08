const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

const demoClients = [
  {
    name: 'Олена Коваленко',
    email: 'elena@test.com',
    phone: '+380501234568',
    password: 'elena123'
  },
  {
    name: 'Михайло Шевченко',
    email: 'mikhail@test.com',
    phone: '+380501234569',
    password: 'mikhail123'
  },
  {
    name: 'Анна Іваненко',
    email: 'anna@test.com',
    phone: '+380501234570',
    password: 'anna123'
  }
]

async function createDemoClients() {
  try {
    console.log('👥 Створюємо демо клієнтів...')
    
    for (const clientData of demoClients) {
      try {
        // Хешуємо пароль
        const hashedPassword = await bcrypt.hash(clientData.password, 12)
        
        // Створюємо клієнта
        const client = await prisma.user.create({
          data: {
            name: clientData.name,
            email: clientData.email,
            password: hashedPassword,
            phone: clientData.phone,
            emailVerified: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })
        
        // Создаём финансовый и торговые счета, если их нет
        const finNumber = '456484'
        const liveNumber = '485506'
        const demoNumber = '485507'

        await prisma.financialAccount.upsert({
          where: { number: finNumber },
          update: {},
          create: {
            id: undefined,
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

        console.log(`✅ ${clientData.name} створений! (${clientData.email})`)
        
      } catch (error) {
        if (error.code === 'P2002') {
          console.log(`⚠️  ${clientData.name} вже існує`)
        } else {
          console.error(`❌ Помилка при створенні ${clientData.name}:`, error.message)
        }
      }
    }
    
    console.log('')
    console.log('🎉 Демо клієнти готові!')
    console.log('')
    console.log('📋 Список тестових акаунтів:')
    console.log('   1. client@test.com / client123 (Іван Петренко)')
    console.log('   2. elena@test.com / elena123 (Олена Коваленко)')
    console.log('   3. mikhail@test.com / mikhail123 (Михайло Шевченко)')
    console.log('   4. anna@test.com / anna123 (Анна Іваненко)')
    console.log('')
    console.log('🌐 Вхід: http://localhost:3000/auth/signin')
    
  } catch (error) {
    console.error('❌ Загальна помилка:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createDemoClients()
