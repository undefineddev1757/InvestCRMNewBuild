const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const email = process.argv[2] || 'maria.sidorova@example.com';
    const amount = Number(process.argv[3]) || 10000;
    
    console.log(`\n🔍 Тестируем пополнение демо-счета для: ${email}`);
    console.log(`💰 Сумма пополнения: $${amount.toFixed(2)}\n`);
    
    // Найти клиента
    const client = await prisma.client.findUnique({
      where: { email },
      include: {
        tradingAccounts: {
          where: { type: 'DEMO' },
          orderBy: { createdAt: 'asc' },
          take: 1
        }
      }
    });
    
    if (!client) {
      console.log('❌ Клиент не найден');
      return;
    }
    
    console.log(`✅ Клиент найден: ${client.name}`);
    
    const demo = client.tradingAccounts[0];
    if (!demo) {
      console.log('❌ Демо-счет не найден');
      return;
    }
    
    console.log(`📊 Демо-счет: ${demo.number}`);
    console.log(`💵 Текущий баланс: $${Number(demo.balance).toFixed(2)}`);
    console.log(`💵 Доступно: $${Number(demo.availableBalance).toFixed(2)}\n`);
    
    // Пополнение
    const updated = await prisma.tradingAccount.update({
      where: { id: demo.id },
      data: {
        balance: (Number(demo.balance) + amount).toFixed(8),
        availableBalance: (Number(demo.availableBalance) + amount).toFixed(8),
      }
    });
    
    console.log(`✅ БАЛАНС УСПЕШНО ПОПОЛНЕН!`);
    console.log(`💵 Новый баланс: $${Number(updated.balance).toFixed(2)}`);
    console.log(`💵 Новый доступный: $${Number(updated.availableBalance).toFixed(2)}\n`);
    
  } catch (e) {
    console.error('❌ Ошибка:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
