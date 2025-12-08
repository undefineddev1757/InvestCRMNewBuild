import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// GET - получить всех клиентов
export async function GET(req: NextRequest) {
  try {
    const clients = await prisma.client.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        image: true,
        emailVerified: true,
        isActive: true,
        lastSeen: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            tradingAccounts: true,
            financialAccounts: true,
            transactions: true,
          }
        },
        wallets: {
          select: {
            id: true,
            address: true,
            type: true,
            createdAt: true,
          },
          take: 3,
          orderBy: { createdAt: 'asc' }
        },
        tradingAccounts: {
          select: {
            id: true,
            type: true,
            balance: true,
            currency: true,
          }
        },
        financialAccounts: {
          select: {
            id: true,
            balance: true,
            currency: true,
          }
        }
      }
    })

    return NextResponse.json({ clients })
  } catch (error) {
    console.error('GET /api/admin/clients error:', error)
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}

// POST - создать нового клиента
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, password, phone, emailVerified } = body

    // Валидация
    if (!email || !password) {
      return NextResponse.json({ message: 'Email and password required' }, { status: 400 })
    }

    // Проверка на существующего клиента
    const existing = await prisma.client.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ message: 'Client with this email already exists' }, { status: 409 })
    }

    // Хешируем пароль
    const hashedPassword = await bcrypt.hash(password, 10)

    // 🔐 Сначала создаём кошелёк через внешний API
    let walletApiUrl = process.env.WALLET_API_URL || 'http://localhost:3003'
    const walletApiKey = process.env.WALLET_API_KEY || 'cmhaj3jyh0001k8lrfaq4hxzx'
    
    // Исправляем порт если он неправильный (3000 -> 3003)
    if (walletApiUrl.includes(':3000') && !walletApiUrl.includes(':3000')) {
      walletApiUrl = walletApiUrl.replace(':3000', ':3003')
    }
    // Если порт вообще не указан, добавляем 3003
    if (!walletApiUrl.includes(':')) {
      walletApiUrl = walletApiUrl.endsWith('/') ? walletApiUrl.slice(0, -1) : walletApiUrl
      walletApiUrl = `${walletApiUrl}:3003`
    }
    
    const requestBody = {
      lead_mail: email // Email клиента как SubID
    }
    
    console.log('📤 [ADMIN-CREATE-CLIENT] Creating wallet for new client:', {
      envUrl: process.env.WALLET_API_URL,
      finalUrl: walletApiUrl,
      endpoint: `${walletApiUrl}/api/wallet/create`,
      clientEmail: email,
      requestBody: requestBody,
      lead_mail: requestBody.lead_mail,
      bodyStringified: JSON.stringify(requestBody)
    })
    
    let walletData = null
    try {
      const walletRes = await fetch(`${walletApiUrl}/api/wallet/create`, {
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
          message: `Не удалось создать кошелек: ${walletRes.status === 404 ? 'API endpoint не найден' : 'Ошибка внешнего API'}` 
        }, { status: 500 })
      }

      walletData = await walletRes.json()

      if (!walletData.success || !walletData.data) {
        console.error('❌ Invalid wallet API response:', walletData)
        return NextResponse.json({ 
          message: 'Неверный ответ от Wallet API' 
        }, { status: 500 })
      }

      console.log('✅ Wallet created successfully:', walletData.data)
    } catch (walletError: any) {
      console.error('❌ Wallet creation error:', walletError)
      return NextResponse.json({ 
        message: `Ошибка при создании кошелька: ${walletError.message || 'Неизвестная ошибка'}` 
      }, { status: 500 })
    }

    // Если кошелек создан успешно, создаём клиента и сохраняем кошельки в транзакции
    const result = await prisma.$transaction(async (tx) => {
      // Создаём клиента
      const client = await tx.client.create({
        data: {
          name: name || null,
          email,
          password: hashedPassword,
          phone: phone || null,
          emailVerified: emailVerified ? new Date() : null,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          image: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
        }
      })

      // Сохраняем кошельки
      const walletsArray = Array.isArray(walletData.data)
        ? walletData.data
        : typeof walletData.data === 'object'
          ? Object.values(walletData.data)
          : []

      if (walletsArray.length === 0) {
        throw new Error('Кошельки не были созданы')
      }

      for (const w of walletsArray) {
        const address = w.address || w.hexAddress || w.legacyAddress
        if (!w?.id || !address || !w?.type) {
          console.warn('⚠️ Skipping invalid wallet entry:', w)
          continue
        }

        await tx.wallet.create({
          data: {
            id: String(w.id),
            clientId: client.id,
            address: String(address),
            type: String(w.type),
          }
        })
      }

      console.log(`✅ Client and ${walletsArray.length} wallet(s) created successfully for:`, client.email)
      return client
    })

    return NextResponse.json({ client: result }, { status: 201 })
  } catch (error) {
    console.error('POST /api/admin/clients error:', error)
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}
