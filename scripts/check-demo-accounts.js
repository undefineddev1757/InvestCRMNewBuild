const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const client = await prisma.client.findUnique({
      where: { email: 'maria.sidorova@example.com' },
      include: {
        tradingAccounts: true,
        financialAccounts: true
      }
    });
    
    if (!client) {
      console.log('❌ Клиент не найден');
      return;
    }
    
    console.log('✅ Клиент найден:', client.id, client.name);
    console.log('');
    console.log('📊 Торговые счета:', client.tradingAccounts.length);
    client.tradingAccounts.forEach(acc => {
      console.log('  -', acc.type, acc.id, 'Balance:', acc.balance);
    });
    console.log('');
    console.log('💰 Финансовые счета:', client.financialAccounts.length);
    client.financialAccounts.forEach(acc => {
      console.log('  -', acc.id, 'Balance:', acc.balance);
    });
    
    const demoAccount = client.tradingAccounts.find(acc => acc.type === 'DEMO');
    if (!demoAccount) {
      console.log('');
      console.log('⚠️  ДЕМО-СЧЕТ НЕ НАЙДЕН!');
      console.log('');
      console.log('Создаём демо-счет...');
      
      const newDemo = await prisma.tradingAccount.create({
        data: {
          client: { connect: { id: client.id } },
          type: 'DEMO',
          number: `DEMO-${Date.now()}`,
          balance: '10000.00000000',
          availableBalance: '10000.00000000',
          currency: 'USD'
        }
      });
      
      console.log('✅ Демо-счет создан:', newDemo.id, 'Balance:', newDemo.balance);
    } else {
      console.log('');
      console.log('✅ ДЕМО-СЧЕТ НАЙДЕН');
    }
    
  } catch (e) {
    console.error('Ошибка:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
