import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PATCH - обновить финансовый счет
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { balance, availableBalance } = body

    console.log('[PATCH Financial Account] ID:', id, 'Data:', body)

    // Проверяем существование счета
    const existing = await prisma.financialAccount.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ message: 'Financial account not found' }, { status: 404 })
    }

    // Обновляем счет
    const updateData: any = {}
    if (balance !== undefined) updateData.balance = balance
    if (availableBalance !== undefined) updateData.availableBalance = availableBalance

    const account = await prisma.financialAccount.update({
      where: { id },
      data: updateData,
    })

    console.log('[PATCH Financial Account] Updated:', account)

    return NextResponse.json({ account })
  } catch (error) {
    console.error('PATCH /api/admin/accounts/financial/[id] error:', error)
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}

