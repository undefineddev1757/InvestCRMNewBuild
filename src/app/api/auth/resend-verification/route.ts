import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendVerificationEmail } from '@/lib/email'
import { randomBytes } from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { message: 'Email is required' },
        { status: 400 }
      )
    }

    // Перевіряємо, чи існує користувач з таким email
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      )
    }

    // Якщо email вже підтверджений
    if (user.emailVerified) {
      return NextResponse.json(
        { message: 'Email already verified' },
        { status: 400 }
      )
    }

    // Генеруємо новий токен підтвердження
    const token = randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 години

    // Оновлюємо токен в базі даних
    await prisma.verificationToken.upsert({
      where: {
        identifier_token: {
          identifier: email,
          token: token
        }
      },
      update: {
        token: token,
        expires: expires
      },
      create: {
        identifier: email,
        token: token,
        expires: expires
      }
    })

    // Відправляємо email підтвердження
    const emailResult = await sendVerificationEmail(email, token)
    
    if (!emailResult.success) {
      console.error('Failed to resend verification email:', emailResult.error)
      return NextResponse.json(
        { message: 'Failed to resend verification email' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: 'Verification email sent' },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error resending verification email:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
