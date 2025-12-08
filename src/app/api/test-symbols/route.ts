import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    console.log('Test API called')
    
    const symbols = await prisma.symbol.findMany({
      orderBy: { name: 'asc' }
    })
    
    console.log('Found symbols:', symbols.length)
    
    return NextResponse.json({ 
      success: true, 
      count: symbols.length,
      symbols: symbols.map(s => ({ name: s.name, id: s.id }))
    })
  } catch (error) {
    console.error('Test API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
