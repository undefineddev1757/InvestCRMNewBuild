import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { createClientToken } from '@/lib/jwt'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    
    if (!email || !password) {
      return NextResponse.json({ 
        code: 'VALIDATION_FAILED',
        message: 'Email и пароль обязательны' 
      }, { status: 400 })
    }

    // Ищем клиента по email
    const client = await prisma.client.findUnique({ 
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        emailVerified: true,
        isActive: true,
      }
    })
    
    if (!client) {
      return NextResponse.json({ 
        code: 'INVALID_CREDENTIALS',
        message: 'Неверный email или пароль' 
      }, { status: 401 })
    }

    // Проверяем активность аккаунта
    if (!client.isActive) {
      return NextResponse.json({ 
        code: 'ACCOUNT_DISABLED',
        message: 'Ваш аккаунт больше не работает. Обратитесь к администратору.' 
      }, { status: 403 })
    }

    // Проверяем пароль
    if (!client.password) {
      return NextResponse.json({ 
        code: 'NO_PASSWORD',
        message: 'У этого аккаунта не установлен пароль' 
      }, { status: 401 })
    }

    const passwordMatch = await bcrypt.compare(password, client.password)
    
    if (!passwordMatch) {
      return NextResponse.json({ 
        code: 'INVALID_CREDENTIALS',
        message: 'Неверный email или пароль' 
      }, { status: 401 })
    }

    // Проверяем верификацию email
    if (!client.emailVerified) {
      return NextResponse.json({ 
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Подтвердите аккаунт с почты. Проверьте письмо для подтверждения.' 
      }, { status: 403 })
    }

    // Создаем JWT токен
    const token = createClientToken({
      clientId: client.id,
      email: client.email
    })

    // Успешный вход
    return NextResponse.json({ 
      success: true,
      message: 'Вход выполнен успешно',
      token, // JWT токен
      client: {
        id: client.id,
        name: client.name,
        email: client.email,
      }
    })
  } catch (error) {
    console.error('POST /api/auth/client-login error:', error)
    return NextResponse.json({ 
      message: 'Внутренняя ошибка сервера' 
    }, { status: 500 })
  }
}
