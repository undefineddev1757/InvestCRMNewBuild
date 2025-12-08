/**
 * Утилита для выполнения авторизованных запросов с JWT токеном
 */

/**
 * Получить JWT токен из localStorage
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem('client_token')
  } catch {
    return null
  }
}

/**
 * Выполнить авторизованный fetch запрос с JWT токеном
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getAuthToken()
  
  const headers = new Headers(options.headers)
  
  // Добавляем JWT токен в заголовок Authorization
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  
  // Устанавливаем Content-Type если не указан
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json')
  }
  
  return fetch(url, {
    ...options,
    headers,
  })
}

