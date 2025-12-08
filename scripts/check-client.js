const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('\n📋 Checking clients in database...\n')
  
  const clients = await prisma.client.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      isActive: true,
      emailVerified: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' }
  })

  if (clients.length === 0) {
    console.log('❌ No clients found in database!')
    console.log('\n💡 Create a client first using:')
    console.log('   node scripts/seed-clients.js')
  } else {
    console.log(`✅ Found ${clients.length} client(s):\n`)
    clients.forEach((client, i) => {
      console.log(`${i + 1}. ${client.email}`)
      console.log(`   Name: ${client.name || 'N/A'}`)
      console.log(`   Active: ${client.isActive ? '✅' : '❌'}`)
      console.log(`   Email Verified: ${client.emailVerified ? '✅' : '❌'}`)
      console.log(`   Created: ${client.createdAt.toISOString()}`)
      console.log()
    })
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
