import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { eventBus, adjustmentsChannel } from '@/lib/pubsub'

// DELETE: удалить корректировку полностью
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    // eslint-disable-next-line no-console
    console.log('🗑️ Deleting adjustment:', id)

    const deleted = await prisma.priceAdjustment.delete({ where: { id } })

    // eslint-disable-next-line no-console
    console.log('✅ Adjustment deleted:', deleted?.id)

    try {
      if (deleted?.symbolName) {
        eventBus.publish(adjustmentsChannel(deleted.symbolName), { type: 'deleted', id })
      }
    } catch {}

    return NextResponse.json({
      success: true,
      message: 'Adjustment deleted successfully',
      id: deleted.id,
    })
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error('❌ Error deleting adjustment:', error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// PUT: немедленно остановить (сдвинуть endsAt на текущее время или заданное)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json().catch(() => ({})) as any
    const endsAtInput = body?.endsAt
    const safeEndsAt = endsAtInput ? new Date(endsAtInput) : new Date()

    // eslint-disable-next-line no-console
    console.log('🔄 Updating adjustment:', id, { endsAt: safeEndsAt.toISOString() })

    const updated = await prisma.priceAdjustment.update({
      where: { id },
      data: { endsAt: safeEndsAt },
    })

    // eslint-disable-next-line no-console
    console.log('✅ Adjustment updated:', updated?.id)

    try {
      if ((updated as any)?.symbolName) {
        eventBus.publish(adjustmentsChannel((updated as any).symbolName), { type: 'updated', id, endsAt: safeEndsAt })
      }
    } catch {}

    return NextResponse.json({
      success: true,
      message: 'Adjustment stopped successfully',
      adjustment: updated,
    })
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error('❌ Error updating adjustment:', error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// PATCH -> тот же сценарий, что и PUT
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  return PUT(req, ctx)
}




