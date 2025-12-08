import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - получить все тикеты (для админа)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')

    const where: any = {}
    if (status && status !== 'ALL') {
      where.status = status
    }
    if (priority && priority !== 'ALL') {
      where.priority = priority
    }

    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        _count: {
          select: { messages: true }
        }
      },
      orderBy: [
        { status: 'asc' },
        { priority: 'desc' },
        { updatedAt: 'desc' }
      ]
    })

    return NextResponse.json({ tickets })
  } catch (error) {
    console.error('[Admin Tickets GET] Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

