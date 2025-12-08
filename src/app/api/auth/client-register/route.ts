import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json()
    
    if (!email || !password) {
      return NextResponse.json({ 
        code: 'VALIDATION_FAILED',
        message: 'Email и пароль обязательны' 
      }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ 
        code: 'WEAK_PASSWORD',
        message: 'Пароль должен содержать минимум 6 символов' 
      }, { status: 400 })
    }

    // Проверяем, существует ли уже клиент с таким email
    const existingClient = await prisma.client.findUnique({ 
      where: { email } 
    })
    
    if (existingClient) {
      return NextResponse.json({ 
        code: 'EMAIL_EXISTS',
        message: 'Пользователь с таким email уже существует' 
      }, { status: 409 })
    }

    // Хешируем пароль
    const hashedPassword = await bcrypt.hash(password, 10)

    // 🔐 Сначала создаём кошелёк через внешний API
    let walletApiUrl = process.env.WALLET_API_URL || 'http://localhost:3003'
    const walletApiKey = process.env.WALLET_API_KEY || 'cmhaj3jyh0001k8lrfaq4hxzx'
    
    // Исправляем порт если он неправильный (3000 -> 3003)
    if (walletApiUrl.includes(':3000')) {
      walletApiUrl = walletApiUrl.replace(':3000', ':3003')
    }
    // Если порт вообще не указан, добавляем 3003
    if (!walletApiUrl.match(/:\d+/)) {
      walletApiUrl = walletApiUrl.endsWith('/') ? walletApiUrl.slice(0, -1) : walletApiUrl
      walletApiUrl = `${walletApiUrl}:3003`
    }
    
    console.log('📤 Creating wallet for registration:', {
      envUrl: process.env.WALLET_API_URL,
      finalUrl: walletApiUrl,
      endpoint: `${walletApiUrl}/api/wallet/create`
    })
    
    let walletData = null
    try {
      const requestBody = {
        lead_mail: email // Email клиента как SubID
      }
      
      console.log('📤 [CLIENT-REGISTER] Sending wallet create request:', {
        url: `${walletApiUrl}/api/wallet/create`,
        body: requestBody,
        email: email,
        lead_mail: requestBody.lead_mail
      })
      
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
          code: 'WALLET_CREATION_FAILED',
          message: `Не удалось создать кошелек: ${walletRes.status === 404 ? 'API endpoint не найден' : 'Ошибка внешнего API'}` 
        }, { status: 500 })
      }

      walletData = await walletRes.json()

      if (!walletData.success || !walletData.data) {
        console.error('❌ Invalid wallet API response:', walletData)
        return NextResponse.json({ 
          code: 'INVALID_WALLET_RESPONSE',
          message: 'Неверный ответ от Wallet API' 
        }, { status: 500 })
      }

      console.log('✅ Wallet created successfully:', walletData.data)
    } catch (walletError: any) {
      console.error('❌ Wallet creation error:', walletError)
      return NextResponse.json({ 
        code: 'WALLET_API_ERROR',
        message: `Ошибка при создании кошелька: ${walletError.message || 'Неизвестная ошибка'}` 
      }, { status: 500 })
    }

    // Если кошелек создан успешно, создаём клиента и сохраняем кошельки в транзакции
    try {
      const result = await prisma.$transaction(async (tx) => {
        // Создаем нового клиента
        const client = await tx.client.create({
          data: {
            name: name || null,
            email,
            password: hashedPassword,
            emailVerified: new Date(), // Автоматическая верификация (можно изменить)
          },
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
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

      // Успешная регистрация
      return NextResponse.json({ 
        success: true,
        message: 'Регистрация прошла успешно',
        client: {
          id: result.id,
          name: result.name,
          email: result.email,
        }
      }, { status: 201 })
    } catch (dbError: any) {
      console.error('❌ Database transaction error:', dbError)
      // Если транзакция не удалась, клиент не будет создан
      // Но кошелек уже создан во внешнем API - это можно обработать отдельно при необходимости
      return NextResponse.json({ 
        code: 'DATABASE_ERROR',
        message: 'Ошибка при сохранении данных. Попробуйте еще раз.' 
      }, { status: 500 })
    }
  } catch (error) {
    console.error('POST /api/auth/client-register error:', error)
    return NextResponse.json({ 
      message: 'Внутренняя ошибка сервера' 
    }, { status: 500 })
  }
}
