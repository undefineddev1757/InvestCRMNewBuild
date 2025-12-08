"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useUser } from "@/contexts/user-context"
import { AppHeader } from "@/components/app-header"
import { AppSidebar } from "@/components/app-sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Clock, Copy, CheckCircle2, AlertCircle, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/toast"
import { useLanguage } from "@/contexts/language-context"
import { authenticatedFetch } from "@/lib/api-client"

interface DepositTicket {
  ticketId: string
  walletAddress: string
  walletType: string
  expectedAmount: number
  receivedAmount: number | null
  currency: string
  status: 'PENDING' | 'COMPLETED' | 'EXPIRED' | 'FAILED'
  receivingTxId: string | null
  expiresAt: string
  createdAt: string
}

export default function DepositPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useUser()
  const { addToast } = useToast()
  const { t } = useLanguage()
  const ticketId = params?.ticketId as string

  const [ticket, setTicket] = useState<DepositTicket | null>(null)
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState<number>(Date.now())

  // Загрузка тикета
  useEffect(() => {
    if (!ticketId || !user?.email) return

    const loadTicket = async () => {
      try {
        setLoading(true)
        const res = await authenticatedFetch(`/api/deposit/${ticketId}`, { cache: 'no-store' })
        
        if (!res.ok) {
          if (res.status === 404) {
            router.push('/accounts?tab=deposit')
            return
          }
          throw new Error('Failed to load ticket')
        }

        const data = await res.json()
        if (data.success && data.data) {
          setTicket(data.data)
        }
      } catch (error) {
        console.error('Failed to load deposit ticket:', error)
      } finally {
        setLoading(false)
      }
    }

    loadTicket()
  }, [ticketId, user?.email, router])

  // Таймер обратного отсчета
  useEffect(() => {
    if (!ticket?.expiresAt) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [ticket?.expiresAt])

  // Периодическая проверка статуса
  useEffect(() => {
    if (!ticketId || !user?.email || !ticket || ticket.status !== 'PENDING') return

    const checkStatus = async () => {
      try {
        const res = await authenticatedFetch(`/api/deposit/${ticketId}`, { cache: 'no-store' })
        
        if (res.ok) {
          const data = await res.json()
          if (data.success && data.data) {
            setTicket(data.data)
            
            if (data.data.status === 'COMPLETED') {
              setTimeout(() => {
                router.push('/accounts?tab=deposit')
              }, 3000)
            }
          }
        }
      } catch (error) {
        console.error('Failed to check deposit status:', error)
      }
    }

    checkStatus()
    const intervalId = setInterval(checkStatus, 10000)
    return () => clearInterval(intervalId)
  }, [ticketId, user?.email, ticket?.status, router])

  const remainingMs = useMemo(() => {
    if (!ticket?.expiresAt) return 0
    const expires = new Date(ticket.expiresAt).getTime()
    return Math.max(0, expires - now)
  }, [ticket?.expiresAt, now])

  const remainingText = useMemo(() => {
    const total = Math.floor(remainingMs / 1000)
    const mm = String(Math.floor(total / 60)).padStart(2, '0')
    const ss = String(total % 60).padStart(2, '0')
    return `${mm}:${ss}`
  }, [remainingMs])

  // Получение цены токена для пересчета
  const [tokenPrice, setTokenPrice] = useState<number | null>(null)

  useEffect(() => {
    if (!ticket?.walletType) return

    const tokenToSymbol: Record<string, string> = {
      'ETH': 'ETH/USD',
      'BTC': 'BTC/USD',
      'USDT_TRC20': 'USDT/USD',
      'USDT_ERC20': 'USDT/USD',
      'TRON': 'TRX/USD',
      'TRX': 'TRX/USD',
      'LTC': 'LTC/USD',
    }

    const symbol = tokenToSymbol[ticket.walletType] || 'USDT/USD'
    const normalizedSymbol = symbol.replace('/', '')

    const fetchPrice = async () => {
      try {
        const res = await fetch(`/api/v1/prices/${normalizedSymbol}`, { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          if (data.mark && Number.isFinite(data.mark) && data.mark > 0) {
            setTokenPrice(data.mark)
          } else {
            // Fallback для TRX если основной запрос не сработал
            if (ticket.walletType === 'TRON' || ticket.walletType === 'TRX') {
              const fallbackRes = await fetch(`/api/v1/prices/TRXUSD`, { cache: 'no-store' })
              if (fallbackRes.ok) {
                const fallbackData = await fallbackRes.json()
                if (fallbackData.mark && Number.isFinite(fallbackData.mark) && fallbackData.mark > 0) {
                  setTokenPrice(fallbackData.mark)
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch token price:', error)
      }
    }

    fetchPrice()
    const interval = setInterval(fetchPrice, 30000)
    return () => clearInterval(interval)
  }, [ticket?.walletType])

  // Определение точности для разных токенов
  const getTokenPrecision = (walletType: string): number => {
    switch (walletType.toUpperCase()) {
      case 'BTC': return 8
      case 'ETH': return 6
      case 'USDT_TRC20': case 'USDT_ERC20': case 'USDT': return 6
      case 'TRON': case 'TRX': return 6
      case 'LTC': return 8
      default: return 6
    }
  }

  // Расчет количества токена на основе реальной цены
  const tokenAmount = useMemo(() => {
    if (!ticket?.expectedAmount) return '0'
    if (!tokenPrice || tokenPrice <= 0) return '0'

    const usdAmount = Number(ticket.expectedAmount)
    if (!Number.isFinite(usdAmount) || usdAmount <= 0) return '0'

    const calculatedAmount = usdAmount / tokenPrice
    const precision = getTokenPrecision(ticket.walletType || '')
    const formatted = calculatedAmount.toFixed(precision).replace(/\.?0+$/, '')
    return formatted
  }, [ticket?.expectedAmount, ticket?.walletType, tokenPrice])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <AppHeader />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-muted-foreground">{t('depositTicket.loading')}</div>
          </div>
        </div>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-background flex">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <AppHeader />
          <div className="flex-1 flex items-center justify-center">
            <Card className="max-w-md">
              <CardHeader>
                <CardTitle>{t('depositTicket.notFound')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Button onClick={() => router.push('/accounts?tab=deposit')}>
                  {t('depositTicket.backToDeposit')}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader />
        
        <div className="container mx-auto p-6 pt-8 max-w-3xl">
          <Card className="border-2">
            <CardHeader className="space-y-1 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl">{t('depositTicket.title')} {ticket.walletType}</CardTitle>
                <Badge variant={ticket.status === 'COMPLETED' ? 'default' : ticket.status === 'PENDING' ? 'secondary' : 'destructive'}>
                  {ticket.status === 'COMPLETED' ? t('depositTicket.status.completed') : ticket.status === 'PENDING' ? t('depositTicket.status.pending') : t('depositTicket.status.expired')}
                </Badge>
              </div>
              <CardDescription>
                {t('depositTicket.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {ticket.status === 'COMPLETED' ? (
                <div className="text-center py-12 space-y-6">
                  <div className="flex justify-center">
                    <div className="rounded-full bg-green-100 dark:bg-green-950 p-6">
                      <CheckCircle2 className="h-16 w-16 text-green-600" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-semibold">{t('depositTicket.completed.title')}</h3>
                    <p className="text-muted-foreground">
                      {t('depositTicket.completed.description')}
                    </p>
                  </div>
                  {ticket.receivingTxId && (
                    <div className="bg-muted/50 rounded-lg p-4">
                      <p className="text-xs text-muted-foreground mb-1">{t('depositTicket.completed.txId')}</p>
                      <p className="text-sm font-mono break-all">{ticket.receivingTxId}</p>
                    </div>
                  )}
                  <Button onClick={() => router.push('/accounts?tab=deposit')} size="lg" className="mt-4">
                    {t('depositTicket.completed.backToAccounts')}
                  </Button>
                </div>
              ) : ticket.status === 'EXPIRED' ? (
                <div className="text-center py-12 space-y-6">
                  <div className="flex justify-center">
                    <div className="rounded-full bg-orange-100 dark:bg-orange-950 p-6">
                      <Clock className="h-16 w-16 text-orange-600" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-semibold">{t('depositTicket.expired.title')}</h3>
                    <p className="text-muted-foreground">
                      {t('depositTicket.expired.description')}
                    </p>
                  </div>
                  <Button onClick={() => router.push('/accounts?tab=deposit')} size="lg" className="mt-4">
                    {t('depositTicket.expired.createNew')}
                  </Button>
                </div>
              ) : ticket.status === 'FAILED' ? (
                <div className="text-center py-12 space-y-6">
                  <div className="flex justify-center">
                    <div className="rounded-full bg-red-100 dark:bg-red-950 p-6">
                      <XCircle className="h-16 w-16 text-red-600" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-semibold">{t('depositTicket.failed.title')}</h3>
                    <p className="text-muted-foreground">
                      {t('depositTicket.failed.description')}
                    </p>
                  </div>
                  <Button onClick={() => router.push('/accounts?tab=deposit')} size="lg" className="mt-4">
                    {t('depositTicket.backToDeposit')}
                  </Button>
                </div>
              ) : (
                <>
                  {/* Таймер */}
                  <Card className="border-orange-200 dark:border-orange-800 bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/50 dark:to-orange-900/20">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Clock className="h-5 w-5 text-orange-600" />
                          <span className="text-sm font-medium">{t('depositTicket.timeRemaining')}</span>
                        </div>
                        <span className="text-3xl font-bold text-orange-600 tabular-nums">{remainingText}</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Суммы */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">{t('depositTicket.amountInUSD')}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">${ticket.expectedAmount}</div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">{t('depositTicket.amountIn')} {ticket.walletType}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {tokenPrice && tokenPrice > 0 ? (
                          <div className="space-y-1">
                            <div className="text-2xl font-bold font-mono">{tokenAmount}</div>
                            <div className="text-xs text-muted-foreground">
                              {t('depositTicket.rate')}: 1 {ticket.walletType} = ${tokenPrice.toFixed(6)}
                            </div>
                          </div>
                        ) : (
                          <div className="text-muted-foreground">{t('depositTicket.loadingRate')}</div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Адрес для пополнения */}
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">{t('depositTicket.address')}</Label>
                    <div className="flex gap-2">
                      <Input 
                        readOnly 
                        value={ticket.walletAddress} 
                        className="font-mono text-sm bg-muted/50" 
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="shrink-0"
                        onClick={() => {
                          navigator.clipboard.writeText(ticket.walletAddress)
                          addToast({
                            type: 'success',
                            title: t('depositTicket.copied'),
                            duration: 2000
                          })
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Footer информация */}
                  <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                      <div className="space-y-1">
                        <p>{t('depositTicket.info.ticket')}: <span className="font-mono text-foreground">{ticket.ticketId}</span></p>
                        <p>{t('depositTicket.info.sendOnly')} {ticket.currency || ticket.walletType} {t('depositTicket.info.onThisAddress')}</p>
                        <p>{t('depositTicket.info.confirmation')}</p>
                        <p>{t('depositTicket.info.autoCheck')}</p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

