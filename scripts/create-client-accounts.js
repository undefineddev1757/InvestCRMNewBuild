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
    
    // Создаем/проверяем демо-счет
    let demoAccount = client.tradingAccounts.find(acc => acc.type === 'DEMO');
    if (!demoAccount) {
      console.log('Создаём DEMO торговый счет...');
      demoAccount = await prisma.tradingAccount.create({
        data: {
          client: { connect: { id: client.id } },
          type: 'DEMO',
          number: `DEMO-${Date.now()}`,
          balance: '10000.00000000',
          availableBalance: '10000.00000000',
          currency: 'USD'
        }
      });
      console.log('✅ DEMO торговый счет создан:', demoAccount.id);
    } else {
      console.log('✅ DEMO торговый счет уже существует:', demoAccount.id);
    }
    
    // Создаем/проверяем live счет
    let liveAccount = client.tradingAccounts.find(acc => acc.type === 'LIVE');
    if (!liveAccount) {
      console.log('Создаём LIVE торговый счет...');
      liveAccount = await prisma.tradingAccount.create({
        data: {
          client: { connect: { id: client.id } },
          type: 'LIVE',
          number: `LIVE-${Date.now()}`,
          balance: '0.00000000',
          availableBalance: '0.00000000',
          currency: 'USD'
        }
      });
      console.log('✅ LIVE торговый счет создан:', liveAccount.id);
    } else {
      console.log('✅ LIVE торговый счет уже существует:', liveAccount.id);
    }
    
    // Создаем финансовый счет
    if (client.financialAccounts.length === 0) {
      console.log('Создаём финансовый счет...');
      const financialAccount = await prisma.financialAccount.create({
        data: {
          client: { connect: { id: client.id } },
          number: `FIN-${Date.now()}`,
          balance: '0.00000000',
          currency: 'USD'
        }
      });
      console.log('✅ Финансовый счет создан:', financialAccount.id);
    } else {
      console.log('✅ Финансовый счет уже существует:', client.financialAccounts[0].id);
    }
    
    console.log('');
    console.log('🎉 Все счета клиента настроены!');
    
  } catch (e) {
    console.error('Ошибка:', e.message);
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
