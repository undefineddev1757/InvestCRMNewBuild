const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const symbol = await prisma.symbol.findUnique({
      where: { name: 'BTCUSD' }
    });
    
    if (!symbol) {
      console.log('❌ BTCUSD не найден');
      return;
    }
    
    console.log('\n📊 BTCUSD параметры:');
    console.log('════════════════════════════════════');
    console.log('minQty:', symbol.minQty);
    console.log('qtyStep:', symbol.qtyStep);
    console.log('priceStep:', symbol.priceStep);
    console.log('allowedLeverages:', symbol.allowedLeverages);
    console.log('');
    
    console.log('✅ Валидные примеры qty:');
    const examples = [0.001, 0.01, 0.1, 1, 2, 10, 100];
    examples.forEach(qty => {
      const minQty = Number(symbol.minQty);
      const qtyStep = Number(symbol.qtyStep);
      const isValid = qty >= minQty && Math.abs(qty / qtyStep - Math.round(qty / qtyStep)) < 1e-8;
      console.log(`  ${qty.toString().padEnd(6)} - ${isValid ? '✓' : '✗'}`);
    });
    
    console.log('');
    console.log('📝 Пример запроса:');
    console.log(JSON.stringify({
      symbol: 'BTCUSD',
      side: 'long',
      qty: 0.01,  // Должно быть кратно qtyStep
      mode: 'isolated',
      leverage: 10,
      price: 110828.22
    }, null, 2));
    console.log('');
    
  } catch (e) {
    console.error('Ошибка:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
