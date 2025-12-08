const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testAccountsAPI() {
  try {
    const email = 'maria.sidorova@example.com';
    
    console.log('\n🔍 Тестирование API для получения счетов');
    console.log(`📧 Email: ${email}\n`);
    
    // Проверяем клиента
    const client = await prisma.client.findUnique({
      where: { email },
      include: {
        tradingAccounts: {
          orderBy: { createdAt: 'asc' }
        },
        financialAccounts: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });
    
    if (!client) {
      console.log('❌ Клиент не найден');
      return;
    }
    
    console.log(`✅ Клиент: ${client.name} (ID: ${client.id})\n`);
    
    // Торговые счета
    console.log('📊 ТОРГОВЫЕ СЧЕТА:');
    console.log(`   Всего: ${client.tradingAccounts.length}`);
    
    const live = client.tradingAccounts.find(a => a.type === 'LIVE');
    const demo = client.tradingAccounts.find(a => a.type === 'DEMO');
    
    if (live) {
      console.log(`   ✅ LIVE: ${live.number}`);
      console.log(`      Баланс: $${Number(live.balance).toFixed(2)}`);
      console.log(`      Доступно: $${Number(live.availableBalance).toFixed(2)}`);
      console.log(`      Маржа: $${Number(live.margin).toFixed(2)}`);
      console.log(`      Прибыль: $${Number(live.profit).toFixed(2)}`);
    } else {
      console.log('   ⚠️  LIVE счет не найден');
    }
    
    if (demo) {
      console.log(`   ✅ DEMO: ${demo.number}`);
      console.log(`      Баланс: $${Number(demo.balance).toFixed(2)}`);
      console.log(`      Доступно: $${Number(demo.availableBalance).toFixed(2)}`);
      console.log(`      Маржа: $${Number(demo.margin).toFixed(2)}`);
      console.log(`      Прибыль: $${Number(demo.profit).toFixed(2)}`);
    } else {
      console.log('   ⚠️  DEMO счет не найден');
    }
    
    console.log('');
    
    // Финансовые счета
    console.log('💰 ФИНАНСОВЫЕ СЧЕТА:');
    console.log(`   Всего: ${client.financialAccounts.length}`);
    
    if (client.financialAccounts.length > 0) {
      client.financialAccounts.forEach(acc => {
        console.log(`   ✅ ${acc.number}`);
        console.log(`      Баланс: $${Number(acc.balance).toFixed(2)}`);
        console.log(`      Доступно: $${Number(acc.availableBalance).toFixed(2)}`);
      });
    } else {
      console.log('   ⚠️  Финансовые счета не найдены');
    }
    
    console.log('');
    console.log('📋 ОЖИДАЕМЫЙ ОТВЕТ API:');
    console.log('');
    console.log('GET /api/accounts/trading?email=' + encodeURIComponent(email));
    console.log(JSON.stringify({
      accounts: client.tradingAccounts.map(a => ({
        id: a.id,
        clientId: a.clientId,
        number: a.number,
        type: a.type,
        currency: a.currency,
        balance: a.balance.toString(),
        availableBalance: a.availableBalance.toString(),
        margin: a.margin.toString(),
        profit: a.profit.toString(),
      }))
    }, null, 2));
    
    console.log('');
    console.log('GET /api/accounts/financial?email=' + encodeURIComponent(email));
    console.log(JSON.stringify({
      accounts: client.financialAccounts.map(a => ({
        id: a.id,
        clientId: a.clientId,
        number: a.number,
        currency: a.currency,
        balance: a.balance.toString(),
        availableBalance: a.availableBalance.toString(),
      }))
    }, null, 2));
    
    console.log('\n✅ Тест завершён\n');
    
  } catch (e) {
    console.error('❌ Ошибка:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

testAccountsAPI();
