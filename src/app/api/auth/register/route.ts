import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
      const { name, email, password, phone } = await request.json()

    if (!name || !email || !password) {
      return NextResponse.json(
        { message: "Всі поля обов'язкові" },
        { status: 400 }
      )
    }

    // Перевіряємо, чи існує користувач з таким email
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { message: "User already exists" },
        { status: 400 }
      )
    }

    // Хешуємо пароль
    const hashedPassword = await bcrypt.hash(password, 12)

    // Створюємо користувача
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone: phone || null, // Зберігаємо номер телефону
      }
    })

    // Видаляємо пароль з відповіді
    const { password: _, ...userWithoutPassword } = user

    return NextResponse.json(
      { message: "Користувач успішно створений", user: userWithoutPassword },
      { status: 201 }
    )
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json(
      { message: "Внутрішня помилка сервера" },
      { status: 500 }
    )
  }
}
