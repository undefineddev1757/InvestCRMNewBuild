import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUserOrClient } from '@/lib/get-current-user'

export async function POST(req: NextRequest) {
  try {
    // Получаем клиента через JWT токен
    const userOrClient = await getCurrentUserOrClient(req)
    
    if (!userOrClient || userOrClient.type !== 'client') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const { walletId, amount, amountUSD } = body  // amount - в токенах, amountUSD - в USD (опционально)

    if (!walletId || !amount || Number(amount) <= 0) {
      return NextResponse.json({ error: 'Invalid walletId or amount' }, { status: 400 })
    }

    // Находим кошелек клиента
    const wallet = await prisma.wallet.findFirst({
      where: {
        id: walletId,
        clientId: userOrClient.data.id
      }
    })

    if (!wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    }

    // Вызываем внешний API для создания тикета
    const walletApiUrl = process.env.WALLET_API_URL || 'http://localhost:3003'
    const walletApiKey = process.env.WALLET_API_KEY || 'cmhaj3jyh0001k8lrfaq4hxzx'

    // amount уже приходит в токенах (например, 1 для 1 TRX)
    // Передаем его напрямую во внешний API
    const requestBody = {
      walletId: wallet.id,
      amount: Number(amount),  // Сумма в токенах
      lead_mail: userOrClient.data.email  // Email клиента как SubID
    }

    console.log('📤 [DEPOSIT-CREATE] Creating deposit ticket:', {
      walletId: wallet.id,
      walletAddress: wallet.address,
      walletType: wallet.type,
      amount: Number(amount),  // Сумма в токенах (например, 1 TRX)
      apiUrl: `${walletApiUrl}/api/deposit/create`,
      clientEmail: userOrClient.data.email,
      requestBody: requestBody,
      lead_mail: requestBody.lead_mail,
      bodyStringified: JSON.stringify(requestBody)
    })

    const depositRes = await fetch(`${walletApiUrl}/api/deposit/create`, {
      method: 'POST',
      headers: {
        'Authorization': walletApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    if (!depositRes.ok) {
      const errorText = await depositRes.text()
      let errorMessage = 'Failed to create deposit ticket'
      
      try {
        const errorJson = JSON.parse(errorText)
        errorMessage = errorJson.message || errorJson.error || errorMessage
      } catch {
        errorMessage = errorText || errorMessage
      }
      
      console.error(`❌ Deposit API error (${depositRes.status}):`, {
        status: depositRes.status,
        statusText: depositRes.statusText,
        error: errorText,
        walletId: wallet.id,
        amount,
        apiUrl: `${walletApiUrl}/api/deposit/create`
      })
      
      return NextResponse.json({ 
        error: errorMessage,
        details: depositRes.status === 404 
          ? 'API endpoint не найден. Проверьте настройки WALLET_API_URL.'
          : `Ошибка внешнего API: ${depositRes.status}`
      }, { status: depositRes.status })
    }

    const depositData = await depositRes.json()

    if (!depositData.success || !depositData.data) {
      console.error('❌ Invalid deposit API response:', {
        success: depositData.success,
        data: depositData.data,
        fullResponse: depositData
      })
      return NextResponse.json({ 
        error: 'Неверный ответ от Deposit API',
        details: 'Ответ не содержит необходимых данных'
      }, { status: 500 })
    }

    const ticketData = depositData.data

    // ВАЖНО: amountUSD - это сумма в USD, которую пользователь хочет пополнить
    // expectedAmount из Wallet API - это количество токенов
    // Всегда используем amountUSD для баланса, даже если Wallet API вернул expectedAmount в токенах
    
    console.log('💵 Amount calculation:', {
      amountUSD: amountUSD,
      amount: amount,
      amountUSDNumber: Number(amountUSD),
      amountNumber: Number(amount)
    })
    
    const amountInUSD = (amountUSD && Number(amountUSD) > 0) ? Number(amountUSD) : Number(amount)
    
    // Финальная проверка: если amountInUSD все еще <= 0, выдаем ошибку
    if (!amountInUSD || !Number.isFinite(amountInUSD) || amountInUSD <= 0) {
      console.error('❌ Invalid amount detected:', {
        amountUSD,
        amount,
        amountInUSD
      })
      return NextResponse.json({ 
        error: 'Неверная сумма депозита',
        details: 'Сумма должна быть больше 0'
      }, { status: 400 })
    }
    
    console.log('💾 Saving deposit ticket:', {
      ticketId: ticketData.ticketId,
      amountFromWalletAPI: ticketData.expectedAmount,
      amountInTokens: Number(amount),  // Что передали в Wallet API (токены)
      amountInUSD,  // Что сохраняем в БД (USD для баланса)
      walletType: ticketData.walletType,
      currency: ticketData.currency
    })

    // Устанавливаем время жизни тикета: 40 минут от текущего времени
    const expiresAt = new Date(Date.now() + 40 * 60 * 1000) // 40 минут = 40 * 60 * 1000 мс
    
    console.log('⏰ Setting deposit ticket expiration:', {
      walletApiExpiresAt: ticketData.expiresAt,
      ourExpiresAt: expiresAt.toISOString(),
      durationMinutes: 40
    })

    // Сохраняем тикет в БД (amount ВСЕГДА сохраняем в USD для обновления баланса)
    const ticket = await prisma.depositTicket.create({
      data: {
        ticketId: ticketData.ticketId,
        clientId: userOrClient.data.id,
        walletId: wallet.id,
        amount: amountInUSD.toString(),  // Сохраняем в USD для обновления баланса
        walletAddress: ticketData.walletAddress,
        walletType: ticketData.walletType,
        currency: ticketData.currency,
        status: 'PENDING',
        expiresAt: expiresAt, // Используем наше время: 40 минут
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        ticketId: ticket.ticketId,
        walletAddress: ticket.walletAddress,
        walletType: ticket.walletType,
        expectedAmount: Number(ticket.amount),
        currency: ticket.currency,
        expiresAt: ticket.expiresAt.toISOString(),
        status: ticket.status,
        createdAt: ticket.createdAt.toISOString(),
      }
    }, { status: 201 })

  } catch (error: any) {
    console.error('❌ POST /api/deposit/create error:', {
      message: error?.message,
      stack: error?.stack,
      error
    })
    return NextResponse.json({ 
      error: 'Внутренняя ошибка сервера',
      details: error?.message || 'Неизвестная ошибка'
    }, { status: 500 })
  }
}

