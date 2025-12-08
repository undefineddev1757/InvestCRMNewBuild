const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const email = 'maria.sidorova@example.com'
  const passwords = ['password123', 'Client123!', 'client123']
  
  console.log(`\n🔍 Checking passwords for ${email}...\n`)
  
  const client = await prisma.client.findUnique({
    where: { email },
    select: { email: true, password: true, isActive: true, emailVerified: true }
  })

  if (!client) {
    console.log('❌ Client not found!')
    return
  }

  console.log('✅ Client found!')
  console.log(`   Active: ${client.isActive ? '✅' : '❌'}`)
  console.log(`   Email Verified: ${client.emailVerified ? '✅' : '❌'}`)
  console.log(`   Has password: ${client.password ? '✅' : '❌'}`)
  console.log()

  if (!client.password) {
    console.log('❌ No password set for this client!')
    return
  }

  console.log('Testing passwords:')
  for (const pwd of passwords) {
    const match = await bcrypt.compare(pwd, client.password)
    console.log(`   ${pwd}: ${match ? '✅ CORRECT' : '❌ wrong'}`)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
