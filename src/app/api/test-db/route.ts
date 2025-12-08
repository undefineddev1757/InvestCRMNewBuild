import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    console.log('🔍 Testing database connection...')
    
    // Простий тест підключення
    const result = await prisma.$queryRaw`SELECT 1 as test`
    console.log('✅ Database connection successful:', result)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Database connection successful',
      result 
    })
    
  } catch (error: any) {
    console.error('❌ Database connection failed:', error)
    return NextResponse.json({ 
      success: false, 
      error: String(error?.message || error),
      details: String(error) 
    }, { status: 500 })
  }
}
