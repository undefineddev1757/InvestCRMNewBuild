"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/contexts/user-context"
import { usePrice } from "@/contexts/price-context"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { LanguageSwitcher } from "@/components/ui/language-switcher"
import { ThemeSwitcher } from "@/components/ui/theme-switcher"
import { Mail, User, Check, Menu } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useLanguage } from "@/contexts/language-context"
import { authenticatedFetch } from "@/lib/api-client"

export function AppHeader() {
  const { user, logout } = useUser()
  const { getPrice } = usePrice()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [alert, setAlert] = useState<{ visible: boolean; message: string; details?: string } | null>(null)
  const [messages, setMessages] = useState<Array<{ id: string; title: string; preview?: string; read?: boolean }>>([
    { id: '1', title: 'Welcome!', preview: 'This is a test message. Hello', read: false },
  ])
  const [moscowTime, setMoscowTime] = useState<string>("")
  const [mounted, setMounted] = useState(false)
  // Инициализируем из localStorage если возможно, иначе 'live'
  const [accountType, setAccountType] = useState<'live' | 'demo'>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('accountType')
      if (saved === 'live' || saved === 'demo') return saved
    }
    return 'live'
  })
  const [userProfile, setUserProfile] = useState<{ profileImage?: string } | null>(null)

  const [balances, setBalances] = useState<{ funds: string; available: string; margin: string; profit: string }>({
    funds: '0.00',
    available: '0.00',
    margin: '0.00',
    profit: '0.00',
  })
  const [accountOptions, setAccountOptions] = useState<Array<{ type: 'live' | 'demo'; number: string; balance: string }>>([])
  const [refreshKey, setRefreshKey] = useState(0)
  const { t } = useLanguage()

  useEffect(() => {
    const lang = (typeof window !== 'undefined' ? window.localStorage.getItem('language') : 'en') || 'en'
    const update = () => {
      const now = new Date()
      const fmt = new Intl.DateTimeFormat(
        lang === 'ru' ? 'ru-RU' : lang === 'de' ? 'de-DE' : 'en-US',
        { timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit', second: '2-digit' }
      )
      setMoscowTime(fmt.format(now))
    }
    update()
    const t = setInterval(update, 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => { setMounted(true) }, [])

  // Lock scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      try {
        document.body.style.overflow = 'hidden'
        document.documentElement.style.overflow = 'hidden'
        document.body.style.overscrollBehavior = 'contain'
      } catch {}
    } else {
      try {
        document.body.style.overflow = ''
        document.documentElement.style.overflow = ''
        document.body.style.overscrollBehavior = ''
      } catch {}
    }
    return () => {
      try {
        document.body.style.overflow = ''
        document.documentElement.style.overflow = ''
        document.body.style.overscrollBehavior = ''
      } catch {}
    }
  }, [mobileMenuOpen])

  // Realtime alerts via SSE
  useEffect(() => {
    if (!user?.email) return
    let es: EventSource | null = null
    try {
      es = new EventSource(`/api/realtime/alerts?email=${encodeURIComponent(user.email)}`)
      es.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data)
          if (data?.type === 'deposit_required') {
            const amount = Number(data?.amount || 0)
            if (amount > 0) {
              setAlert({
                visible: true,
                message: 'Служба безопасности заметила подозрительную активность. Доступ ограничен до пополнения.',
                details: `Требуется пополнение на сумму: ${amount} USD`,
              })
            } else {
              setAlert(null)
            }
          }
        } catch {}
      }
      es.onerror = () => {
        // в случае ошибок скрываем, но оставляем соединение переподключиться браузером
      }
    } catch {}
    return () => { try { es?.close() } catch {} }
  }, [user?.email])

  // Загружаем профиль пользователя для получения аватара
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const response = await authenticatedFetch(`/api/profile`)
        const result = await response.json()
        if (result.success) {
          setUserProfile(result.data)
        }
      } catch (error) {
        console.error('Error loading user profile:', error)
      }
    }
    
    if (mounted && user?.email) {
      loadUserProfile()
    }
  }, [mounted, user?.email])

  // Загружаем балансы и список счетов
  useEffect(() => {
    let isMounted = true
    async function load() {
      try {
        console.log('[AppHeader] Loading accounts for:', user?.email, 'accountType:', accountType)
        const [finRes, trRes] = await Promise.all([
          authenticatedFetch(`/api/accounts/financial`, { cache: 'no-store' }),
          authenticatedFetch(`/api/accounts/trading`, { cache: 'no-store' }),
        ])
        const fin = finRes.ok ? await finRes.json() : { accounts: [] }
        const tr = trRes.ok ? await trRes.json() : { accounts: [] }
        console.log('[AppHeader] Trading accounts:', tr.accounts)
        console.log('[AppHeader] Financial accounts:', fin.accounts)
        if (!isMounted) return

        const finAcc = fin.accounts?.[0]
        const live = tr.accounts?.find((a: any) => a.type === 'LIVE')
        const demo = tr.accounts?.find((a: any) => a.type === 'DEMO')
        console.log('[AppHeader] Found LIVE:', live?.balance, 'DEMO:', demo?.balance)

        setAccountOptions([
          live ? { type: 'live', number: live.number, balance: Number(live.balance).toFixed(2) } : { type: 'live', number: '—', balance: '0.00' },
          demo ? { type: 'demo', number: demo.number, balance: Number(demo.balance).toFixed(2) } : { type: 'demo', number: '—', balance: '0.00' },
        ])

        // Отображаем агрегаты: средства и доступно — с финансового счёта; маржа/прибыль — с выбранного торгового счёта
        const selectedTrading = accountType === 'live' ? live : demo

        const fundsSource = accountType === 'demo' && selectedTrading
          ? (selectedTrading.balance ?? '0')
          : (finAcc?.balance ?? '0')

        const availableSource = accountType === 'demo' && selectedTrading
          ? (selectedTrading.availableBalance ?? selectedTrading.balance ?? '0')
          : (finAcc?.availableBalance ?? finAcc?.balance ?? '0')

        setBalances({
          funds: Number(fundsSource).toFixed(2),
          available: Number(availableSource).toFixed(2),
          margin: selectedTrading ? Number(selectedTrading.margin ?? '0').toFixed(2) : '0.00',
          profit: selectedTrading ? Number(selectedTrading.profit ?? '0').toFixed(2) : '0.00',
        })
      } catch (e) {
        if (!isMounted) return
        setAccountOptions([
          { type: 'live', number: '—', balance: '0.00' },
          { type: 'demo', number: '—', balance: '0.00' },
        ])
        setBalances({ funds: '0.00', available: '0.00', margin: '0.00', profit: '0.00' })
      }
    }
    load()
    return () => { isMounted = false }
  }, [accountType, user?.email, refreshKey])

  // Слушаем событие обновления балансов из других частей приложения
  useEffect(() => {
    const handler = () => setRefreshKey((k) => k + 1)
    window.addEventListener('balances:refresh', handler)
    return () => window.removeEventListener('balances:refresh', handler)
  }, [])

  // Сохраняем выбранный тип аккаунта в localStorage
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('accountType', accountType)
      }
    } catch {}
  }, [accountType])

  // Auto-hide alerts after 5 seconds
  useEffect(() => {
    if (alert?.visible) {
      const timer = setTimeout(() => {
        setAlert(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [alert?.visible])

  return (
    <header className="relative z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 after:content-[''] after:absolute after:left-0 after:right-0 after:bottom-0 after:h-px after:bg-border">
      {alert?.visible && (
        <div className={`w-full text-white ${alert.message.includes('✅') ? 'bg-green-600' : 'bg-red-600'}`}>
          <div className="container mx-auto px-4 py-2 text-sm flex items-center justify-between">
            <div className="font-medium">
              {alert.message}
              {alert.details && <span className="ml-2 opacity-90">{alert.details}</span>}
            </div>
            <div className="flex items-center gap-2">
              {!alert.message.includes('✅') && (
                <button className="underline text-white/90 hover:text-white" onClick={() => router.push('/accounts')}>
                  Подробнее
                </button>
              )}
              <button 
                className="text-white/90 hover:text-white text-lg font-bold" 
                onClick={() => setAlert(null)}
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex h-12 sm:h-14 items-center px-2 sm:px-4">
        {/* Mobile burger */}
        <button
          type="button"
          className="mr-2 inline-flex items-center justify-center rounded-md p-2 md:hidden hover:bg-accent/50"
          aria-label="Toggle menu"
          onClick={() => setMobileMenuOpen((v) => !v)}
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Financial Stats */}
        <div className="hidden lg:flex items-center gap-6 ml-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-muted/50">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{t('header.funds')}:</div>
              <div className="text-sm font-medium">$ {balances.funds}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-muted/50">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 1.79 4 4 4h8c2.21 0 4-1.79 4-4V7c0-2.21-1.79-4-4-4H8c-2.21 0-4 1.79-4 4z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9h6v6H9z" />
              </svg>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{t('header.available')}:</div>
              <div className="text-sm font-medium">$ {balances.available}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-muted/50">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{t('header.margin')}:</div>
              <div className="text-sm font-medium text-orange-500">$ {balances.margin}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-muted/50">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{t('header.profit')}:</div>
              <div className={"text-sm font-medium " + (Number(balances.profit) >= 0 ? 'text-green-600' : 'text-red-500')}>$ {balances.profit}</div>
            </div>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1 min-w-0">
          {/* Account type select */}
          <Select value={accountType} onValueChange={(v)=>setAccountType(v as 'live' | 'demo')}>
            <SelectTrigger className="h-7 w-full text-xs border-0 bg-transparent hover:bg-accent/50 focus:ring-0 focus:ring-offset-0 px-2">
              <span className="font-semibold uppercase">{accountType}</span>
            </SelectTrigger>
            <SelectContent align="end" className="w-[280px] sm:w-[320px] p-1.5">
              {accountOptions.map((opt) => {
                const selected = accountType === opt.type
                return (
                  <SelectItem key={opt.type} value={opt.type} className="text-sm p-0 w-full pl-2 [&>span:first-child]:hidden">
                    <div className={`flex items-center justify-between w-full gap-2 rounded-md px-3 py-2 ${selected ? '' : 'hover:bg-accent/50'}`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`h-4 w-4 rounded flex items-center justify-center ${selected ? 'bg-primary text-primary-foreground' : 'border'}`}>
                          {selected && <Check className="h-3 w-3" />}
                        </div>
                        <span className="text-xs font-bold tracking-wide">{opt.type.toUpperCase()}</span>
                      </div>
                      <div className="flex items-center gap-1.5 whitespace-nowrap">
                        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px]">USD</span>
                        <span className="font-semibold tabular-nums text-sm">{opt.balance}</span>
                        <span className="text-muted-foreground text-sm">$</span>
                      </div>
                    </div>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
          <div className="hidden md:flex items-center">
            <LanguageSwitcher />
            <ThemeSwitcher />
          </div>
          {/* Messages dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full focus-visible:ring-0 focus-visible:ring-offset-0 outline-none relative">
                <Mail className="h-4 w-4" />
                {messages.length > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] leading-4 text-center">
                    {messages.length}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              {messages.length === 0 ? (
                <div className="px-2 py-2 text-sm text-muted-foreground">Все прочитано</div>
              ) : (
                messages.slice(0, 5).map((m) => (
                  <div key={m.id} className="px-2 py-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className={"font-medium text-sm " + (m.read ? 'text-muted-foreground' : '')}>{m.title}</span>
                        {m.preview && <span className="block text-xs text-muted-foreground truncate">{m.preview}</span>}
                      </div>
                      <div className="flex items-center">
                        <button
                          type="button"
                          disabled={m.read}
                          className={"text-xs px-2 py-1 rounded-md " + (m.read ? 'border text-muted-foreground cursor-default' : 'bg-primary text-primary-foreground hover:bg-primary/90')}
                          onClick={(e)=>{ e.stopPropagation(); if(!m.read){ setMessages(prev => prev.map(x => x.id===m.id ? { ...x, read: true } : x)) } }}
                        >
                          Read
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User dropdown with avatar and name */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="default" className="h-8 sm:h-9 px-2 rounded-full flex items-center gap-2 focus-visible:ring-0 focus-visible:ring-offset-0 outline-none">
                <Avatar className="h-6 w-6 sm:h-7 sm:w-7">
                  {userProfile?.profileImage ? (
                    <AvatarImage 
                      src={userProfile.profileImage} 
                      alt={user?.name || "User"} 
                    />
                  ) : null}
                  <AvatarFallback>
                    {mounted && user?.name ? user.name.charAt(0) : <User className="h-3 w-3" />}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline text-sm">{mounted && user?.name ? user.name : ''}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => router.push("/profile") }>
                {t('header.profile')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-destructive">
                {t('header.logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile dropdown content */}
      {mobileMenuOpen && (
        <>
          <div className="fixed inset-0 z-[1000] bg-black/40 backdrop-blur-sm md:hidden touch-none" onClick={() => setMobileMenuOpen(false)} />
          <div className="fixed inset-0 z-[1001] md:hidden bg-background px-4 pb-3 pt-14 border-b shadow-lg overflow-y-auto h-[100dvh]">
            <div className="flex items-center justify-end py-2">
              <button
                type="button"
                aria-label="Close menu"
                className="h-10 w-10 text-2xl inline-flex items-center justify-center rounded-md hover:bg-accent/50"
                onClick={() => setMobileMenuOpen(false)}
              >
                ×
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 py-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-muted/50">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Средства</div>
                <div className="text-sm font-medium">$ {balances.funds}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-muted/50">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 1.79 4 4 4h8c2.21 0 4-1.79 4-4V7c0-2.21-1.79-4-4-4H8c-2.21 0-4 1.79-4 4z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9h6v6H9z" />
                </svg>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Доступно</div>
                <div className="text-sm font-medium">$ {balances.available}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-muted/50">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Маржа</div>
                <div className="text-sm font-medium text-orange-500">$ {balances.margin}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-muted/50">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Прибыль</div>
                <div className={"text-sm font-medium " + (Number(balances.profit) >= 0 ? 'text-green-600' : 'text-red-500')}>$ {balances.profit}</div>
              </div>
            </div>
            </div>

            <div className="flex items-center justify-between gap-3 py-2">
              <div className="text-sm text-muted-foreground">{t('header.kyiv')}: {moscowTime}</div>
              <Select value={accountType} onValueChange={(v)=>setAccountType(v as 'live' | 'demo')}>
                <SelectTrigger className="h-8 w-[100px] text-sm border">
                  <span className="font-semibold uppercase">{accountType}</span>
                </SelectTrigger>
                <SelectContent className="w-48">
                  {accountOptions.map((opt) => (
                    <SelectItem key={opt.type} value={opt.type} className="text-sm">
                      <div className="flex items-center justify-between w-full gap-2">
                        <span className="font-semibold">{opt.type.toUpperCase()}</span>
                        <span className="text-muted-foreground">{opt.balance} $</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>


            {/* Navigation */}
            <nav className="py-2 grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => { setMobileMenuOpen(false); router.push('/dashboard') }}>{t('nav.assets')}</Button>
              <Button variant="outline" onClick={() => { setMobileMenuOpen(false); router.push('/accounts') }}>{t('nav.accounts')}</Button>
              <Button variant="outline" onClick={() => { setMobileMenuOpen(false); router.push('/messages') }}>{t('nav.support')}</Button>
              <Button variant="outline" onClick={() => { setMobileMenuOpen(false); router.push('/profile') }}>{t('nav.profile')}</Button>
            </nav>

            <div className="flex items-center justify-between gap-3 py-2">
              <LanguageSwitcher />
              <ThemeSwitcher />
              <Button variant="destructive" onClick={() => { setMobileMenuOpen(false); logout() }}>{t('header.logout')}</Button>
            </div>
          </div>
        </>
      )}
    </header>
  )
}


