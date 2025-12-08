import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PATCH - обновить торговый счет
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { balance, availableBalance, margin, profit } = body

    console.log('[PATCH Trading Account] ID:', id, 'Data:', body)

    // Проверяем существование счета
    const existing = await prisma.tradingAccount.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ message: 'Trading account not found' }, { status: 404 })
    }

    // Обновляем счет
    const updateData: any = {}
    if (balance !== undefined) updateData.balance = balance
    if (availableBalance !== undefined) updateData.availableBalance = availableBalance
    if (margin !== undefined) updateData.margin = margin
    if (profit !== undefined) updateData.profit = profit

    const account = await prisma.tradingAccount.update({
      where: { id },
      data: updateData,
    })

    console.log('[PATCH Trading Account] Updated:', account)

    return NextResponse.json({ account })
  } catch (error) {
    console.error('PATCH /api/admin/accounts/trading/[id] error:', error)
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}

