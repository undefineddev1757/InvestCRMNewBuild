const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const symbols = [
  {
    name: 'BTCUSD',
    minQty: 0.001,
    qtyStep: 0.001,
    priceStep: 0.01,
    allowedLeverages: [1, 2, 5, 10, 20, 50, 100],
    mmr: 0.005, // 0.5% maintenance margin
    feeTaker: 0.0006, // 0.06%
    feeMaker: 0.0004, // 0.04%
  },
  {
    name: 'ETHUSD',
    minQty: 0.01,
    qtyStep: 0.01,
    priceStep: 0.01,
    allowedLeverages: [1, 2, 5, 10, 20, 50, 100],
    mmr: 0.005,
    feeTaker: 0.0006,
    feeMaker: 0.0004,
  },
  {
    name: 'EURUSD',
    minQty: 1000,
    qtyStep: 1000,
    priceStep: 0.00001,
    allowedLeverages: [1, 2, 5, 10, 20, 50, 100, 200],
    mmr: 0.003,
    feeTaker: 0.0003,
    feeMaker: 0.0002,
  },
  {
    name: 'GBPUSD',
    minQty: 1000,
    qtyStep: 1000,
    priceStep: 0.00001,
    allowedLeverages: [1, 2, 5, 10, 20, 50, 100, 200],
    mmr: 0.003,
    feeTaker: 0.0003,
    feeMaker: 0.0002,
  },
  {
    name: 'USDJPY',
    minQty: 1000,
    qtyStep: 1000,
    priceStep: 0.001,
    allowedLeverages: [1, 2, 5, 10, 20, 50, 100, 200],
    mmr: 0.003,
    feeTaker: 0.0003,
    feeMaker: 0.0002,
  },
  {
    name: 'XAUUSD', // Золото
    minQty: 0.01,
    qtyStep: 0.01,
    priceStep: 0.01,
    allowedLeverages: [1, 2, 5, 10, 20, 50, 100],
    mmr: 0.005,
    feeTaker: 0.0005,
    feeMaker: 0.0003,
  },
  {
    name: 'AAPL', // Apple акции
    minQty: 1,
    qtyStep: 1,
    priceStep: 0.01,
    allowedLeverages: [1, 2, 5, 10],
    mmr: 0.01,
    feeTaker: 0.001,
    feeMaker: 0.0008,
  },
];

async function main() {
  try {
    console.log('\n🔧 Создание торговых инструментов...\n');
    
    for (const symbolData of symbols) {
      // Проверяем существует ли символ
      const existing = await prisma.symbol.findUnique({
        where: { name: symbolData.name }
      });
      
      if (existing) {
        console.log(`⚠️  ${symbolData.name} уже существует`);
        continue;
      }
      
      const symbol = await prisma.symbol.create({
        data: {
          name: symbolData.name,
          minQty: symbolData.minQty.toString(),
          qtyStep: symbolData.qtyStep.toString(),
          priceStep: symbolData.priceStep.toString(),
          allowedLeverages: symbolData.allowedLeverages,
          mmr: symbolData.mmr.toString(),
          feeTaker: symbolData.feeTaker.toString(),
          feeMaker: symbolData.feeMaker.toString(),
        }
      });
      
      console.log(`✅ ${symbol.name} создан`);
      console.log(`   Плечо: ${symbolData.allowedLeverages.join(', ')}`);
      console.log(`   MMR: ${symbolData.mmr * 100}%`);
      console.log('');
    }
    
    console.log('✅ Все символы созданы!\n');
    
  } catch (e) {
    console.error('❌ Ошибка:', e.message);
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
