const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Создаём тестовых клиентов...')

  const clients = [
    {
      name: 'Иван Петров',
      email: 'ivan.petrov@example.com',
      phone: '+79001234567',
      password: 'Client123!',
    },
    {
      name: 'Мария Сидорова',
      email: 'maria.sidorova@example.com',
      phone: '+79002345678',
      password: 'Client123!',
    },
    {
      name: 'Алексей Иванов',
      email: 'alexey.ivanov@example.com',
      phone: '+79003456789',
      password: 'Client123!',
    },
    {
      name: 'Елена Смирнова',
      email: 'elena.smirnova@example.com',
      phone: '+79004567890',
      password: 'Client123!',
    },
    {
      name: 'Дмитрий Козлов',
      email: 'dmitry.kozlov@example.com',
      phone: '+79005678901',
      password: 'Client123!',
    },
  ]

  for (const client of clients) {
    const hashedPassword = await bcrypt.hash(client.password, 10)
    
    try {
      const created = await prisma.client.upsert({
        where: { email: client.email },
        update: {
          name: client.name,
          phone: client.phone,
          password: hashedPassword,
          emailVerified: new Date(),
        },
        create: {
          name: client.name,
          email: client.email,
          phone: client.phone,
          password: hashedPassword,
          emailVerified: new Date(),
        },
      })
      
      console.log(`✅ ${client.name} (${client.email})`)
    } catch (error) {
      console.error(`❌ Ошибка при создании ${client.email}:`, error.message)
    }
  }

  console.log('\n🎉 Готово! Создано 5 клиентов.')
  console.log('📧 Email/Пароль для всех: Client123!')
}

main()
  .catch((e) => {
    console.error('❌ Ошибка:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
