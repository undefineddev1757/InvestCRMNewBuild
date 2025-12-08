const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const clientId = process.argv[2] || 'cmg6e18j60001141rd572uj75';
    
    console.log('\n🔍 Проверка сделок клиента:', clientId);
    console.log('════════════════════════════════════\n');
    
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        tradingAccounts: {
          include: {
            positions: {
              include: {
                symbol: true
              },
              orderBy: {
                createdAt: 'desc'
              }
            }
          }
        }
      }
    });
    
    if (!client) {
      console.log('❌ Клиент не найден');
      return;
    }
    
    console.log(`✅ Клиент: ${client.name} (${client.email})\n`);
    
    let totalPositions = 0;
    
    client.tradingAccounts.forEach(account => {
      console.log(`📊 Торговый счет: ${account.number} (${account.type})`);
      console.log(`   Баланс: $${Number(account.balance).toFixed(2)}\n`);
      
      if (account.positions.length === 0) {
        console.log('   ⚠️  Сделок нет\n');
      } else {
        account.positions.forEach(pos => {
          totalPositions++;
          console.log(`   ${totalPositions}. ${pos.symbol.name} - ${pos.side}`);
          console.log(`      Статус: ${pos.status}`);
          console.log(`      Объем: ${pos.qty}`);
          console.log(`      Вход: $${Number(pos.entryPrice).toFixed(2)}`);
          if (pos.exitPrice) {
            console.log(`      Выход: $${Number(pos.exitPrice).toFixed(2)}`);
            console.log(`      PnL: $${Number(pos.pnl || 0).toFixed(2)}`);
          }
          console.log(`      Создано: ${pos.createdAt.toLocaleString('ru-RU')}`);
          console.log('');
        });
      }
    });
    
    console.log(`\n📈 Всего сделок: ${totalPositions}\n`);
    
    if (totalPositions > 0) {
      console.log('✅ Откройте вкладку "Сделки":');
      console.log(`   http://localhost:3000/admin/clients/${clientId}?tab=deals\n`);
    }
    
  } catch (e) {
    console.error('❌ Ошибка:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
