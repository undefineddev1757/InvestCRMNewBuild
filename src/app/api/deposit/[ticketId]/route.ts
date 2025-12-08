import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUserOrClient } from '@/lib/get-current-user'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const { ticketId } = await params
    
    // Получаем клиента через JWT токен
    const userOrClient = await getCurrentUserOrClient(req)
    
    if (!userOrClient || userOrClient.type !== 'client') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Находим тикет в БД
    const ticket = await prisma.depositTicket.findUnique({
      where: { ticketId },
      include: {
        wallet: true
      }
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Проверяем, что тикет принадлежит клиенту
    if (ticket.clientId !== userOrClient.data.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Используем внешний Wallet API для проверки статуса депозита
    let apiTicketData: any = null
    
    // Если тикет уже помечен как COMPLETED, не проверяем снова (защита от двойного начисления)
    if (ticket.status === 'COMPLETED' && ticket.receivingTxId) {
      console.log('✅ Ticket already completed, skipping check')
      apiTicketData = {
        status: 'COMPLETED',
        receivedAmount: ticket.receivedAmount ? Number(ticket.receivedAmount) : Number(ticket.amount),
        receivingTxId: ticket.receivingTxId,
        expectedAmount: Number(ticket.amount),
      }
    } else {
      // Проверяем статус через внешний Wallet API
      const walletApiUrl = process.env.WALLET_API_URL || 'http://localhost:3000'
      const walletApiKey = process.env.WALLET_API_KEY || 'cmhaj3jyh0001k8lrfaq4hxzx'

      console.log('🔍 Checking deposit status via Wallet API:', {
        ticketId,
        walletType: ticket.walletType,
        walletAddress: ticket.walletAddress,
        apiUrl: `${walletApiUrl}/api/deposit/${ticketId}`
      })

      try {
        const statusRes = await fetch(`${walletApiUrl}/api/deposit/${ticketId}`, {
          headers: {
            'Authorization': walletApiKey,
            'Content-Type': 'application/json'
          }
        })

        if (!statusRes.ok) {
          const errorText = await statusRes.text()
          console.error('❌ Deposit status API error:', statusRes.status, errorText)
          
          // Если API недоступен, возвращаем данные из БД
          apiTicketData = null
        } else {
          const statusData = await statusRes.json()

          if (!statusData.success || !statusData.data) {
            console.error('❌ Invalid response from deposit API:', statusData)
            apiTicketData = null
          } else {
            apiTicketData = statusData.data
            console.log('✅ Deposit status from Wallet API:', {
              status: apiTicketData.status,
              receivedAmount: apiTicketData.receivedAmount,
              receivingTxId: apiTicketData.receivingTxId
            })
          }
        }
      } catch (apiError: any) {
        console.error('❌ Wallet API fetch error:', apiError.message || apiError)
        apiTicketData = null
      }
    }
    
    // Если не удалось получить данные из API, используем данные из БД
    if (!apiTicketData) {
      apiTicketData = {
        status: ticket.status,
        receivedAmount: ticket.receivedAmount ? Number(ticket.receivedAmount) : null,
        receivingTxId: ticket.receivingTxId,
        expectedAmount: Number(ticket.amount),
      }
    }

    // Обновляем статус в БД
    const updatedStatus = apiTicketData.status as 'PENDING' | 'COMPLETED' | 'EXPIRED' | 'FAILED'
    
    const updatedTicket = await prisma.depositTicket.update({
      where: { ticketId },
      data: {
        status: updatedStatus,
        receivedAmount: apiTicketData.receivedAmount ? apiTicketData.receivedAmount.toString() : null,
        receivingTxId: apiTicketData.receivingTxId || null,
        updatedAt: new Date(),
      }
    })

    // Если статус COMPLETED, обновляем баланс клиента
    // Проверяем, что баланс еще не был обновлен (чтобы не пополнять дважды)
    // ВАЖНО: используем ticket.amount (USD), а НЕ apiTicketData.expectedAmount (токены)
    if (updatedStatus === 'COMPLETED' && ticket.status !== 'COMPLETED' && ticket.amount) {
      const depositAmount = Number(ticket.amount)
      
      console.log('💰 Processing deposit completion:', {
        clientId: userOrClient.data.id,
        amount: depositAmount,
        ticketId
      })

      // Находим или создаем LIVE торговый счет клиента (основной счет для торговли)
      let liveTradingAccount = await prisma.tradingAccount.findFirst({
        where: {
          clientId: userOrClient.data.id,
          type: 'LIVE',
          currency: 'USD'
        },
        orderBy: { createdAt: 'asc' }
      })

      if (!liveTradingAccount) {
        console.log('⚠️ LIVE trading account not found, creating new one...')
        liveTradingAccount = await prisma.tradingAccount.create({
          data: {
            clientId: userOrClient.data.id,
            type: 'LIVE',
            number: `LIVE-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            currency: 'USD',
            balance: '0',
            availableBalance: '0',
            margin: '0',
            profit: '0',
          }
        })
        console.log('✅ LIVE trading account created:', liveTradingAccount.id)
      }

      // Обновляем баланс LIVE торгового счета
      const newLiveBalance = (Number(liveTradingAccount.balance) + depositAmount).toFixed(8)
      const newLiveAvailable = (Number(liveTradingAccount.availableBalance) + depositAmount).toFixed(8)
      
      await prisma.tradingAccount.update({
        where: { id: liveTradingAccount.id },
        data: {
          balance: newLiveBalance,
          availableBalance: newLiveAvailable,
        }
      })

      console.log('✅ LIVE trading account updated:', {
        accountId: liveTradingAccount.id,
        oldBalance: liveTradingAccount.balance,
        newBalance: newLiveBalance,
        addedAmount: depositAmount
      })

      // Также обновляем финансовый счет (создаем если нет)
      let financialAccount = await prisma.financialAccount.findFirst({
        where: {
          clientId: userOrClient.data.id,
          currency: 'USD'
        },
        orderBy: { createdAt: 'asc' }
      })

      if (!financialAccount) {
        console.log('⚠️ Financial account not found, creating new one...')
        financialAccount = await prisma.financialAccount.create({
          data: {
            clientId: userOrClient.data.id,
            number: `FIN-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            currency: 'USD',
            balance: '0',
            availableBalance: '0',
          }
        })
        console.log('✅ Financial account created:', financialAccount.id)
      }

      await prisma.financialAccount.update({
        where: { id: financialAccount.id },
        data: {
          balance: (Number(financialAccount.balance) + depositAmount).toFixed(8),
          availableBalance: (Number(financialAccount.availableBalance) + depositAmount).toFixed(8),
        }
      })

      console.log('✅ Financial account updated:', {
        accountId: financialAccount.id,
        addedAmount: depositAmount
      })

      // Создаем транзакцию в историю
      // Ссылаемся на LIVE торговый счет как получателя
      const transaction = await prisma.transaction.create({
        data: {
          clientId: userOrClient.data.id,
          type: 'DEPOSIT',
          status: 'COMPLETED',
          amount: depositAmount.toString(),
          currency: 'USD',
          description: `Deposit ${ticket.currency} (Ticket: ${ticketId})`,
          toTradingAccountId: liveTradingAccount.id,
          toFinancialAccountId: financialAccount.id,
        }
      })

      console.log('✅ Transaction recorded in history:', {
        transactionId: transaction.id,
        type: 'DEPOSIT',
        amount: depositAmount,
        toTradingAccount: liveTradingAccount.id,
        toFinancialAccount: financialAccount.id
      })

      // Сбрасываем требование пополнения, если оно было
      await prisma.client.update({
        where: { id: userOrClient.data.id },
        data: {
          depositRequiredAmount: 0,
          depositRequiredAt: null,
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        ticketId: updatedTicket.ticketId,
        walletAddress: updatedTicket.walletAddress,
        walletType: updatedTicket.walletType,
        expectedAmount: Number(updatedTicket.amount),
        receivedAmount: updatedTicket.receivedAmount ? Number(updatedTicket.receivedAmount) : null,
        currency: updatedTicket.currency,
        status: updatedTicket.status,
        receivingTxId: updatedTicket.receivingTxId,
        expiresAt: updatedTicket.expiresAt.toISOString(),
        timeLeftSeconds: Math.max(0, Math.floor((updatedTicket.expiresAt.getTime() - Date.now()) / 1000)),
        createdAt: updatedTicket.createdAt.toISOString(),
        updatedAt: updatedTicket.updatedAt.toISOString(),
      }
    })

  } catch (error) {
    console.error('GET /api/deposit/[ticketId] error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

