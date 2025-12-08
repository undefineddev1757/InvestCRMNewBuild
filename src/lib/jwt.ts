import jwt, { SignOptions } from 'jsonwebtoken'

const JWT_SECRET: string = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '7d' // 7 дней

export interface ClientJWTPayload {
  clientId: string
  email: string
  type: 'client'
}

/**
 * Создать JWT токен для клиента
 */
export function createClientToken(payload: Omit<ClientJWTPayload, 'type'>): string {
  const tokenPayload: ClientJWTPayload = {
    ...payload,
    type: 'client'
  }
  
  return jwt.sign(tokenPayload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  } as SignOptions)
}

/**
 * Проверить и декодировать JWT токен клиента
 */
export function verifyClientToken(token: string): ClientJWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as ClientJWTPayload
    
    // Проверяем, что это токен клиента
    if (decoded.type !== 'client' || !decoded.clientId || !decoded.email) {
      return null
    }
    
    return decoded
  } catch (error) {
    console.error('[JWT] Token verification failed:', error)
    return null
  }
}

/**
 * Извлечь JWT токен из заголовка Authorization
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) return null
  
  // Поддерживаем формат "Bearer <token>" или просто "<token>"
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }
  
  return authHeader
}

