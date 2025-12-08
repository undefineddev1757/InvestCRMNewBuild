const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const btc = await prisma.symbol.upsert({
    where: { name: 'BTCUSD' },
    update: {},
    create: {
      name: 'BTCUSD',
      minQty: 0.001,
      qtyStep: 0.001,
      priceStep: 0.5,
      allowedLeverages: [1,2,5,10,20,50,100],
      mmr: 0.005,
      feeTaker: 0.0004,
      feeMaker: 0.0002,
      markPriceSource: 'INTERNAL',
    }
  })
  console.log('✅ Symbol ready:', btc.name)
}

main().catch(e=>{ console.error(e); process.exit(1) }).finally(()=>prisma.$disconnect())


