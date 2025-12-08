import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Проверка транзакций TRON через TronGrid API
 * GET /api/deposit/check-tron?address=...&amount=...&ticketId=...
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const address = url.searchParams.get('address')
    const amount = url.searchParams.get('amount') // Ожидаемая сумма в USDT
    const ticketId = url.searchParams.get('ticketId')

    if (!address) {
      return NextResponse.json({ error: 'Address required' }, { status: 400 })
    }

    // Получаем транзакции TRC20 через TronGrid API
    const tronGridUrl = `https://api.trongrid.io/v1/accounts/${address}/transactions/trc20?limit=50&order_by=block_timestamp,desc`
    
    console.log('🔍 Checking TRON transactions:', {
      address,
      amount,
      ticketId,
      url: tronGridUrl
    })

    const response = await fetch(tronGridUrl)
    
    if (!response.ok) {
      console.error('❌ TronGrid API error:', response.status, response.statusText)
      return NextResponse.json({ 
        error: 'Failed to fetch from TronGrid API',
        status: response.status 
      }, { status: response.status })
    }

    const data = await response.json()
    const transactions = data.data || []

    console.log(`📊 Found ${transactions.length} TRC20 transactions for address ${address}`)

    // Ищем транзакцию с нужной суммой (USDT имеет 6 знаков после запятой)
    const expectedAmountWei = amount ? Math.round(parseFloat(amount) * 1000000) : null // USDT = 6 decimals
    
    let matchingTransaction = null
    
    if (expectedAmountWei) {
      // Ищем транзакции USDT (контракт USDT TRC20: TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t)
      const usdtContract = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'
      
      matchingTransaction = transactions.find((tx: any) => {
        // Проверяем что это USDT транзакция
        const isUSDT = tx.token_info?.address === usdtContract || tx.contract_address === usdtContract
        
        if (!isUSDT) return false
        
        // Проверяем что это входящая транзакция (to_address совпадает с нашим адресом)
        const isIncoming = tx.to?.toLowerCase() === address.toLowerCase()
        
        if (!isIncoming) return false
        
        // Проверяем сумму (value в wei, нужно разделить на 10^6 для USDT)
        const txAmount = parseInt(tx.value || '0', 10)
        const txAmountUSDT = txAmount / 1000000
        
        // Допускаем небольшое отклонение (0.1%)
        const expectedAmount = expectedAmountWei / 1000000
        const diff = Math.abs(txAmountUSDT - expectedAmount)
        const tolerance = expectedAmount * 0.001 // 0.1% tolerance
        
        console.log('🔍 Checking transaction:', {
          txHash: tx.transaction_id,
          txAmountUSDT,
          expectedAmount,
          diff,
          tolerance,
          matches: diff <= tolerance
        })
        
        return diff <= tolerance
      })
    }

    if (matchingTransaction) {
      console.log('✅ Found matching transaction:', matchingTransaction.transaction_id)
      
      // Если передан ticketId, обновляем статус тикета и баланс
      if (ticketId) {
        const txHash = matchingTransaction.transaction_id
        const txAmountUSDT = parseInt(matchingTransaction.value || '0', 10) / 1000000
        
        // Получаем тикет из БД
        const ticket = await prisma.depositTicket.findUnique({
          where: { ticketId },
          include: { client: true }
        })

        if (ticket && ticket.status !== 'COMPLETED') {
          // Обновляем статус тикета
          await prisma.depositTicket.update({
            where: { ticketId },
            data: {
              status: 'COMPLETED',
              receivedAmount: txAmountUSDT.toString(),
              receivingTxId: txHash,
              updatedAt: new Date(),
            }
          })

          // Обновляем баланс LIVE торгового счета
          const depositAmount = Number(ticket.amount) // сумма в USD
          
          // Находим или создаем LIVE торговый счет
          let liveTradingAccount = await prisma.tradingAccount.findFirst({
            where: {
              clientId: ticket.clientId,
              type: 'LIVE',
              currency: 'USD'
            },
            orderBy: { createdAt: 'asc' }
          })

          if (!liveTradingAccount) {
            console.log('⚠️ LIVE trading account not found, creating new one...')
            liveTradingAccount = await prisma.tradingAccount.create({
              data: {
                clientId: ticket.clientId,
                type: 'LIVE',
                number: `LIVE-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                currency: 'USD',
                balance: '0',
                availableBalance: '0',
                margin: '0',
                profit: '0',
              }
            })
          }

          await prisma.tradingAccount.update({
            where: { id: liveTradingAccount.id },
            data: {
              balance: (Number(liveTradingAccount.balance) + depositAmount).toFixed(8),
              availableBalance: (Number(liveTradingAccount.availableBalance) + depositAmount).toFixed(8),
            }
          })

          // Находим или создаем финансовый счет
          let financialAccount = await prisma.financialAccount.findFirst({
            where: {
              clientId: ticket.clientId,
              currency: 'USD'
            },
            orderBy: { createdAt: 'asc' }
          })

          if (!financialAccount) {
            financialAccount = await prisma.financialAccount.create({
              data: {
                clientId: ticket.clientId,
                number: `FIN-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                currency: 'USD',
                balance: '0',
                availableBalance: '0',
              }
            })
          }

          await prisma.financialAccount.update({
            where: { id: financialAccount.id },
            data: {
              balance: (Number(financialAccount.balance) + depositAmount).toFixed(8),
              availableBalance: (Number(financialAccount.availableBalance) + depositAmount).toFixed(8),
            }
          })

          // Создаем транзакцию в историю
          await prisma.transaction.create({
            data: {
              clientId: ticket.clientId,
              type: 'DEPOSIT',
              status: 'COMPLETED',
              amount: depositAmount.toString(),
              currency: 'USD',
              description: `Deposit ${ticket.currency} (Ticket: ${ticketId})`,
              toTradingAccountId: liveTradingAccount.id,
              toFinancialAccountId: financialAccount.id,
            }
          })

          console.log('✅ LIVE balance updated and transaction recorded:', {
            clientId: ticket.clientId,
            amount: depositAmount,
            ticketId,
            liveAccountId: liveTradingAccount.id,
            financialAccountId: financialAccount.id
          })

          // Сбрасываем требование пополнения
          await prisma.client.update({
            where: { id: ticket.clientId },
            data: {
              depositRequiredAmount: 0,
              depositRequiredAt: null,
            }
          })
        }

        console.log('✅ Ticket updated to COMPLETED:', ticketId)
      }

      return NextResponse.json({
        success: true,
        found: true,
        transaction: {
          hash: matchingTransaction.transaction_id,
          amount: parseInt(matchingTransaction.value || '0', 10) / 1000000,
          blockTimestamp: matchingTransaction.block_timestamp,
          from: matchingTransaction.from,
          to: matchingTransaction.to,
        }
      })
    }

    return NextResponse.json({
      success: true,
      found: false,
      transactionsChecked: transactions.length,
      message: 'Transaction not found yet'
    })

  } catch (error: any) {
    console.error('❌ Error checking TRON transactions:', error)
    return NextResponse.json({ 
      error: 'Internal error',
      details: error.message 
    }, { status: 500 })
  }
}

