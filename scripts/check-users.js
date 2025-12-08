const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function checkUsers() {
  try {
    console.log('🔍 Перевіряємо користувачів в базі даних...')
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        emailVerified: true,
        createdAt: true,
        password: true
      }
    })
    
    console.log(`\n📊 Знайдено ${users.length} користувачів:\n`)
    
    for (const user of users) {
      console.log(`👤 ${user.name}`)
      console.log(`   📧 Email: ${user.email}`)
      console.log(`   📱 Phone: ${user.phone}`)
      console.log(`   ✅ Email Verified: ${user.emailVerified ? 'Yes' : 'No'}`)
      console.log(`   🔑 Has Password: ${user.password ? 'Yes' : 'No'}`)
      console.log(`   📅 Created: ${user.createdAt}`)
      
      // Тестуємо пароль
      if (user.password) {
        const testPasswords = ['client123', 'elena123', 'mikhail123', 'anna123']
        for (const testPassword of testPasswords) {
          const isValid = await bcrypt.compare(testPassword, user.password)
          if (isValid) {
            console.log(`   🔐 Valid Password: ${testPassword}`)
            break
          }
        }
      }
      console.log('')
    }
    
    // Тестуємо конкретного користувача
    console.log('🧪 Тестуємо вхід для client@test.com...')
    const testUser = await prisma.user.findUnique({
      where: { email: 'client@test.com' }
    })
    
    if (testUser) {
      const isValidPassword = await bcrypt.compare('client123', testUser.password)
      console.log(`   ✅ Password valid: ${isValidPassword}`)
      console.log(`   ✅ Email verified: ${!!testUser.emailVerified}`)
    } else {
      console.log('   ❌ User not found')
    }
    
  } catch (error) {
    console.error('❌ Помилка:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkUsers()
