const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const email = process.argv[2] || 'maria.sidorova@example.com';
    
    const client = await prisma.client.findUnique({
      where: { email },
      select: { name: true, email: true, accessLevel: true }
    });
    
    if (!client) {
      console.log('❌ Клиент не найден');
      return;
    }
    
    console.log('\n✅ Клиент:', client.name);
    console.log('📧 Email:', client.email);
    console.log('🎯 Уровень доступа:', client.accessLevel);
    console.log('');
    
    if (client.accessLevel === 'BASE') {
      console.log('📊 Доступное плечо: 1x, 5x');
      console.log('❌ Запрещено: 10x, 20x, 50x, 100x');
    } else {
      console.log('📊 Доступное плечо: 10x, 20x, 50x, 100x и выше');
      console.log('✅ Также доступно: 1x, 5x');
    }
    console.log('');
    
  } catch (e) {
    console.error('Ошибка:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
