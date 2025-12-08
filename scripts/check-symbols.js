const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkSymbols() {
  try {
    console.log('Checking symbols in database...')
    
    const symbols = await prisma.symbol.findMany({
      orderBy: { name: 'asc' }
    })
    
    console.log(`Found ${symbols.length} symbols:`)
    symbols.forEach(symbol => {
      console.log(`- ${symbol.name} (ID: ${symbol.id})`)
    })
    
    if (symbols.length === 0) {
      console.log('No symbols found in database!')
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkSymbols()