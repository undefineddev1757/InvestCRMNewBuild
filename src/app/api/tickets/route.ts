import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUserOrClient } from '@/lib/get-current-user'

// GET - получить все тикеты текущего клиента
export async function GET(req: NextRequest) {
  try {
    const userOrClient = await getCurrentUserOrClient(req)
    
    if (!userOrClient) {
      console.log('[Tickets GET] User not found')
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    console.log('[Tickets GET] User/Client:', userOrClient.type, userOrClient.data.email)

    const tickets = await prisma.ticket.findMany({
      where: { clientId: userOrClient.data.id },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        _count: {
          select: { messages: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    })

    return NextResponse.json({ tickets })
  } catch (error) {
    console.error('[Tickets GET] Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// POST - создать новый тикет
export async function POST(req: NextRequest) {
  try {
    const userOrClient = await getCurrentUserOrClient(req)
    
    if (!userOrClient) {
      console.log('[Tickets POST] User not found')
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    console.log('[Tickets POST] User/Client:', userOrClient.type, userOrClient.data.email)

    // Проверка прав на создание тикетов
    if (userOrClient.type === 'client') {
      const client = await prisma.client.findUnique({
        where: { id: userOrClient.data.id },
        select: { canCreateTickets: true }
      })

      if (!client?.canCreateTickets) {
        return NextResponse.json({ 
          error: 'У вас нет прав на создание обращений' 
        }, { status: 403 })
      }
    }

    const body = await req.json()
    const { subject, message, priority } = body

    if (!subject || !message) {
      return NextResponse.json({ 
        error: 'Тема и сообщение обязательны' 
      }, { status: 400 })
    }

    // Создаем тикет с первым сообщением
    const ticket = await prisma.ticket.create({
      data: {
        clientId: userOrClient.data.id,
        subject,
        priority: priority || 'MEDIUM',
        messages: {
          create: {
            senderId: userOrClient.data.id,
            senderType: 'CLIENT',
            message
          }
        }
      },
      include: {
        messages: true
      }
    })

    return NextResponse.json({ ticket })
  } catch (error) {
    console.error('[Tickets POST] Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

