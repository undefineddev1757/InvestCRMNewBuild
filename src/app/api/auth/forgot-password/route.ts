import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { message: "Email обов'язковий" },
        { status: 400 }
      )
    }

    // Перевіряємо, чи існує користувач з таким email
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      // Для безпеки не розкриваємо, чи існує користувач
      return NextResponse.json(
        { message: "Якщо акаунт з таким email існує, інструкції для відновлення пароля відправлені на вашу електронну пошту" },
        { status: 200 }
      )
    }

    // Тут має бути логіка відправки email з токеном для відновлення пароля
    // Поки що просто повертаємо успішну відповідь
    console.log(`Password reset requested for user: ${email}`)

    return NextResponse.json(
      { message: "Якщо акаунт з таким email існує, інструкції для відновлення пароля відправлені на вашу електронну пошту" },
      { status: 200 }
    )
  } catch (error) {
    console.error("Forgot password error:", error)
    return NextResponse.json(
      { message: "Внутрішня помилка сервера" },
      { status: 500 }
    )
  }
}
