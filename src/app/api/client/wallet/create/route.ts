import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUserOrClient } from '@/lib/get-current-user'

/**
 * POST /api/client/wallet/create
 * Создать кошелек для текущего клиента через внешний Wallet API
 */
export async function POST(req: NextRequest) {
  try {
    // Получаем клиента через JWT токен
    const userOrClient = await getCurrentUserOrClient(req)
    
    if (!userOrClient || userOrClient.type !== 'client') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Проверяем, есть ли уже кошельки у клиента
    const existingWallets = await prisma.wallet.findMany({
      where: { clientId: userOrClient.data.id }
    })

    if (existingWallets.length > 0) {
      return NextResponse.json({ 
        wallets: existingWallets,
        message: 'Кошельки уже существуют'
      })
    }

    // Создаём кошелёк через внешний API
    const walletApiUrl = process.env.WALLET_API_URL || 'http://localhost:3003'
    const walletApiKey = process.env.WALLET_API_KEY || 'cmhaj3jyh0001k8lrfaq4hxzx'
    
    // Убеждаемся что URL правильный (должен быть порт 3003, а не 3000)
    const apiUrl = walletApiUrl.includes(':3000') 
      ? walletApiUrl.replace(':3000', ':3003')
      : walletApiUrl
    
    const requestBody = {
      lead_mail: userOrClient.data.email // Email клиента как SubID
    }
    
    console.log('📤 [WALLET-CREATE] Creating wallet via Wallet API:', {
      envUrl: process.env.WALLET_API_URL,
      walletApiUrl,
      finalUrl: apiUrl,
      endpoint: `${apiUrl}/api/wallet/create`,
      clientEmail: userOrClient.data.email,
      requestBody: requestBody,
      lead_mail: requestBody.lead_mail,
      bodyStringified: JSON.stringify(requestBody)
    })
    
    const walletRes = await fetch(`${apiUrl}/api/wallet/create`, {
      method: 'POST',
      headers: {
        'Authorization': walletApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    if (!walletRes.ok) {
      const errorText = await walletRes.text()
      console.error('❌ Failed to create wallet:', walletRes.status, errorText)
      return NextResponse.json({ 
        error: `Не удалось создать кошелек: ${walletRes.status === 404 ? 'API endpoint не найден' : 'Ошибка внешнего API'}` 
      }, { status: walletRes.status })
    }

    const walletData = await walletRes.json()

    if (!walletData.success || !walletData.data) {
      return NextResponse.json({ 
        error: 'Неверный ответ от Wallet API' 
      }, { status: 500 })
    }

    // Сохраняем кошельки
    const walletsArray = Array.isArray(walletData.data)
      ? walletData.data
      : typeof walletData.data === 'object'
        ? Object.values(walletData.data)
        : []

    if (walletsArray.length === 0) {
      return NextResponse.json({ 
        error: 'Кошельки не были созданы' 
      }, { status: 500 })
    }

    const savedWallets = []
    for (const w of walletsArray) {
      const address = w.address || w.hexAddress || w.legacyAddress
      if (!w?.id || !address || !w?.type) {
        console.warn('⚠️ Skipping invalid wallet entry:', w)
        continue
      }

      try {
        const saved = await prisma.wallet.create({
          data: {
            id: String(w.id),
            clientId: userOrClient.data.id,
            address: String(address),
            type: String(w.type),
          }
        })
        savedWallets.push(saved)
      } catch (e: any) {
        // Если кошелек уже существует (дубликат), пропускаем
        if (e.code === 'P2002') {
          console.warn('⚠️ Wallet already exists:', w.id)
        } else {
          console.error('⚠️ Failed to save wallet:', w, e)
        }
      }
    }

    if (savedWallets.length === 0) {
      return NextResponse.json({ 
        error: 'Не удалось сохранить кошельки' 
      }, { status: 500 })
    }

    console.log(`✅ Created ${savedWallets.length} wallet(s) for client:`, userOrClient.data.email)

    return NextResponse.json({ 
      wallets: savedWallets,
      message: `Создано ${savedWallets.length} кошелек(ов)`
    })

  } catch (error) {
    console.error('POST /api/client/wallet/create error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

