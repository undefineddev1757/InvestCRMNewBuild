import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUserOrClient } from '@/lib/get-current-user'

// GET - получить конкретный тикет с сообщениями
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userOrClient = await getCurrentUserOrClient(req)
    
    if (!userOrClient) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Тикет не найден' }, { status: 404 })
    }

    // Проверяем доступ (клиент может видеть только свои тикеты)
    if (userOrClient.type === 'client' && ticket.clientId !== userOrClient.data.id) {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 })
    }

    return NextResponse.json({ ticket })
  } catch (error) {
    console.error('[Ticket GET] Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// POST - добавить сообщение в тикет
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userOrClient = await getCurrentUserOrClient(req)
    
    if (!userOrClient) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const body = await req.json()
    const { message } = body

    if (!message) {
      return NextResponse.json({ error: 'Сообщение обязательно' }, { status: 400 })
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id }
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Тикет не найден' }, { status: 404 })
    }

    // Проверяем доступ
    if (userOrClient.type === 'client' && ticket.clientId !== userOrClient.data.id) {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 })
    }

    // Создаем сообщение и обновляем тикет
    const ticketMessage = await prisma.ticketMessage.create({
      data: {
        ticketId: id,
        senderId: userOrClient.data.id,
        senderType: userOrClient.type === 'client' ? 'CLIENT' : 'ADMIN',
        message
      }
    })

    // Обновляем статус тикета
    await prisma.ticket.update({
      where: { id },
      data: {
        status: userOrClient.type === 'client' ? 'OPEN' : 'AWAITING_REPLY',
        updatedAt: new Date()
      }
    })

    return NextResponse.json({ message: ticketMessage })
  } catch (error) {
    console.error('[Ticket POST] Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

