"use client"

import { useEffect, useState } from 'react'

interface PlatformSettings {
  platformName: string
  primaryColor: string
  logoUrl: string | null
}

export function usePlatformSettings() {
  const [settings, setSettings] = useState<PlatformSettings>({
    platformName: 'InvestCRM',
    primaryColor: '#3b82f6',
    logoUrl: null,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/admin/settings/general')
        if (res.ok) {
          const data = await res.json()
          setSettings(data)
          
          // Обновляем title страницы
          if (data.platformName) {
            document.title = data.platformName
          }
        }
      } catch (error) {
        console.error('Error fetching platform settings:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSettings()
  }, [])

  return { settings, loading }
}
