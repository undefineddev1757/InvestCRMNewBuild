import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()
    
    console.log('🔍 Testing auth for:', email)
    
    const user = await prisma.user.findUnique({
      where: { email }
    })
    
    if (!user) {
      console.log('❌ User not found')
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    console.log('✅ User found:', user.name)
    console.log('📧 Email verified:', !!user.emailVerified)
    console.log('🔑 Has password:', !!user.password)
    
    if (!user.password) {
      console.log('❌ No password set')
      return NextResponse.json({ error: 'No password set' }, { status: 400 })
    }
    
    const isValidPassword = await bcrypt.compare(password, user.password)
    console.log('🔐 Password valid:', isValidPassword)
    
    if (!isValidPassword) {
      console.log('❌ Invalid password')
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }
    
    console.log('✅ Authentication successful!')
    
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
    console.error('❌ Auth test error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
