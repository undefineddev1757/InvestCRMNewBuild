const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function createAdmin() {
  try {
    console.log('🔐 Створюємо адміністратора...')
    
    // Хешуємо пароль
    const hashedPassword = await bcrypt.hash('admin123', 12)
    
    // Створюємо адміністратора
    const admin = await prisma.user.create({
      data: {
        name: 'Admin User',
        email: 'admin@investcrm.com',
        password: hashedPassword,
        phone: '+380501234567',
        role: 'ADMIN',
        emailVerified: new Date(), // Підтверджуємо email одразу
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })
    
    console.log('✅ Адміністратор створений успішно!')
    console.log('📧 Email:', admin.email)
    console.log('🔑 Password: admin123')
    console.log('📱 Phone:', admin.phone)
    console.log('🆔 ID:', admin.id)
    
  } catch (error) {
    if (error.code === 'P2002') {
      console.log('⚠️  Користувач з таким email вже існує')
      
      // Оновлюємо існуючого користувача
      const hashedPassword = await bcrypt.hash('admin123', 12)
      const updatedAdmin = await prisma.user.update({
        where: { email: 'admin@investcrm.com' },
        data: {
          password: hashedPassword,
          role: 'ADMIN',
          emailVerified: new Date(),
          updatedAt: new Date()
        }
      })
      
      console.log('✅ Адміністратор оновлений!')
      console.log('📧 Email:', updatedAdmin.email)
      console.log('🔑 Password: admin123')
    } else {
      console.error('❌ Помилка при створенні адміністратора:', error)
    }
  } finally {
    await prisma.$disconnect()
  }
}

createAdmin()
