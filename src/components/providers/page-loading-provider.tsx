"use client"

import { useEffect, useState, Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

function LoadingBar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Показываем loader при изменении маршрута
    setLoading(true)
    
    const timeout = setTimeout(() => {
      setLoading(false)
    }, 300) // Минимальная задержка для плавности

    return () => clearTimeout(timeout)
  }, [pathname, searchParams])

  if (!loading) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-transparent">
      <div className="h-full bg-primary animate-loading-bar" />
    </div>
  )
}

export function PageLoadingProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <LoadingBar />
      </Suspense>
      {children}
    </>
  )
}
