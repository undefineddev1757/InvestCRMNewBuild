const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // Получаем email из аргумента командной строки или используем дефолтный
    const email = process.argv[2] || 'maria.sidorova@example.com';
    
    console.log(`\n🔍 Проверка клиента: ${email}`);
    
    const client = await prisma.client.findUnique({
      where: { email },
      include: {
        tradingAccounts: true,
      }
    });
    
    if (!client) {
      console.log('❌ Клиент не найден');
      console.log(`\nИспользование: node scripts/ensure-demo-account.js <email>`);
      return;
    }
    
    console.log(`✅ Клиент найден: ${client.name} (ID: ${client.id})`);
    console.log(`📧 Email: ${client.email}`);
    console.log(`🔐 Активен: ${client.isActive ? 'Да' : 'Нет'}`);
    
    if (!client.isActive) {
      console.log('\n⚠️  ВНИМАНИЕ: Клиент не активен!');
      console.log('Активируем клиента...');
      await prisma.client.update({
        where: { id: client.id },
        data: { isActive: true }
      });
      console.log('✅ Клиент активирован');
    }
    
    console.log(`\n📊 Торговые счета: ${client.tradingAccounts.length}`);
    client.tradingAccounts.forEach(acc => {
      console.log(`  - ${acc.type} (${acc.number}): $${Number(acc.balance).toFixed(2)}`);
    });
    
    // Проверяем наличие демо-счета
    const demoAccount = client.tradingAccounts.find(acc => acc.type === 'DEMO');
    
    if (!demoAccount) {
      console.log('\n⚠️  ДЕМО-СЧЕТ НЕ НАЙДЕН!');
      console.log('Создаём демо-счет...');
      
      const newDemo = await prisma.tradingAccount.create({
        data: {
          client: { connect: { id: client.id } },
          type: 'DEMO',
          number: `DEMO-${Date.now()}`,
          balance: '10000.00000000',
          availableBalance: '10000.00000000',
          margin: '0.00000000',
          profit: '0.00000000',
          currency: 'USD',
          leverage: 100
        }
      });
      
      console.log('✅ Демо-счет создан!');
      console.log(`   ID: ${newDemo.id}`);
      console.log(`   Номер: ${newDemo.number}`);
      console.log(`   Баланс: $${Number(newDemo.balance).toFixed(2)}`);
    } else {
      console.log('\n✅ ДЕМО-СЧЕТ НАЙДЕН');
      console.log(`   ID: ${demoAccount.id}`);
      console.log(`   Номер: ${demoAccount.number}`);
      console.log(`   Баланс: $${Number(demoAccount.balance).toFixed(2)}`);
      console.log(`   Доступно: $${Number(demoAccount.availableBalance).toFixed(2)}`);
      console.log(`   Маржа: $${Number(demoAccount.margin).toFixed(2)}`);
      console.log(`   Прибыль: $${Number(demoAccount.profit).toFixed(2)}`);
    }
    
    console.log('\n✅ Проверка завершена\n');
    
  } catch (e) {
    console.error('❌ Ошибка:', e.message);
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
