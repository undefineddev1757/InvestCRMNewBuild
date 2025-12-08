import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    const email = searchParams.get('email')

    if (!token || !email) {
      return NextResponse.json(
        { message: 'Token and email are required' },
        { status: 400 }
      )
    }

    // Знаходимо токен в базі даних
    const verificationToken = await prisma.verificationToken.findUnique({
      where: {
        identifier_token: {
          identifier: email,
          token: token
        }
      }
    })

    if (!verificationToken) {
      return NextResponse.json(
        { message: 'Invalid or expired token' },
        { status: 400 }
      )
    }

    // Перевіряємо, чи не закінчився термін дії токена
    if (verificationToken.expires < new Date()) {
      // Видаляємо застарілий токен
      await prisma.verificationToken.delete({
        where: {
          identifier_token: {
            identifier: email,
            token: token
          }
        }
      })

      return NextResponse.json(
        { message: 'Token expired' },
        { status: 400 }
      )
    }

    // Оновлюємо користувача - встановлюємо emailVerified
    await prisma.user.update({
      where: { email },
      data: { emailVerified: new Date() }
    })

    // Видаляємо використаний токен
    await prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: email,
          token: token
        }
      }
    })

    return NextResponse.json(
      { message: 'Email verified successfully' },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error verifying email:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
