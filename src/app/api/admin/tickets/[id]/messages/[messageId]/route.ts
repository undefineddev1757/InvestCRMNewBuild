import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * PATCH /api/admin/tickets/[id]/messages/[messageId]
 * Редактировать сообщение админа
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  try {
    const { id, messageId } = await params
    const body = await req.json()
    const { message } = body

    if (!message || !message.trim()) {
      return NextResponse.json({ 
        error: 'Сообщение обязательно' 
      }, { status: 400 })
    }

    // Проверяем существование тикета
    const ticket = await prisma.ticket.findUnique({
      where: { id }
    })

    if (!ticket) {
      return NextResponse.json({ 
        error: 'Тикет не найден' 
      }, { status: 404 })
    }

    // Проверяем существование сообщения
    const ticketMessage = await prisma.ticketMessage.findUnique({
      where: { id: messageId }
    })

    if (!ticketMessage) {
      return NextResponse.json({ 
        error: 'Сообщение не найдено' 
      }, { status: 404 })
    }

    // Проверяем, что сообщение принадлежит этому тикету
    if (ticketMessage.ticketId !== id) {
      return NextResponse.json({ 
        error: 'Сообщение не принадлежит этому тикету' 
      }, { status: 403 })
    }

    // Проверяем, что сообщение от админа
    if (ticketMessage.senderType !== 'ADMIN') {
      return NextResponse.json({ 
        error: 'Можно редактировать только сообщения админа' 
      }, { status: 403 })
    }

    // Обновляем сообщение
    const updatedMessage = await prisma.ticketMessage.update({
      where: { id: messageId },
      data: {
        message: message.trim()
      }
    })

    // Обновляем время обновления тикета
    await prisma.ticket.update({
      where: { id },
      data: {
        updatedAt: new Date()
      }
    })

    console.log(`✏️ [EDIT MESSAGE] Message ${messageId} in ticket ${id} updated`)

    return NextResponse.json({ 
      success: true,
      message: updatedMessage 
    })
  } catch (error) {
    console.error('[Admin Ticket Message Edit] Error:', error)
    return NextResponse.json({ 
      error: 'Внутренняя ошибка сервера' 
    }, { status: 500 })
  }
}

