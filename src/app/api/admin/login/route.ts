import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// Вайтлист IP (захардкожено)
const IP_WHITELIST = [
  '91.193.165.54',
  '[::1]:3000'
]

function getClientIp(req: NextRequest) {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  const real = req.headers.get('x-real-ip')
  if (real) return real
  try {
    // next 14 сохраняет ip в request ip если trust proxy настроен; fallback нет
    // @ts-ignore
    return (req as any).ip || ''
  } catch {
    return ''
  }
}

export async function POST(req: NextRequest) {
  try {
    // Временное отключение IP-фильтра для упрощения доступа

    const { email, password } = await req.json()
    if (!email || !password) return NextResponse.json({ code: 'VALIDATION_FAILED' }, { status: 400 })

    const user = await prisma.user.findUnique({ where: { email } })
    // Временное упрощение: пускаем любого существующего пользователя (без проверки роли)
    if (!user) {
      return NextResponse.json({ code: 'FORBIDDEN', role: null, email }, { status: 403 })
    }
    const ok = user.password ? await bcrypt.compare(password, user.password) : false
    if (!ok) return NextResponse.json({ code: 'INVALID_CREDENTIALS' }, { status: 401 })

    // Для простоты вернём ok=true (интеграция с next-auth/сессиями — отдельная задача)
    return NextResponse.json({ 
      ok: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    })
  } catch (e) {
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}


