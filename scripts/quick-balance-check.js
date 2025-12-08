#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function quickCheck() {
  const email = process.argv[2] || 'maria.sidorova@example.com';
  
  try {
    console.log('\n🔍 Быстрая проверка баланса');
    console.log(`📧 ${email}\n`);
    
    const client = await prisma.client.findUnique({
      where: { email },
      include: { tradingAccounts: true, financialAccounts: true }
    });
    
    if (!client) {
      console.log('❌ Клиент не найден\n');
      return;
    }
    
    const demo = client.tradingAccounts.find(a => a.type === 'DEMO');
    const live = client.tradingAccounts.find(a => a.type === 'LIVE');
    const fin = client.financialAccounts[0];
    
    console.log('💰 БАЛАНСЫ:');
    console.log(`   DEMO: ${demo ? '$' + Number(demo.balance).toFixed(2) : '❌ Не найден'}`);
    console.log(`   LIVE: ${live ? '$' + Number(live.balance).toFixed(2) : '❌ Не найден'}`);
    console.log(`   FIN:  ${fin ? '$' + Number(fin.balance).toFixed(2) : '❌ Не найден'}`);
    console.log('');
    
    if (!demo) {
      console.log('⚠️  Создаём DEMO счет...');
      await prisma.tradingAccount.create({
        data: {
          client: { connect: { id: client.id } },
          type: 'DEMO',
          number: `DEMO-${Date.now()}`,
          balance: '10000',
          availableBalance: '10000',
          margin: '0',
          profit: '0',
          currency: 'USD',
          leverage: 100
        }
      });
      console.log('✅ DEMO счет создан с балансом $10,000\n');
    }
    
  } catch (e) {
    console.error('❌ Ошибка:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

quickCheck();
