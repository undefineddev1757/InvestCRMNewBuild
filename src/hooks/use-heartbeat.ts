import { useEffect, useRef } from 'react'
import { useUser } from '@/contexts/user-context'

/**
 * Хук для автоматического обновления статуса активности клиента
 * Отправляет heartbeat каждые 30 секунд
 */
export function useHeartbeat() {
  const { user } = useUser()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!user?.email) {
      // Очищаем интервал если пользователь вышел
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    // Функция отправки heartbeat
    const sendHeartbeat = async () => {
      try {
        await fetch('/api/client/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user.email })
        })
      } catch (error) {
        // Тихо игнорируем ошибки heartbeat
        console.debug('Heartbeat failed:', error)
      }
    }

    // Отправляем сразу при монтировании
    sendHeartbeat()

    // Затем каждые 10 секунд
    intervalRef.current = setInterval(sendHeartbeat, 10000)

    // Очистка при размонтировании
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [user?.email])
}
