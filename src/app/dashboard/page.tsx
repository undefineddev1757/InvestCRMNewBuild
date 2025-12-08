"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/contexts/user-context"
import { useHeartbeat } from "@/hooks/use-heartbeat"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Search, Bell, Settings, User, PieChart, Wallet, History, DollarSign, Building, Menu, Mail } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LanguageSwitcher } from "@/components/ui/language-switcher"
import { ThemeSwitcher } from "@/components/ui/theme-switcher"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { AppSidebar } from "@/components/app-sidebar"
import { AppHeader } from "@/components/app-header"
import dynamic from 'next/dynamic'
import PositionsMini from '@/components/chart/positions-mini'
import PositionsAccordion from '@/components/chart/positions-accordion'
import PairsList from '@/components/chart/pairs-list'
import { useLanguage } from '@/contexts/language-context'
 

// Динамический импорт для избежания SSR ошибок
const KLineChartProComponent = dynamic(
  () => import("@/components/chart/kline-chart-pro"),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-96 bg-card rounded-lg border">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }
)

const TradingPanel = dynamic(
  () => import("@/components/chart/trading-panel").then(mod => ({ default: mod.TradingPanel })),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-96 bg-card rounded-lg border">
        <div className="text-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }
)

export default function Dashboard() {
  const { user, logout, isLoading } = useUser()
  const router = useRouter()
  const pathname = usePathname()
  const { t } = useLanguage()
  
  // Автоматическое обновление статуса активности
  useHeartbeat()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [messages] = useState<Array<{ id: string; title: string; preview?: string; read?: boolean }>>([])
  const [moscowTime, setMoscowTime] = useState<string>("")
  const [mounted, setMounted] = useState(false)
  const [selectedSymbol, setSelectedSymbol] = useState<string>("BTC/USD")
  const [currentPrice, setCurrentPrice] = useState<number>(0)
  const selectedSymbolRef = useRef<string>(selectedSymbol)

  // лог для отладки смены символа
  useEffect(() => {
    console.log('🔄 Symbol changed to:', selectedSymbol)
    selectedSymbolRef.current = selectedSymbol
  }, [selectedSymbol])

  useEffect(() => {
    const lang = (typeof window !== 'undefined' ? window.localStorage.getItem('language') : 'en') || 'en'
    const update = () => {
      const now = new Date()
      const fmt = new Intl.DateTimeFormat(lang === 'ru' ? 'ru-RU' : lang === 'de' ? 'de-DE' : 'en-US', { timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit' })
      setMoscowTime(fmt.format(now))
    }
    update()
    const t = setInterval(update, 60 * 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => { setMounted(true) }, [])

  // Перенаправляємо на сторінку входу, якщо користувач не авторизований
  useEffect(() => {
    if (mounted && !isLoading) {
      // Проверяем клиентскую авторизацию
      const clientAuthed = localStorage.getItem('client_authed')
      if (!user && !clientAuthed) {
        router.replace("/auth/signin")
      }
    }
  }, [mounted, isLoading, user, router])

  // Показуємо Loading до маунту або під час Loading користувача
  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  // Якщо немає користувача після маунту, проверяем клиентскую авторизацию
  const clientAuthed = typeof window !== 'undefined' ? localStorage.getItem('client_authed') : null
  if (!user && !clientAuthed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>}>
    <div className="min-h-[100dvh] bg-background flex">
      <AppSidebar />

      {/* Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader />

        {/* Main Content Area */}
        <div className="flex-1 p-2 sm:p-4 lg:p-6 flex flex-col gap-3 sm:gap-4">
       
          
          {/* Chart and Trading Panel */}
          <div className="flex-1 flex flex-col lg:flex-row gap-3 sm:gap-4 lg:gap-6 overflow-hidden min-h-0">
            {/* KLine Chart Pro */}
            <div className="flex-1 min-w-0 overflow-hidden">
              <KLineChartProComponent 
                symbol={selectedSymbol}
                className="h-[clamp(260px,60dvh,560px)] lg:h-full w-full" 
                onSymbolChange={(s) => {
                  const newSymbol = s.shortName || s.ticker?.replace('C:','').replace('X:','').replace('-','/') || ''
                  console.log('📈 Chart symbol changed:', newSymbol)
                  // Сбрасываем цену синхронно с изменением символа, чтобы не мигала старая цена
                  setSelectedSymbol(newSymbol)
                  setCurrentPrice(0)
                }}
                onPriceUpdate={({ symbol, price }) => {
                  // ✅ КРИТИЧЕСКИ ВАЖНО: Обновляем цену только для текущего выбранного символа
                  // Нормализуем оба символа для сравнения (убираем префиксы, слэши, дефисы)
                  const normalizeSymbol = (s: string) => s?.toUpperCase().replace(/^[XC]:/,'').replace(/[-/]/g,'').trim()
                  
                  const incomingSymbol = normalizeSymbol(symbol?.shortName || symbol?.ticker || '')
                  const currentSymbol = normalizeSymbol(selectedSymbolRef.current)
                  
                  console.log('📊 Price update:', {
                    incomingSymbol,
                    currentSymbol,
                    price,
                    match: incomingSymbol === currentSymbol,
                    symbolObj: symbol
                  })
                  
                  // Обновляем цену только если символ совпадает
                  if (incomingSymbol && currentSymbol && incomingSymbol === currentSymbol) {
                    setCurrentPrice(price)
                    // Рассылаем событие и сохраняем mark только для актуального символа
                    try {
                      const key = (symbol?.shortName || symbol?.ticker || '')
                        .replace(/^X:/,'')
                        .replace(/^C:/,'')
                        .replace('-','')
                        .replace('/','')
                      if (key) {
                        window.dispatchEvent(new CustomEvent('price:update', { detail: { symbol: key, price } }))
                        fetch(`/api/v1/prices/${encodeURIComponent(key)}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ price }) })
                      }
                    } catch {}
                  } else if (incomingSymbol && incomingSymbol.length > 0) {
                    // ✅ Если пользователь сменил символ внутри графика,
                    // синхронизируем выбранный символ приложения и цену панели
                    const formatted =
                      symbol?.shortName ||
                      (symbol?.ticker || '')
                        .replace(/^X:/, '')
                        .replace(/^C:/, '')
                        .replace('-', '/')
                    if (formatted && formatted !== selectedSymbol) {
                      setSelectedSymbol(formatted)
                      setCurrentPrice(price)
                      selectedSymbolRef.current = formatted
                      // Также отправим событие/кеш для нового символа
                      try {
                        const key = formatted.replace('/','')
                        window.dispatchEvent(new CustomEvent('price:update', { detail: { symbol: key, price } }))
                        fetch(`/api/v1/prices/${encodeURIComponent(key)}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ price }) })
                      } catch {}
                    }
                  }
                }}
              />
            </div>
            
            {/* Trading Panel and Pairs List */}
            <div className="w-full lg:w-64 xl:w-72 2xl:w-80 lg:flex-shrink-0 flex flex-col gap-2 sm:gap-3 min-h-0 overflow-hidden">
              <TradingPanel 
                key={selectedSymbol}
                symbol={selectedSymbol}
                currentPrice={currentPrice}
                className="flex-shrink-0 w-full"
              />
              <div className="flex-1 min-h-0 overflow-hidden w-full">
                <PairsList onSelect={(s)=> {
                  console.log('🎯 PairsList selected:', s)
                  // Сбрасываем цену сразу при выборе пары
                  setSelectedSymbol(s)
                  setCurrentPrice(0)
                }} />
              </div>
            </div>
          </div>
          
          {/* Open Positions (bottom) */}
          <div className="flex-shrink-0 w-full">
            <PositionsAccordion />
          </div>
        </div>
      </div>
    </div>
    </Suspense>
  )
}

function SidebarItem() { return null }