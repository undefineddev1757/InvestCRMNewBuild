"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/contexts/user-context'

// Флаг чтобы показать уведомление только один раз
let notificationShown = false

/**
 * Хук для проверки статуса клиента (isActive, emailVerified)
 * Периодически проверяет статус и выкидывает клиента если:
 * - аккаунт заблокирован (isActive = false)
 * - email не подтвержден (emailVerified = null)
 */
export function useClientStatus() {
  const { user, logout } = useUser()
  const router = useRouter()
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    if (!user?.email) return

    const checkStatus = async () => {
      try {
        setChecking(true)
        const res = await fetch(`/api/client/me?email=${encodeURIComponent(user.email)}`, {
          credentials: 'include',
          cache: 'no-store'
        })

        if (!res.ok) {
          // Если клиент не найден или ошибка - выкидываем
          logout()
          return
        }

        const data = await res.json()
        
        // Проверка: аккаунт заблокирован
        if (data.client && !data.client.isActive) {
          if (!notificationShown) {
            notificationShown = true
            // Создаем кастомное уведомление
            showBlockedNotification('Аккаунт заблокирован', 'Ваш аккаунт заблокирован администратором. Обратитесь в поддержку для получения дополнительной информации.')
          }
          logout()
          return
        }

        // Проверка: email не подтвержден
        if (data.client && !data.client.emailVerified) {
          if (!notificationShown) {
            notificationShown = true
            showBlockedNotification('Email не подтвержден', 'Подтвердите аккаунт с почты. Проверьте письмо для подтверждения.')
          }
          logout()
          return
        }

      } catch (error) {
        console.error('[useClientStatus] Error checking client status:', error)
      } finally {
        setChecking(false)
      }
    }

    // Проверяем сразу при загрузке
    checkStatus()

    // Проверяем каждые 30 секунд
    const interval = setInterval(checkStatus, 30000)

    return () => clearInterval(interval)
  }, [user?.email, logout])

  return { checking }
}

// Функция для показа красивого уведомления
function showBlockedNotification(title: string, message: string) {
  // Создаем overlay
  const overlay = document.createElement('div')
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.2s ease-out;
  `

  // Создаем диалог
  const dialog = document.createElement('div')
  dialog.style.cssText = `
    background: white;
    border-radius: 12px;
    padding: 24px;
    max-width: 400px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    animation: scaleIn 0.2s ease-out;
  `

  dialog.innerHTML = `
    <div style="text-align: center;">
      <div style="
        width: 48px;
        height: 48px;
        background: #fee2e2;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 16px;
      ">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      </div>
      <h3 style="
        font-size: 18px;
        font-weight: 600;
        color: #111827;
        margin: 0 0 8px;
      ">${title}</h3>
      <p style="
        font-size: 14px;
        color: #6b7280;
        margin: 0 0 20px;
        line-height: 1.5;
      ">${message}</p>
      <button onclick="window.location.href='/auth/signin'" style="
        background: #dc2626;
        color: white;
        border: none;
        border-radius: 8px;
        padding: 10px 20px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        width: 100%;
      ">Понятно</button>
    </div>
  `

  // Добавляем стили анимации
  const style = document.createElement('style')
  style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes scaleIn {
      from { transform: scale(0.95); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
  `

  overlay.appendChild(dialog)
  document.head.appendChild(style)
  document.body.appendChild(overlay)
}

