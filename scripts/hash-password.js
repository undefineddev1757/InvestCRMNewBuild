const bcrypt = require('bcryptjs')

async function hashPassword() {
  const password = 'test123'
  const hashed = await bcrypt.hash(password, 12)
  console.log('Password:', password)
  console.log('Hashed:', hashed)
  
  // Тестуємо
  const isValid = await bcrypt.compare(password, hashed)
  console.log('Is valid:', isValid)
}

hashPassword()
