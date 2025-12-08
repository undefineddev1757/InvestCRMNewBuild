const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function fixSymbolTypes() {
  try {
    console.log('🔧 Fixing symbol types in database...\n')
    
    const symbols = await prisma.symbol.findMany()
    
    for (const symbol of symbols) {
      let newType = symbol.type
      
      // Определяем тип по названию символа
      if (symbol.name.includes('BTC') || symbol.name.includes('ETH') || symbol.name.includes('USD') && symbol.name.length <= 8) {
        newType = 'crypto'
      } else if (symbol.name.length <= 5 && !symbol.name.includes('USD')) {
        newType = 'CS' // Stock
      }
      
      if (newType !== symbol.type) {
        console.log(`📝 Updating ${symbol.name}: ${symbol.type} → ${newType}`)
        
        await prisma.symbol.update({
          where: { id: symbol.id },
          data: { type: newType }
        })
      } else {
        console.log(`✅ ${symbol.name}: ${symbol.type} (no change needed)`)
      }
    }
    
    console.log('\n✅ Symbol types updated!')
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixSymbolTypes()
