const bcrypt = require('bcryptjs')

async function hashPasswords() {
  const passwords = ['client123', 'elena123', 'mikhail123', 'anna123']
  
  for (const password of passwords) {
    const hashed = await bcrypt.hash(password, 12)
    console.log(`${password}: ${hashed}`)
  }
}

hashPasswords()
