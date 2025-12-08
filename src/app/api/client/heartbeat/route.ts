import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST - Обновить lastSeen для клиента (heartbeat)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json({ 
        success: false, 
        error: 'Email обязателен' 
      }, { status: 400 })
    }

    // Обновляем lastSeen
    const client = await prisma.client.update({
      where: { email },
      data: { lastSeen: new Date() },
      select: { id: true, email: true, lastSeen: true }
    })

    return NextResponse.json({ 
      success: true,
      data: {
        lastSeen: client.lastSeen?.toISOString()
      }
    })

  } catch (error: any) {
    // Если клиент не найден
    if (error.code === 'P2025') {
      return NextResponse.json({ 
        success: false, 
        error: 'Клиент не найден' 
      }, { status: 404 })
    }

    console.error('Heartbeat error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Ошибка обновления статуса' 
    }, { status: 500 })
  }
}
