import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    // Получаем всех клиентов с датами создания
    const clients = await prisma.client.findMany({
      select: {
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    // Группируем по датам
    const statsMap = new Map<string, number>()
    
    clients.forEach((client) => {
      const date = client.createdAt.toISOString().split('T')[0]
      statsMap.set(date, (statsMap.get(date) || 0) + 1)
    })

    // Конвертируем в массив для графика
    const stats = Array.from(statsMap.entries()).map(([date, count]) => ({
      date,
      clients: count,
    }))

    return NextResponse.json({ stats })
  } catch (error) {
    console.error('GET /api/admin/stats/clients error:', error)
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}
