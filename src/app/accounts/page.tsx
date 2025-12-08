"use client"

import { useEffect, useMemo, useState } from "react"
import { useUser } from "@/contexts/user-context"
import { AppHeader } from "@/components/app-header"
import { AppSidebar } from "@/components/app-sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { useLanguage } from "@/contexts/language-context"
import { authenticatedFetch } from "@/lib/api-client"

type TabKey = "accounts" | "deposit" | "transfer" | "history"

export default function AccountsPage() {
  const { user } = useUser()
  const [activeTab, setActiveTab] = useState<TabKey>("accounts")
  const { t } = useLanguage()
  useEffect(() => {
    let cancelled = false
    async function checkRedirect() {
      try {
        if (!user?.email) return
        const res = await authenticatedFetch(`/api/client/me`, { cache: 'no-store' })
        if (!res.ok) return
        const j = await res.json()
        const raw = j?.client?.depositRequiredAmount
        const amount = Number(typeof raw === 'string' ? raw : raw ?? 0)
        if (!cancelled && amount > 0) setActiveTab('deposit')
      } catch {}
    }
    checkRedirect()
    return () => { cancelled = true }
  }, [user?.email])
  
  return (
    <div className="min-h-screen bg-background flex">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader />

        {/* Tabs */}
        <div className="border-b bg-background/95 w-full">
          <div className="container mx-auto px-4">
            <div className="flex items-center space-x-2 py-4">
              <nav className="flex items-center space-x-2">
                <TabButton label={t('accounts.tabs.accounts')} active={activeTab === "accounts"} onClick={() => setActiveTab("accounts")} />
                <TabButton label={t('accounts.tabs.deposit')} active={activeTab === "deposit"} onClick={() => setActiveTab("deposit")} />
                <TabButton label={t('accounts.tabs.transfer')} active={activeTab === "transfer"} onClick={() => setActiveTab("transfer")} />
                <TabButton label={t('accounts.tabs.history')} active={activeTab === "history"} onClick={() => setActiveTab("history")} />
              </nav>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto p-6 pt-8">
          {activeTab === "accounts" && <AccountsTab />}
          {activeTab === "deposit" && <DepositTab />}
          {activeTab === "transfer" && <TransferTab />}
          {activeTab === "history" && <HistoryTab />}
        </div>
      </div>
    </div>
  )
}

function TabButton({ label, active, onClick }: { label: string; active?: boolean; onClick?: () => void }) {
  return (
    <Button variant={active ? "default" : "ghost"} className="px-4" onClick={onClick}>
      {label}
    </Button>
  )
}

 function useAccountsData() {
  const { user } = useUser()
  const [loading, setLoading] = useState(true)
  const [finAccounts, setFinAccounts] = useState<Array<{ id: string; number: string; currency: string; balance: string }>>([])
  const [tradingAccounts, setTradingAccounts] = useState<Array<{ id: string; number: string; type: string; currency: string; balance: string }>>([])
  const [error, setError] = useState<string | null>(null)
  const [depositRequiredAmount, setDepositRequiredAmount] = useState<number>(0)

  useEffect(() => {
    let isMounted = true
    async function load() {
      try {
        setLoading(true)
        const [finRes, trRes, meRes] = await Promise.all([
          authenticatedFetch(`/api/accounts/financial`, { cache: "no-store" }),
          authenticatedFetch(`/api/accounts/trading`, { cache: "no-store" }),
          authenticatedFetch(`/api/client/me`, { cache: "no-store" }).catch(() => ({ ok: false } as any)),
        ])
        if (!finRes.ok) throw new Error("Не удалось получить финансовые счета")
        if (!trRes.ok) throw new Error("Не удалось получить торговые счета")
        const finJson = await finRes.json()
        const trJson = await trRes.json()
        let required = 0
        if (meRes && (meRes as any).ok) {
          const meJson = await (meRes as any).json()
          const raw = meJson?.client?.depositRequiredAmount
          const num = Number(typeof raw === 'string' ? raw : raw ?? 0)
          required = Number.isFinite(num) ? num : 0
        }
        if (isMounted) {
          setFinAccounts(finJson.accounts ?? [])
          // Сортируем: DEMO показываем первым, затем LIVE
          const t = (trJson.accounts ?? []) as Array<any>
          t.sort((a, b) => (a.type === 'DEMO' ? -1 : 1) - (b.type === 'DEMO' ? -1 : 1))
          setTradingAccounts(t as any)
          setError(null)
          setDepositRequiredAmount(required)
        }
      } catch (e: any) {
        if (isMounted) setError(e?.message ?? "Ошибка загрузки")
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    load()
    return () => { isMounted = false }
  }, [user?.email])

  return { loading, error, finAccounts, tradingAccounts, depositRequiredAmount }
}

function AccountsTab() {
  const { loading, error, finAccounts, tradingAccounts } = useAccountsData()
  const { t } = useLanguage()

  return (
    <div className="space-y-8">
      {/* Financial accounts */}
      <section>
        <h2 className="text-xl font-semibold mb-3">{t('accounts.financialAccounts')}</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {loading && (
            <div className="rounded-xl border bg-muted/30 p-4">{t('common.loading')}</div>
          )}
          {(error || (!loading && finAccounts.length === 0)) && (
            <div className="rounded-xl border bg-muted/30 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold">USD</div>
                  <div className="text-sm text-muted-foreground">№ —</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold">0.00 USD</div>
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                <Button variant="secondary" className="w-40">{t('accounts.transfer')}</Button>
                <Button className="w-40">{t('accounts.deposit')}</Button>
              </div>
            </div>
          )}
          {!loading && !error && finAccounts.slice(0, 1).map(acc => (
            <div key={acc.id} className="rounded-xl border bg-muted/30 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold">{acc.currency}</div>
                  <div className="text-sm text-muted-foreground">№ {acc.number}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold">{Number(acc.balance ?? 0).toFixed(2)} {acc.currency}</div>
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                <Button variant="secondary" className="w-40">{t('accounts.transfer')}</Button>
                <Button className="w-40">{t('accounts.deposit')}</Button>
              </div>
            </div>
          ))}

          {/* Other wallets placeholder as before */}
          <div className="rounded-xl border bg-muted/30 p-4">
            <div className="text-sm text-muted-foreground">{t('accounts.otherWallets')}</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
              {[
                { name: "USDT ERC-20", amount: "0.00" },
                { name: "BTC", amount: "0.000000" },
                { name: "ETH", amount: "0.000000" },
                { name: "TRX", amount: "0.000000" },
                { name: "LTC", amount: "0.000000" },
              ].map(w => (
                <div key={w.name} className="rounded-lg border bg-background p-3">
                  <div className="text-sm font-medium">{w.name}</div>
                  <div className="text-xs text-muted-foreground">{w.amount}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Trading accounts */}
      <section>
        <h2 className="text-xl font-semibold mb-3">{t('accounts.tradingAccounts')}</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {(error || (!loading && tradingAccounts.length === 0)) && (
            <>
              <div className="rounded-xl border bg-muted/30 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-semibold">{t('accounts.liveAccount')}</div>
                    <div className="text-sm text-muted-foreground">№ —</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold">0.00 USD</div>
                  </div>
                </div>
                <div className="mt-4 flex gap-3">
                  <Button variant="secondary" className="w-40">Transfer</Button>
                  <Button className="w-40">Deposit</Button>
                </div>
              </div>
              <div className="rounded-xl border bg-muted/30 p-4">
                <div className="flex items-center justify-between">
                  <div>
                  <div className="text-lg font-semibold">{t('accounts.demoAccount')}</div>
                    <div className="text-sm text-muted-foreground">№ —</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold">0.00 USD</div>
                  </div>
                </div>
                <div className="mt-4 flex gap-3">
                  <Button variant="secondary" className="w-40">Transfer</Button>
                  <Button className="w-40">Deposit</Button>
                </div>
              </div>
            </>
          )}
          {!loading && !error && tradingAccounts.map(acc => (
            <div key={acc.id} className="rounded-xl border bg-muted/30 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold">{acc.type === 'DEMO' ? t('accounts.demoAccount') : t('accounts.liveAccount')}</div>
                  <div className="text-sm text-muted-foreground">№ {acc.number}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold">{Number(acc.balance ?? 0).toFixed(2)} {acc.currency}</div>
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                <Button variant="secondary" className="w-40">{t('accounts.transfer')}</Button>
                <Button className="w-40">{t('accounts.deposit')}</Button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function useTransactionsData() {
  const { user } = useUser()
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<Array<any>>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.email) return
    
    let isMounted = true
    async function load() {
      try {
        setLoading(true)
        const res = await authenticatedFetch(`/api/transactions`, { cache: "no-store" })
        if (!res.ok) throw new Error("Не удалось получить историю операций")
        const json = await res.json()
        if (isMounted) {
          setTransactions(json.transactions ?? [])
          setError(null)
        }
      } catch (e: any) {
        if (isMounted) setError(e?.message ?? "Ошибка загрузки")
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    load()
    return () => { isMounted = false }
  }, [user?.email])

  return { loading, error, transactions }
}

function formatAmount(amount: string, currency: string) {
  const num = Number(amount)
  const isNegative = num < 0
  const sign = isNegative ? "- " : "+ "
  return { text: `${sign}${Math.abs(num).toFixed(2)} ${currency}`, isNegative }
}

function HistoryTab() {
  const { loading, error, transactions } = useTransactionsData()
  const { t } = useLanguage()

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">{t('accounts.history.title')}</h2>
      <p className="text-muted-foreground">
        {t('accounts.history.subtitle')}
      </p>

      <div className="rounded-lg border bg-card">
        <div className="grid grid-cols-4 gap-4 p-4 border-b font-medium text-sm">
          <div>{t('accounts.history.id')}</div>
          <div>{t('accounts.history.date')}</div>
          <div>{t('accounts.history.operation')}</div>
          <div className="text-right">{t('accounts.history.amount')}</div>
        </div>
        {loading && <div className="p-4 text-sm">{t('common.loading')}</div>}
        {error && <div className="p-4 text-sm text-destructive">{error}</div>}
        {!loading && !error && (
          <div className="divide-y">
            {transactions.map((t: any) => {
              const { text, isNegative } = formatAmount(t.amount, t.currency)
              const opText = t.description ?? t.type
              const dateStr = new Date(t.createdAt).toLocaleString()
              return (
                <div key={t.id} className="grid grid-cols-4 gap-4 p-4 text-sm">
                  <div className="text-muted-foreground">{t.id}</div>
                  <div className="text-muted-foreground">{dateStr}</div>
                  <div>{opText}</div>
                  <div className={`text-right font-medium ${isNegative ? 'text-red-500' : 'text-green-500'}`}>
                    {text}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Button variant="outline" className="w-full md:w-auto">
        {t('accounts.history.download')}
      </Button>
    </div>
  )
}

// Маппинг типов токенов на символы для получения цены
const tokenToSymbol: Record<string, string> = {
  'ETH': 'ETH/USD',
  'BTC': 'BTC/USD',
  'USDT_TRC20': 'USDT/USD',
  'USDT_ERC20': 'USDT/USD',
  'TRON': 'TRX/USD',
  'LTC': 'LTC/USD',
}

function DepositTab() {
  const { depositRequiredAmount } = useAccountsData()
  const { user } = useUser()
  const [amount, setAmount] = useState<string>('')
  const [selectedToken, setSelectedToken] = useState<string>('USDT_TRC20')
  const [tokenAmount, setTokenAmount] = useState<string>('')
  const [tokenPrice, setTokenPrice] = useState<number | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [ticketId, setTicketId] = useState<string | null>(null)
  const [walletAddress, setWalletAddress] = useState<string>('')
  const [walletType, setWalletType] = useState<string>('')
  const [currency, setCurrency] = useState<string>('')
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [status, setStatus] = useState<'PENDING' | 'COMPLETED' | 'EXPIRED' | 'FAILED' | null>(null)
  const [now, setNow] = useState<number>(Date.now())
  const { t } = useLanguage()

  // Получение курса токена
  useEffect(() => {
    if (!selectedToken || !tokenToSymbol[selectedToken]) return

    const symbol = tokenToSymbol[selectedToken]
    const fetchPrice = async () => {
      try {
        // Нормализуем символ для API (ETH/USD -> ETHUSD для Polygon)
        const normalizedSymbol = symbol.replace('/', '')
        const res = await fetch(`/api/v1/prices/${normalizedSymbol}`, { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          if (data.mark && Number.isFinite(data.mark) && data.mark > 0) {
            console.log(`✅ Token price fetched for ${selectedToken}:`, {
              symbol,
              normalizedSymbol,
              price: data.mark
            })
            setTokenPrice(data.mark)
          } else {
            console.warn(`⚠️ Invalid price for ${selectedToken}:`, data)
            // Fallback для TRON если цена не найдена
            if (selectedToken === 'TRON' || selectedToken === 'TRX') {
              console.log('🔄 Trying TRXUSD as fallback...')
              const fallbackRes = await fetch(`/api/v1/prices/TRXUSD`, { cache: 'no-store' })
              if (fallbackRes.ok) {
                const fallbackData = await fallbackRes.json()
                if (fallbackData.mark && Number.isFinite(fallbackData.mark) && fallbackData.mark > 0) {
                  setTokenPrice(fallbackData.mark)
                  return
                }
              }
            }
          }
        } else {
          console.error(`❌ Failed to fetch price for ${selectedToken}:`, res.status)
        }
      } catch (error) {
        console.error('Failed to fetch token price:', error)
      }
    }

    fetchPrice()
    // Обновляем цену каждые 30 секунд
    const interval = setInterval(fetchPrice, 30000)
    return () => clearInterval(interval)
  }, [selectedToken])

  // Определение точности для разных токенов
  const getTokenPrecision = (token: string): number => {
    switch (token.toUpperCase()) {
      case 'BTC':
        return 8
      case 'ETH':
        return 6
      case 'USDT_TRC20':
      case 'USDT_ERC20':
      case 'USDT':
        return 6
      case 'TRON':
      case 'TRX':
        return 6
      case 'LTC':
        return 8
      default:
        return 6
    }
  }

  // Расчет количества токена при изменении суммы USD или токена
  useEffect(() => {
    if (!amount || !tokenPrice) {
      setTokenAmount('')
      return
    }

    const usdAmount = Number(amount)
    if (!Number.isFinite(usdAmount) || usdAmount <= 0) {
      setTokenAmount('')
      return
    }

    const calculatedAmount = usdAmount / tokenPrice
    const precision = getTokenPrecision(selectedToken)
    // Убираем лишние нули в конце
    const formatted = calculatedAmount.toFixed(precision).replace(/\.?0+$/, '')
    setTokenAmount(formatted)
  }, [amount, tokenPrice, selectedToken])

  useEffect(() => {
    if (depositRequiredAmount && depositRequiredAmount > 0) {
      setAmount(String(depositRequiredAmount))
    }
  }, [depositRequiredAmount])

  useEffect(() => {
    if (!open || !expiresAt) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [open, expiresAt])

  const remainingMs = useMemo(() => {
    if (!expiresAt) return 0
    const expires = new Date(expiresAt).getTime()
    return Math.max(0, expires - now)
  }, [expiresAt, now])

  const remainingText = useMemo(() => {
    const total = Math.floor(remainingMs / 1000)
    const mm = String(Math.floor(total / 60)).padStart(2, '0')
    const ss = String(total % 60).padStart(2, '0')
    return `${mm}:${ss}`
  }, [remainingMs])

  // Периодическая проверка статуса тикета
  useEffect(() => {
    if (!open || !ticketId || status === 'COMPLETED' || status === 'EXPIRED' || status === 'FAILED') return

    const checkStatus = async () => {
      try {
        const res = await authenticatedFetch(`/api/deposit/${ticketId}`, { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          if (data.success && data.data) {
            setStatus(data.data.status)
            setExpiresAt(data.data.expiresAt)
            
            if (data.data.status === 'COMPLETED') {
              // Обновляем данные аккаунтов
              setTimeout(() => {
                window.location.reload()
              }, 2000) // Небольшая задержка для завершения обработки на сервере
            }
          }
        }
      } catch (error) {
        console.error('Failed to check deposit status:', error)
      }
    }

    // Проверяем сразу при создании тикета, затем каждые 10 секунд
    checkStatus()
    const intervalId = setInterval(checkStatus, 10000)
    return () => clearInterval(intervalId)
  }, [open, ticketId, status])

  const createDepositTicket = async () => {
    if (!amount || Number(amount) <= 0) {
      alert('Укажите сумму пополнения')
      return
    }

    setLoading(true)
    setOpen(true)
    
    try {
      // Получаем кошельки клиента
      const walletRes = await authenticatedFetch(`/api/client/wallet`, { cache: 'no-store' })
      if (!walletRes.ok) {
        throw new Error('Не удалось загрузить кошельки')
      }

      const walletData = await walletRes.json()
      let wallets: Array<any> = walletData?.wallets ?? []
      
      // Если кошельков нет, пытаемся создать их автоматически
      if (wallets.length === 0) {
        console.log('Кошельков не найдено, создаем новые...')
        const createWalletRes = await authenticatedFetch(`/api/client/wallet/create`, {
          method: 'POST',
          cache: 'no-store'
        })

        if (createWalletRes.ok) {
          const createWalletData = await createWalletRes.json()
          wallets = createWalletData?.wallets ?? []
          console.log('✅ Кошельки созданы:', wallets.length)
        } else {
          const errorData = await createWalletRes.json().catch(() => ({}))
          throw new Error(errorData.error || 'Не удалось создать кошелек. Обратитесь в поддержку.')
        }
      }
      
      // Ищем кошелек выбранного токена
      const wallet = wallets.find((w) => {
        const walletTypeUpper = (w.type || '').toUpperCase()
        const selectedTokenUpper = selectedToken.toUpperCase()
        return walletTypeUpper === selectedTokenUpper
      })

      if (!wallet) {
        throw new Error(`Кошелек для ${selectedToken} не найден. Обратитесь в поддержку.`)
      }

      // Создаем тикет пополнения
      // Передаем amount в токенах (например, 1 TRX вместо 1 USD)
      // Также передаем amountUSD для обновления баланса
      const amountUSD = Number(amount)   // amount в USD (исходная сумма)
      let amountToSend = amountUSD       // По умолчанию
      
      // Если есть цена токена, конвертируем USD в токены
      if (tokenPrice && tokenPrice > 0) {
        const calculatedAmount = amountUSD / tokenPrice
        // Округляем до нужной точности для токена
        const precision = getTokenPrecision(selectedToken)
        amountToSend = parseFloat(calculatedAmount.toFixed(precision))
      }

      console.log('📤 Sending deposit request:', {
        walletType: selectedToken,
        amountUSD,
        amountTokens: amountToSend,
        tokenPrice
      })

      const depositRes = await authenticatedFetch(`/api/deposit/create`, {
        method: 'POST',
        body: JSON.stringify({
          walletId: wallet.id,
          amount: amountToSend,    // Сумма в токенах (например, 1 для 1 TRX)
          amountUSD: amountUSD     // Сумма в USD для обновления баланса
        })
      })

      if (!depositRes.ok) {
        const errorData = await depositRes.json().catch(() => ({}))
        const errorMessage = errorData.error || errorData.details || 'Не удалось создать тикет пополнения'
        console.error('❌ Deposit ticket creation failed:', {
          status: depositRes.status,
          error: errorData
        })
        throw new Error(errorMessage)
      }

      const depositData = await depositRes.json()
      
      if (!depositData.success || !depositData.data) {
        throw new Error('Неверный ответ от сервера')
      }

      const ticket = depositData.data
      
      // Редирект на страницу оплаты с ticketId в URL
      window.location.href = `/deposit/${ticket.ticketId}`

    } catch (error: any) {
      console.error('Failed to create deposit ticket:', error)
      alert(error.message || 'Ошибка при создании тикета пополнения')
      setOpen(false)
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">{t('accounts.deposit.title')}</h2>
      <p className="text-muted-foreground">
        {t('accounts.deposit.subtitle')}
      </p>
      
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
        <div className="flex items-center gap-2 text-destructive">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <span className="font-medium">{t('accounts.deposit.notice')}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Сумма (USD)</Label>
          <div className="relative">
            <Input 
              type="number" 
              placeholder="0.00" 
              className="pr-12" 
              value={amount} 
              onChange={(e) => setAmount(e.target.value)} 
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              USD
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Токен</Label>
          <Select value={selectedToken} onValueChange={setSelectedToken}>
            <SelectTrigger>
              <SelectValue placeholder="Выберите токен" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USDT_TRC20">USDT (TRC20)</SelectItem>
              <SelectItem value="USDT_ERC20">USDT (ERC20)</SelectItem>
              <SelectItem value="ETH">ETH</SelectItem>
              <SelectItem value="BTC">BTC</SelectItem>
              <SelectItem value="TRON">TRON</SelectItem>
              <SelectItem value="LTC">LTC</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {amount && tokenPrice && tokenAmount && (
        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Вы получите:</span>
            <span className="text-lg font-semibold">
              {tokenAmount} {selectedToken}
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Курс: 1 {selectedToken} = ${tokenPrice.toFixed(2)}
          </div>
        </div>
      )}

      <Button className="w-full md:w-auto px-8" onClick={createDepositTicket} disabled={loading}>
        {loading ? 'Создание тикета...' : t('accounts.deposit.submit')}
      </Button>

      <Dialog open={open} onOpenChange={(isOpen) => {
        setOpen(isOpen)
        if (!isOpen) {
          // Сброс состояния при закрытии
          setTicketId(null)
          setWalletAddress('')
          setWalletType('')
          setCurrency('')
          setExpiresAt(null)
          setStatus(null)
        } else {
          // Сброс только статуса при открытии
          setStatus(null)
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Пополнение {selectedToken}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Создание тикета пополнения...</div>
            ) : status === 'COMPLETED' ? (
              <div className="text-center py-4 space-y-2">
                <div className="text-4xl mb-4">✅</div>
                <div className="text-lg font-semibold text-green-600">Средства получены!</div>
                <div className="text-sm text-muted-foreground">
                  Ваш баланс был обновлен. Тикет: {ticketId}
                </div>
              </div>
            ) : status === 'EXPIRED' ? (
              <div className="text-center py-4 space-y-2">
                <div className="text-4xl mb-4">⏰</div>
                <div className="text-lg font-semibold text-destructive">Время истекло</div>
                <div className="text-sm text-muted-foreground">
                  Создайте новый тикет пополнения
                </div>
              </div>
            ) : status === 'FAILED' ? (
              <div className="text-center py-4 space-y-2">
                <div className="text-4xl mb-4">❌</div>
                <div className="text-lg font-semibold text-destructive">Ошибка</div>
                <div className="text-sm text-muted-foreground">
                  Пополнение не удалось. Обратитесь в поддержку.
                </div>
              </div>
            ) : ticketId ? (
              <>
                <div className="text-sm text-muted-foreground">Пожалуйста отправьте</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <div className="text-xs text-muted-foreground mb-1">Сумма в USD</div>
                    <Input readOnly value={amount} className="w-full" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-muted-foreground mb-1">Сумма в {selectedToken}</div>
                    <div className="h-9 px-3 border rounded-md flex items-center bg-muted/40 font-mono">
                      <span className="font-semibold">{tokenAmount || '0'}</span>
                      <span className="ml-1 text-muted-foreground text-sm">{selectedToken}</span>
                    </div>
                  </div>
                  <div className="ml-auto text-sm font-semibold text-orange-600 whitespace-nowrap">
                    Осталось: {remainingText}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Адрес для пополнения</Label>
                  <div className="flex items-center gap-2">
                    <Input readOnly value={walletAddress} className="font-mono text-sm" />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (walletAddress) {
                          navigator.clipboard.writeText(walletAddress)
                          alert('Адрес скопирован!')
                        }
                      }}
                    >
                      Копировать
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>Отправляйте только <strong>{selectedToken}</strong> на этот адрес.</div>
                    <div>Зачисление произойдет после подтверждения сети (обычно 1-3 минуты).</div>
                    <div>Тикет: <span className="font-mono">{ticketId}</span></div>
                  </div>
                </div>

                <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-3 text-sm text-blue-900 dark:text-blue-100">
                  <div className="font-semibold mb-1">📌 Важно:</div>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Отправляйте точно: <strong>{tokenAmount} {selectedToken}</strong> (≈ ${amount} USD)</li>
                    <li>Используйте только указанную сеть: <strong>{selectedToken}</strong></li>
                    <li>Тикет действителен до: {expiresAt ? new Date(expiresAt).toLocaleString('ru-RU') : ''}</li>
                    <li>Статус проверяется автоматически каждые 10 секунд</li>
                  </ul>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">Загрузка...</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function TransferTab() {
  const { t } = useLanguage()
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">{t('accounts.transfer.title')}</h2>
      <p className="text-muted-foreground">
        {/* keeping description minimal; can be localized later if needed */}
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-lg bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-200 dark:border-blue-800 p-6">
          <h3 className="font-semibold mb-4">{t('accounts.transfer.from')}</h3>
          <div className="rounded-lg bg-background border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                  <span className="text-white font-bold text-xs">USD</span>
                </div>
                <div>
                  <div className="font-medium">USD</div>
                  <div className="text-sm text-muted-foreground">0.00</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">LIVE: 485506</div>
                <Button variant="ghost" size="sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-gradient-to-r from-green-500/20 to-blue-500/20 border border-green-200 dark:border-green-800 p-6">
          <h3 className="font-semibold mb-4">{t('accounts.transfer.to')}</h3>
          <div className="rounded-lg bg-background border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">$</span>
                </div>
                <div>
                  <div className="font-medium">USD</div>
                  <div className="text-sm text-muted-foreground">1000.00</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Finance: 456484</div>
                <Button variant="ghost" size="sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>{t('accounts.transfer.amount')}</Label>
          <div className="relative">
            <Input type="number" placeholder="0.00" className="pr-12" />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              USD
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t('accounts.transfer.creditAmount')}</Label>
          <div className="relative">
            <Input type="number" placeholder="0.00" className="pr-12" />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              USD
            </div>
          </div>
        </div>
      </div>

      <Button className="w-full md:w-auto px-8">
        {t('accounts.transfer.submit')}
      </Button>
    </div>
  )
}