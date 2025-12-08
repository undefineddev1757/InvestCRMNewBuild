import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

// Тестові користувачі
const testUsers = [
  {
    id: '1',
    name: 'Іван Петренко',
    email: 'client@test.com',
    password: '$2a$12$rrRH4t.Y4lgwxBMlDpYJTuDTHRHJMU83arEXAo6HaL9g0KZ5irUQ2' // client123
  },
  {
    id: '2', 
    name: 'Олена Коваленко',
    email: 'elena@test.com',
    password: '$2a$12$bPEURF5wk2X0YW3X/cXek.HgnVMCy5oh0sgybsFe65XHR6JkFhlTW' // elena123
  },
  {
    id: '3',
    name: 'Михайло Шевченко', 
    email: 'mikhail@test.com',
    password: '$2a$12$fVBUnp6f98P/QjrEnGDzA.z2A.vnJl45oGgeaQX2yoPT4oWDHwEju' // mikhail123
  },
  {
    id: '4',
    name: 'Анна Іваненко',
    email: 'anna@test.com', 
    password: '$2a$12$AgSDwZAm8rVQhIpwzzOka.hnEn6kxxfpFYYGubOsCwbbrrUAPtNA2' // anna123
  }
]

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()
    
    console.log('🔍 Simple login for:', email)
    
    const user = testUsers.find(u => u.email === email)
    
    if (!user) {
      console.log('❌ User not found')
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }
    
    const isValidPassword = await bcrypt.compare(password, user.password)
    console.log('🔐 Password valid:', isValidPassword)
    
    if (!isValidPassword) {
      console.log('❌ Invalid password')
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }
    
    console.log('✅ Login successful!')
    
    return NextResponse.json({ 
      success: true, 
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    })
    
  } catch (error) {
    console.error('❌ Login error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
