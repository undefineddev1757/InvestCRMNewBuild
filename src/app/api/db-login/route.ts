import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

// Пряме підключення до PostgreSQL
import { Pool } from 'pg'

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'investcrm',
  password: 'postgres',
  port: 5433,
})

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()
    
    console.log('🔍 DB login for:', email)
    
    // Отримуємо користувача з бази даних
    const result = await pool.query(
      'SELECT id, name, email, password, "emailVerified" FROM "User" WHERE email = $1',
      [email]
    )
    
    if (result.rows.length === 0) {
      console.log('❌ User not found')
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }
    
    const user = result.rows[0]
    console.log('✅ User found:', user.name)
    
    // Перевіряємо пароль
    const isValidPassword = await bcrypt.compare(password, user.password)
    console.log('🔐 Password valid:', isValidPassword)
    
    if (!isValidPassword) {
      console.log('❌ Invalid password')
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }
    
    // Перевіряємо, чи підтверджений email
    if (!user.emailVerified) {
      console.log('❌ Email not verified')
      return NextResponse.json({ error: 'Email not verified' }, { status: 401 })
    }
    
    console.log('✅ Login successful!')
    
    return NextResponse.json({ 
      success: true, 
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: !!user.emailVerified
      }
    })
    
  } catch (error) {
    console.error('❌ DB login error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
