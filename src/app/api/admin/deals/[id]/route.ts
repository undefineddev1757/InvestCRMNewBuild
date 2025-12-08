import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateRealizedPnL } from '@/lib/pnl-calculator'
import { getCurrentUserOrClient } from '@/lib/get-current-user'
import { PositionStatus, CloseType } from '@prisma/client'

/**
 * GET /api/admin/deals/[id]
 * Получение информации о конкретной сделке
 */
export async function GET(
  req: NextRequest,
  { params }: any
) {
  try {
    const userOrClient = await getCurrentUserOrClient(req)
    if (!userOrClient || userOrClient.type !== 'user') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userOrClient.data.id },
      select: { role: true }
    })

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const deal = await prisma.position.findUnique({
      where: { id: params.id },
      include: {
        symbol: true,
        tradingAccount: {
          include: {
            client: {
              select: { id: true, name: true, email: true }
            },
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      }
    })

    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }

    return NextResponse.json({
      deal: {
        id: deal.id,
        tradingAccountId: deal.tradingAccountId,
        client: deal.tradingAccount.client,
        user: deal.tradingAccount.user,
        symbol: deal.symbol.name,
        displayName: deal.displayName || deal.symbol.name,
        side: deal.side,
        qty: Number(deal.qty),
        leverage: deal.leverage,
        entryPrice: Number(deal.entryPrice),
        exitPrice: deal.exitPrice ? Number(deal.exitPrice) : null,
        openPriceAtMoment: deal.openPriceAtMoment ? Number(deal.openPriceAtMoment) : null,
        status: deal.status,
        closeType: deal.closeType,
        pnl: deal.pnl ? Number(deal.pnl) : null,
        fee: Number(deal.fee),
        imLocked: Number(deal.imLocked),
        slPrice: deal.slPrice ? Number(deal.slPrice) : null,
        tpPrice: deal.tpPrice ? Number(deal.tpPrice) : null,
        createdAt: deal.createdAt,
        closedAt: deal.closedAt,
        updatedAt: deal.updatedAt
      }
    })
  } catch (error) {
    console.error(`GET /api/admin/deals/${params?.id} error:`, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/admin/deals/[id]
 * Обновление сделки (редактирование в админке)
 */
export async function PATCH(
  req: NextRequest,
  { params }: any
) {
  try {
    const userOrClient = await getCurrentUserOrClient(req)
    if (!userOrClient || userOrClient.type !== 'user') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userOrClient.data.id },
      select: { role: true }
    })

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    
    // Получаем текущую сделку
    const existingDeal = await prisma.position.findUnique({
      where: { id: params.id }
    })

    if (!existingDeal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }

    // Подготавливаем данные для обновления
    const updateData: any = {}
    
    if (body.status !== undefined) {
      updateData.status = body.status as PositionStatus
      
      // Если закрываем сделку, устанавливаем closedAt
      if (body.status === 'CLOSED' && !existingDeal.closedAt) {
        updateData.closedAt = new Date()
      }
    }
    
    if (body.closeType !== undefined) {
      updateData.closeType = body.closeType as CloseType
    }
    
    if (body.exitPrice !== undefined && body.exitPrice !== null) {
      updateData.exitPrice = body.exitPrice.toString()
      
      // Автоматически рассчитываем PnL при установке exitPrice
      const pnl = calculateRealizedPnL(
        existingDeal.side,
        Number(existingDeal.entryPrice),
        Number(body.exitPrice),
        Number(existingDeal.qty),
        Number(body.fee || existingDeal.fee || 0)
      )
      updateData.pnl = pnl.toString()
    }
    
    if (body.entryPrice !== undefined) {
      updateData.entryPrice = body.entryPrice.toString()
    }
    
    if (body.qty !== undefined) {
      updateData.qty = body.qty.toString()
    }
    
    if (body.leverage !== undefined) {
      updateData.leverage = body.leverage
    }
    
    if (body.displayName !== undefined) {
      updateData.displayName = body.displayName
    }
    
    if (body.openPriceAtMoment !== undefined) {
      updateData.openPriceAtMoment = body.openPriceAtMoment.toString()
    }
    
    if (body.fee !== undefined) {
      updateData.fee = body.fee.toString()
    }
    
    if (body.slPrice !== undefined) {
      updateData.slPrice = body.slPrice ? body.slPrice.toString() : null
    }
    
    if (body.tpPrice !== undefined) {
      updateData.tpPrice = body.tpPrice ? body.tpPrice.toString() : null
    }

    // Обновляем сделку
    const updatedDeal = await prisma.position.update({
      where: { id: params.id },
      data: updateData,
      include: {
        symbol: true,
        tradingAccount: {
          include: {
            client: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      }
    })

    return NextResponse.json({
      deal: {
        id: updatedDeal.id,
        tradingAccountId: updatedDeal.tradingAccountId,
        client: updatedDeal.tradingAccount.client,
        symbol: updatedDeal.symbol.name,
        displayName: updatedDeal.displayName || updatedDeal.symbol.name,
        side: updatedDeal.side,
        qty: Number(updatedDeal.qty),
        leverage: updatedDeal.leverage,
        entryPrice: Number(updatedDeal.entryPrice),
        exitPrice: updatedDeal.exitPrice ? Number(updatedDeal.exitPrice) : null,
        openPriceAtMoment: updatedDeal.openPriceAtMoment ? Number(updatedDeal.openPriceAtMoment) : null,
        status: updatedDeal.status,
        closeType: updatedDeal.closeType,
        pnl: updatedDeal.pnl ? Number(updatedDeal.pnl) : null,
        fee: Number(updatedDeal.fee),
        slPrice: updatedDeal.slPrice ? Number(updatedDeal.slPrice) : null,
        tpPrice: updatedDeal.tpPrice ? Number(updatedDeal.tpPrice) : null,
        createdAt: updatedDeal.createdAt,
        closedAt: updatedDeal.closedAt,
        updatedAt: updatedDeal.updatedAt
      }
    })
  } catch (error) {
    console.error(`PATCH /api/admin/deals/${params?.id} error:`, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/deals/[id]
 * Удаление сделки
 */
export async function DELETE(
  req: NextRequest,
  { params }: any
) {
  try {
    const userOrClient = await getCurrentUserOrClient(req)
    if (!userOrClient || userOrClient.type !== 'user') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userOrClient.data.id },
      select: { role: true }
    })

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.position.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(`DELETE /api/admin/deals/${params?.id} error:`, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
