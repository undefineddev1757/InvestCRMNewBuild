import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/admin/accounts/demo-topup
 * Пополнение демо-счета клиента из админки
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { clientId, amount } = body

    // Валидация
    if (!clientId) {
      return NextResponse.json({ message: 'Не указан ID клиента' }, { status: 400 })
    }

    if (!amount || !Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      return NextResponse.json({ message: 'Некорректная сумма пополнения' }, { status: 400 })
    }

    // Проверяем существование клиента
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, email: true, name: true }
    })

    if (!client) {
      return NextResponse.json({ message: 'Клиент не найден' }, { status: 404 })
    }

    // Ищем демо-счет клиента
    let demoAccount = await prisma.tradingAccount.findFirst({
      where: { 
        clientId: clientId, 
        type: 'DEMO' 
      },
      orderBy: { createdAt: 'asc' }
    })

    // Если демо-счета нет, создаем его автоматически
    if (!demoAccount) {
      console.log(`[ADMIN DEMO-TOPUP] Creating new demo account for client: ${client.email}`)
      
      demoAccount = await prisma.tradingAccount.create({
        data: {
          clientId: clientId,
          number: `DEMO-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
          type: 'DEMO',
          currency: 'USD',
          balance: 0,
          availableBalance: 0,
          margin: 0,
          profit: 0
        }
      })
      
      console.log(`[ADMIN DEMO-TOPUP] Demo account created: ${demoAccount.number}`)
    }

    // Пополняем баланс
    const amountNum = Number(amount)
    const oldBalance = Number(demoAccount.balance)
    const newBalance = oldBalance + amountNum
    const newAvailableBalance = Number(demoAccount.availableBalance) + amountNum

    const updatedAccount = await prisma.tradingAccount.update({
      where: { id: demoAccount.id },
      data: {
        balance: newBalance,
        availableBalance: newAvailableBalance,
      }
    })

    const wasCreated = oldBalance === 0 && Number(demoAccount.availableBalance) === 0

    console.log(
      `[ADMIN DEMO-TOPUP] Client: ${client.email} | Account: ${demoAccount.number} | ` +
      `Old Balance: ${oldBalance} | Amount: ${amountNum} | New Balance: ${newBalance} | ` +
      `Created: ${wasCreated ? 'Yes' : 'No'}`
    )

    return NextResponse.json({
      success: true,
      message: wasCreated 
        ? `Демо-счет создан и пополнен на $${amountNum}` 
        : `Демо-счет успешно пополнен на $${amountNum}`,
      accountCreated: wasCreated,
      account: {
        id: updatedAccount.id,
        number: updatedAccount.number,
        balance: Number(updatedAccount.balance),
        availableBalance: Number(updatedAccount.availableBalance),
      }
    })
  } catch (error) {
    console.error('POST /api/admin/accounts/demo-topup error:', error)
    return NextResponse.json({ message: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}

