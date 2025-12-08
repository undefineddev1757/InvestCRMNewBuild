import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// GET - получить всех администраторов
export async function GET(req: NextRequest) {
  try {
    const admins = await prisma.user.findMany({
      where: {
        role: 'ADMIN'
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        image: true,
        emailVerified: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    return NextResponse.json({ admins })
  } catch (error) {
    console.error('GET /api/admin/admins error:', error)
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}

// POST - создать нового администратора
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, password, phone } = body

    // Валидация
    if (!email || !password) {
      return NextResponse.json({ message: 'Email and password required' }, { status: 400 })
    }

    // Проверка на существующего пользователя
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ message: 'User with this email already exists' }, { status: 409 })
    }

    // Хешируем пароль
    const hashedPassword = await bcrypt.hash(password, 10)

    // Создаём администратора
    const admin = await prisma.user.create({
      data: {
        name: name || null,
        email,
        password: hashedPassword,
        phone: phone || null,
        role: 'ADMIN',
        emailVerified: new Date(),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        image: true,
        emailVerified: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    return NextResponse.json({ admin }, { status: 201 })
  } catch (error) {
    console.error('POST /api/admin/admins error:', error)
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}
