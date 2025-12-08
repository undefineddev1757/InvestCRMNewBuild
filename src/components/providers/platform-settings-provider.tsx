"use client"

import { useEffect } from 'react'

export function PlatformSettingsProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/admin/settings/general')
        if (res.ok) {
          const data = await res.json()
          
          // Обновляем title страницы
          if (data.platformName) {
            document.title = data.platformName
          }
        }
      } catch (error) {
        console.error('Error fetching platform settings:', error)
      }
    }

    fetchSettings()
  }, [])

  return <>{children}</>
}
