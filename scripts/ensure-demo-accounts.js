const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function ensureDemoAccounts() {
  try {
    console.log('🔍 Finding clients without demo accounts...');
    
    // Находим всех активных клиентов
    const clients = await prisma.client.findMany({
      where: { isActive: true },
      include: { tradingAccounts: true }
    });
    
    console.log(`📊 Found ${clients.length} active clients`);
    
    let createdCount = 0;
    
    for (const client of clients) {
      const hasDemoAccount = client.tradingAccounts.some(acc => acc.type === 'DEMO');
      
      if (!hasDemoAccount) {
        console.log(`❌ Client ${client.name} (${client.email}) has no demo account`);
        
        // Создаем демо-счет
        const demoAccount = await prisma.tradingAccount.create({
          data: {
            clientId: client.id,
            number: `DEMO-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            type: 'DEMO',
            currency: 'USD',
            balance: 10000,
            availableBalance: 10000,
            margin: 0,
            profit: 0
          }
        });
        
        console.log(`✅ Created demo account for ${client.name}:`, {
          id: demoAccount.id,
          number: demoAccount.number,
          balance: demoAccount.balance
        });
        
        createdCount++;
      } else {
        console.log(`✅ Client ${client.name} already has demo account`);
      }
    }
    
    console.log(`\n🎉 Summary: Created ${createdCount} demo accounts`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

ensureDemoAccounts();
