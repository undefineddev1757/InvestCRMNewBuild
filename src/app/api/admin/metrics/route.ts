import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    // Проверяем авторизацию (упрощённая версия)
    // В будущем добавим проверку JWT токена или сессии
    
    // Считаем клиентов, созданных сегодня
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const clientsToday = await prisma.client.count({
      where: {
        createdAt: {
          gte: today
        }
      }
    })

    // Профит пока возвращаем 0 (в будущем подключим реальные расчёты)
    const profit = 0

    return NextResponse.json({
      clientsToday,
      profit,
    })
  } catch (error) {
    console.error('GET /api/admin/metrics error:', error)
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}
