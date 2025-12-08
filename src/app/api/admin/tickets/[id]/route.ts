import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - получить тикет для админа
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            image: true
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

    return NextResponse.json({ ticket })
  } catch (error) {
    console.error('[Admin Ticket GET] Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// PATCH - обновить тикет (статус, приоритет, назначение)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { status, priority, assignedTo } = body

    const updateData: any = {}
    if (status) updateData.status = status
    if (priority) updateData.priority = priority
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo

    if (status === 'CLOSED' || status === 'RESOLVED') {
      updateData.closedAt = new Date()
    }

    const ticket = await prisma.ticket.update({
      where: { id },
      data: updateData,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json({ ticket })
  } catch (error) {
    console.error('[Admin Ticket PATCH] Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// POST - добавить ответ от админа
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { message, adminId } = body

    if (!message) {
      return NextResponse.json({ error: 'Сообщение обязательно' }, { status: 400 })
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id }
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Тикет не найден' }, { status: 404 })
    }

    // Создаем сообщение от админа
    const ticketMessage = await prisma.ticketMessage.create({
      data: {
        ticketId: id,
        senderId: adminId || 'admin',
        senderType: 'ADMIN',
        message
      }
    })

    // Обновляем статус тикета на "ожидает ответа клиента"
    await prisma.ticket.update({
      where: { id },
      data: {
        status: 'AWAITING_REPLY',
        updatedAt: new Date()
      }
    })

    return NextResponse.json({ message: ticketMessage })
  } catch (error) {
    console.error('[Admin Ticket POST] Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

