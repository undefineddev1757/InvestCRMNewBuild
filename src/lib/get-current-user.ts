import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { extractTokenFromHeader, verifyClientToken } from '@/lib/jwt'

/**
 * Универсальная функция для получения текущего пользователя или клиента
 * Проверяет JWT токен (Client), сессию NextAuth (User) и email параметр (legacy)
 */
export async function getCurrentUserOrClient(req: NextRequest) {
  try {
    // 1. Сначала проверяем JWT токен из заголовка Authorization
    const authHeader = req.headers.get('authorization')
    const token = extractTokenFromHeader(authHeader)
    
    if (token) {
      const payload = verifyClientToken(token)
      if (payload) {
        // Проверяем, что клиент существует и активен
        const client = await prisma.client.findUnique({
          where: { id: payload.clientId },
          select: {
            id: true,
            email: true,
            name: true,
            isActive: true,
          }
        })
        
        if (client && client.isActive) {
          return { type: 'client' as const, data: client }
        }
        
        // Если клиент не найден или неактивен, токен невалиден
        return null
      }
    }

    // 2. Если нет JWT токена, проверяем сессию NextAuth (для админов)
    try {
      const session = await getServerSession(authOptions)
      if (session?.user?.email) {
        const user = await prisma.user.findUnique({ 
          where: { email: session.user.email },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          }
        })

        if (user) {
          return { type: 'user' as const, data: user }
        }
      }
    } catch {}

    // 3. Legacy: проверяем email параметр (для обратной совместимости, но не рекомендуется)
    const url = new URL(req.url)
    const emailParam = url.searchParams.get('email') || undefined

    if (!emailParam) return null

    // Сначала проверяем User модель
    const user = await prisma.user.findUnique({ 
      where: { email: emailParam },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      }
    })

    if (user) {
      return { type: 'user' as const, data: user }
    }

    // Если не найден в User, проверяем Client модель
    const client = await prisma.client.findUnique({ 
      where: { email: emailParam },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
      }
    })

    if (client) {
      // Проверяем активность клиента
      if (!client.isActive) {
        return null // Деактивированный клиент не может использовать API
      }
      return { type: 'client' as const, data: client }
    }

    return null
  } catch (error) {
    console.error('Error in getCurrentUserOrClient:', error)
    return null
  }
}

/**
 * Получить trading account для пользователя или клиента
 */
export async function getTradingAccount(userOrClient: Awaited<ReturnType<typeof getCurrentUserOrClient>>) {
  if (!userOrClient) return null

  const { type, data } = userOrClient

  if (type === 'user') {
    return await prisma.tradingAccount.findFirst({ 
      where: { userId: data.id }, 
      orderBy: { createdAt: 'asc' } 
    })
  } else {
    return await prisma.tradingAccount.findFirst({ 
      where: { clientId: data.id }, 
      orderBy: { createdAt: 'asc' } 
    })
  }
}

/**
 * Получить все trading accounts для пользователя или клиента
 */
export async function getAllTradingAccounts(userOrClient: Awaited<ReturnType<typeof getCurrentUserOrClient>>) {
  if (!userOrClient) return []

  const { type, data } = userOrClient

  if (type === 'user') {
    return await prisma.tradingAccount.findMany({ 
      where: { userId: data.id } 
    })
  } else {
    return await prisma.tradingAccount.findMany({ 
      where: { clientId: data.id } 
    })
  }
}
