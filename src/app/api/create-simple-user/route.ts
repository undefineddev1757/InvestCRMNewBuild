import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

// Простий тестовий користувач без бази даних
const testUser = {
  id: 'test-123',
  name: 'Тестовий Користувач',
  email: 'test@example.com',
  password: '$2a$12$7Febxl8jZGshL6AywMo2du1687zeVK6Fg14n3G6bVDC/lPpfoz.FO' // test123
}

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()
    
    console.log('🔍 Testing simple auth for:', email)
    
    if (email === testUser.email) {
      const isValidPassword = await bcrypt.compare(password, testUser.password)
      console.log('🔐 Password valid:', isValidPassword)
      
      if (isValidPassword) {
        return NextResponse.json({ 
          success: true, 
          user: {
            id: testUser.id,
            name: testUser.name,
            email: testUser.email
          }
        })
      } else {
        return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
      }
    } else {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
  } catch (error) {
    console.error('❌ Simple auth test error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
