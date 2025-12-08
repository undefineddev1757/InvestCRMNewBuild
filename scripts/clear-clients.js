const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('🗑️  Удаляю всех клиентов...')

  const deleted = await prisma.client.deleteMany({})
  
  console.log(`✅ Удалено ${deleted.count} клиентов`)
}

main()
  .catch((e) => {
    console.error('❌ Ошибка:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
