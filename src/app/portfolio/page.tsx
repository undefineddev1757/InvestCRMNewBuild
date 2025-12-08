"use client"

import { useEffect, useState, useCallback } from 'react'
import { AppSidebar } from '@/components/app-sidebar'
import { AppHeader } from '@/components/app-header'
import { useUser } from '@/contexts/user-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { useToast } from '@/components/ui/toast'
import { usePrice } from '@/contexts/price-context'
import { calcPnl, calcRoe } from '@/lib/trading'
import { useLanguage } from '@/contexts/language-context'

interface PositionRow {
  id: string
  status: 'OPEN' | 'CLOSED'
  side: 'LONG' | 'SHORT'
  qty: string | number
  entryPrice: string | number
  leverage: number
  liqPriceCached?: string | number | null
  createdAt: string
  updatedAt: string
  symbol?: { id: string; name: string }
  realizedPnl?: number
}

export default function PortfolioPage() {
  const { user } = useUser()
  const { getPrice } = usePrice()
  const { addToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [positions, setPositions] = useState<PositionRow[]>([])
  const [prices, setPrices] = useState<Record<string, number>>({})
  const [status, setStatus] = useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL')
  const { t } = useLanguage()

  const load = useCallback(async () => {
    try {
      setLoading(true)
      console.log('Loading portfolio positions, user:', user)
      
      // Проверяем клиентскую авторизацию
      const clientAuthed = localStorage.getItem('client_authed')
      console.log('Client authed:', clientAuthed)
      
      if (!user?.email && !clientAuthed) {
        console.log('No user email and no client auth, skipping portfolio load')
        setPositions([])
        return
      }
      
      // Если есть пользователь, используем его email
      let email = user?.email
      if (!email && clientAuthed) {
        // Если нет пользователя, но есть клиентская авторизация, попробуем получить email из localStorage
        try {
          const clientData = JSON.parse(clientAuthed)
          email = clientData.email
          console.log('Using client email:', email)
        } catch (e) {
          console.error('Error parsing client data:', e)
        }
      }
      
      if (!email) {
        console.log('No email available, skipping portfolio load')
        setPositions([])
        return
      }
      
      const qs = new URLSearchParams()
      qs.append('email', email)
      if (status !== 'ALL') qs.append('status', status)
      
      console.log('Loading portfolio with query:', qs.toString())
      const res = await fetch(`/api/v1/positions/history?${qs}`, { credentials: 'include' })
      const data = await res.json()
      console.log('Portfolio response:', res.status, data)
      if (!res.ok) throw new Error(data?.message || 'Failed to load portfolio')
      setPositions(Array.isArray(data?.positions) ? data.positions : [])
    } catch (e: any) {
      console.error('Error loading portfolio:', e)
      addToast({ type: 'error', title: 'Ошибка загрузки портфолио', description: e?.message || 'Попробуйте позже' })
    } finally {
      setLoading(false)
    }
  }, [addToast, user?.email, status])

  useEffect(() => { load() }, [load])
  
  // Обновление цен для открытых позиций
  useEffect(() => {
    let timer: any
    const fetchPrices = async () => {
      const openPositions = positions.filter(p => p.status === 'OPEN')
      const symbols = Array.from(new Set(openPositions.map(p => (p.symbol?.name || p.symbol?.id))))
      if (symbols.length === 0) return
      
      try {
        const entries = await Promise.all(symbols.map(async (s) => {
          try {
            const res = await fetch(`/api/v1/prices/${encodeURIComponent((s || '').toString())}`, { cache: 'no-store' })
            if (!res.ok) throw new Error('price fetch failed')
            const data = await res.json()
            return [s, Number(data?.mark ?? data?.last ?? 0)] as const
          } catch {
            return [s, NaN] as const
          }
        }))
        
        const next: Record<string, number> = { ...prices }
        for (const [s, v] of entries) {
          if (!Number.isFinite(v) || v <= 0) continue
          next[String(s)] = v
        }
        setPrices(next)
      } catch {}
    }
    
    fetchPrices()
    timer = setInterval(fetchPrices, 60000) // Обновляем цены каждую минуту
    
    return () => {
      timer && clearInterval(timer)
    }
  }, [positions])

  // Статистика портфолио
  const openPositions = positions.filter(p => p.status === 'OPEN')
  const closedPositions = positions.filter(p => p.status === 'CLOSED')
  const totalRealizedPnl = closedPositions.reduce((sum, p) => sum + (p.realizedPnl || 0), 0)
  
  // Расчет unrealized PnL для открытых позиций
  const unrealizedPnl = openPositions.reduce((sum, p) => {
    const symbolName = (p.symbol?.name || p.symbol?.id || '') as string
    const contextPrice = getPrice(symbolName)
    const apiPrice = prices[String(symbolName)]
    const mark = contextPrice || apiPrice || Number(p.entryPrice)
    const pnl = calcPnl(p.side === 'LONG' ? 'long' : 'short', Number(p.entryPrice), mark, Number(p.qty))
    return sum + pnl
  }, 0)

  return (
    <div className="min-h-screen bg-background flex">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader />

        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">{t('portfolio.title')}</h1>
            <div className="flex items-center gap-2 text-sm">
              <button 
                className={`px-3 py-1 rounded-md border ${status==='ALL'?'bg-accent':''}`} 
                onClick={()=>setStatus('ALL')}
              >
                {t('portfolio.all')}
              </button>
              <button 
                className={`px-3 py-1 rounded-md border ${status==='OPEN'?'bg-accent':''}`} 
                onClick={()=>setStatus('OPEN')}
              >
                {t('portfolio.open')}
              </button>
              <button 
                className={`px-3 py-1 rounded-md border ${status==='CLOSED'?'bg-accent':''}`} 
                onClick={()=>setStatus('CLOSED')}
              >
                {t('portfolio.closed')}
              </button>
            </div>
          </div>

          {/* Статистика портфолио */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{t('portfolio.totalTrades')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{positions.length}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{t('portfolio.openCount')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{openPositions.length}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{t('portfolio.realizedPnl')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${totalRealizedPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {totalRealizedPnl >= 0 ? '+' : ''}${totalRealizedPnl.toFixed(2)}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{t('portfolio.unrealizedPnl')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${unrealizedPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {unrealizedPnl >= 0 ? '+' : ''}${unrealizedPnl.toFixed(2)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Список сделок */}
          <Card>
            <CardHeader>
              <CardTitle>{t('portfolio.trades')}</CardTitle>
            </CardHeader>
            <CardContent>
              {positions.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  {loading ? t('portfolio.loading') : t('portfolio.noDeals')}
                </div>
              ) : (
                <Accordion type="multiple" className="w-full">
                  {positions.map((p) => {
                    const side = (typeof p.side === 'string' ? p.side.toUpperCase() : p.side) as 'LONG' | 'SHORT'
                    const qty = Number(p.qty)
                    const entry = Number(p.entryPrice)
                    const liq = p.liqPriceCached == null ? null : Number(p.liqPriceCached)
                    const symbolName = p.symbol?.name || p.symbol?.id
                    
                    // Для открытых позиций рассчитываем текущий PnL
                    let currentPnl = 0
                    let currentRoe = 0
                    if (p.status === 'OPEN') {
                      const contextPrice = getPrice(String(symbolName))
                      const apiPrice = prices[String(symbolName)]
                      const mark = contextPrice || apiPrice || entry
                      currentPnl = calcPnl(side === 'LONG' ? 'long' : 'short', entry, mark, qty)
                      const im = Math.abs(qty * entry) / (p.leverage || 1)
                      currentRoe = calcRoe(currentPnl, im)
                    }
                    
                    return (
                      <AccordionItem key={p.id} value={p.id} className="border rounded-lg mb-2">
                        <AccordionTrigger className="px-4 py-3 hover:no-underline">
                          <div className="flex items-center justify-between w-full pr-4">
                            <div className="flex items-center space-x-4 text-left">
                              <div className="font-medium">{symbolName}</div>
                              <div className={`px-2 py-1 rounded text-xs ${side === 'LONG' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {side === 'LONG' ? t('portfolio.long') : t('portfolio.short')}
                              </div>
                              <div className={`px-2 py-1 rounded text-xs ${p.status === 'OPEN' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                                {p.status === 'OPEN' ? t('portfolio.tradeOpen') : t('portfolio.tradeClosed')}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {qty} @ {entry.toFixed(5)}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {p.leverage}x
                              </div>
                            </div>
                            <div className="flex items-center space-x-4">
                              <div className="text-right">
                                {p.status === 'OPEN' ? (
                                  <>
                                    <div className={`font-bold ${currentPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      {currentPnl >= 0 ? '+' : ''}${currentPnl.toFixed(2)}
                                    </div>
                                    <div className={`text-sm ${currentRoe >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      {currentRoe >= 0 ? '+' : ''}{currentRoe.toFixed(2)}%
                                    </div>
                                  </>
                                ) : (
                                  <div className={`font-bold ${(p.realizedPnl || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {(p.realizedPnl || 0) >= 0 ? '+' : ''}${(p.realizedPnl || 0).toFixed(2)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="font-semibold text-lg">{t('positions.tradeDetails')}</h4>
                              <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded">
                                {p.status === 'OPEN' ? t('positions.openPosition') : t('positions.closedPosition')}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div className="space-y-2">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">{t('positions.id')}:</span>
                                  <span>{p.id.slice(-6)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">{t('positions.status')}:</span>
                                  <span className={`font-semibold ${p.status === 'OPEN' ? 'text-green-600' : 'text-gray-600'}`}>
                                    {p.status}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">{t('positions.type')}:</span>
                                  <span className={side === 'LONG' ? 'text-green-600' : 'text-red-600'}>
                                    {side === 'LONG' ? t('trade.buy') : t('trade.sell')}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">{t('positions.entryPrice')}:</span>
                                  <span>USD {entry.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 5 })}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">{t('positions.leverage')}:</span>
                                  <span>{p.leverage}x</span>
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">{t('positions.qty')}:</span>
                                  <span>{qty}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">{t('positions.createdAt')}:</span>
                                  <span>{new Date(p.createdAt).toLocaleString('ru-RU')}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">{t('positions.updatedAt')}:</span>
                                  <span>{new Date(p.updatedAt).toLocaleString('ru-RU')}</span>
                                </div>
                                {liq && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">{t('positions.liqPrice')}:</span>
                                    <span>{liq.toFixed(5)}</span>
                                  </div>
                                )}
                                {p.status === 'CLOSED' && p.realizedPnl !== undefined && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">{t('portfolio.realizedPnl')}:</span>
                                    <span className={`font-bold ${p.realizedPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      {p.realizedPnl >= 0 ? '+' : ''}${p.realizedPnl.toFixed(2)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {p.status === 'OPEN' && (
                              <div className="pt-2 border-t border-border">
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">{t('positions.currentPnl')}:</span>
                                  <div className="flex items-center space-x-2">
                                    <span className={`text-lg font-bold ${currentPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                      {currentPnl >= 0 ? '+' : ''}${currentPnl.toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">{t('positions.roe')}:</span>
                                  <div className="flex items-center space-x-2">
                                    <span className={`text-lg font-bold ${currentRoe >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                      {currentRoe >= 0 ? '+' : ''}{currentRoe.toFixed(2)}%
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )
                  })}
                </Accordion>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
