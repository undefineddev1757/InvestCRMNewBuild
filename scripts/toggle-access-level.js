const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const email = process.argv[2] || 'maria.sidorova@example.com';
    const targetLevel = process.argv[3]?.toUpperCase(); // BASE или FULL
    
    const client = await prisma.client.findUnique({
      where: { email },
      select: { name: true, email: true, accessLevel: true }
    });
    
    if (!client) {
      console.log('❌ Клиент не найден');
      return;
    }
    
    console.log('\n📊 Текущее состояние:');
    console.log('   Клиент:', client.name);
    console.log('   Email:', client.email);
    console.log('   Уровень:', client.accessLevel);
    console.log('');
    
    let newLevel;
    if (targetLevel === 'BASE' || targetLevel === 'FULL') {
      newLevel = targetLevel;
    } else {
      // Переключение (toggle)
      newLevel = client.accessLevel === 'BASE' ? 'FULL' : 'BASE';
    }
    
    if (newLevel === client.accessLevel) {
      console.log('ℹ️  Уровень уже установлен:', newLevel);
      return;
    }
    
    const updated = await prisma.client.update({
      where: { email },
      data: { accessLevel: newLevel }
    });
    
    console.log('✅ Уровень доступа изменён!');
    console.log('   Было:', client.accessLevel);
    console.log('   Стало:', updated.accessLevel);
    console.log('');
    
    if (newLevel === 'BASE') {
      console.log('📊 Доступное плечо: 1x, 5x');
      console.log('❌ Заблокировано: 10x, 20x');
    } else {
      console.log('📊 Доступное плечо: 1x, 5x, 10x, 20x и выше');
    }
    console.log('');
    console.log('🔄 Обновите страницу торговой панели чтобы увидеть изменения!');
    console.log('');
    
  } catch (e) {
    console.error('Ошибка:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
