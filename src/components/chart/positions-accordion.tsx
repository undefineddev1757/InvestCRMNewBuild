"use client"

import { useEffect, useState, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { useUser } from '@/contexts/user-context'
import { usePrice } from '@/contexts/price-context'
import { useToast } from '@/components/ui/toast'
import { calcPnl, calcRoe } from '@/lib/trading'
import { useLanguage } from '@/contexts/language-context'
import { authenticatedFetch } from '@/lib/api-client'

interface ApiPosition {
  id: string
  symbolId: string
  side: 'LONG' | 'SHORT'
  qty: string | number
  entryPrice: string | number
  leverage: number
  status: 'OPEN' | 'CLOSED'
  mode?: 'ISOLATED' | 'CROSS'
  imLocked?: string | number
  liqPriceCached?: string | number | null
  createdAt: string
  updatedAt: string
  symbol?: { id: string; name: string }
}

export default function PositionsAccordion() {
  const { user } = useUser()
  const { getPrice } = usePrice()
  const { addToast } = useToast()
  const [open, setOpen] = useState(true)
  const [positions, setPositions] = useState<ApiPosition[]>([])
  const [loading, setLoading] = useState(false)
  const [prices, setPrices] = useState<Record<string, number>>({})
  const [closing, setClosing] = useState<Record<string, boolean>>({})
  const { t } = useLanguage()

  const load = useCallback(async () => {
    try {
      setLoading(true)
      
      // Проверяем авторизацию (как в Portfolio)
      const clientAuthed = localStorage.getItem('client_authed')
      
      if (!user?.email && !clientAuthed) {
        setPositions([])
        return
      }
      
      // Получаем email
      let email = user?.email
      if (!email && clientAuthed) {
        try {
          const clientData = JSON.parse(clientAuthed)
          email = clientData.email
        } catch (e) {
          // Ignore
        }
      }
      
      if (!email) {
        setPositions([])
        return
      }
      
      // Используем тот же API что и Portfolio с email параметром
      const qs = new URLSearchParams()
      qs.append('email', email)
      qs.append('status', 'OPEN')
      
      const res = await fetch(`/api/v1/positions/history?${qs}`, { 
        credentials: 'include',
        cache: 'no-store'
      })
      const data = await res.json()
      const openPositions = (data?.positions || []).filter((p: ApiPosition)=>p.status==='OPEN')
      setPositions(openPositions)
    } catch (error) {
      console.error('❌ Error loading positions:', error)
    } finally {
      setLoading(false)
    }
  }, [user?.email])

  useEffect(()=>{ load() }, [load])
  useEffect(()=>{
    const h = () => load()
    window.addEventListener('positions:changed', h as any)
    return ()=> window.removeEventListener('positions:changed', h as any)
  }, [load])

  // Обновление цен для открытых позиций (как в Portfolio)
  useEffect(() => {
    let timer: any
    const fetchPrices = async () => {
      const symbols = Array.from(new Set(positions.map(p => (p.symbol?.name || p.symbol?.id))))
      if (symbols.length === 0) return
      
      try {
        const entries = await Promise.all(symbols.map(async (s) => {
          try {
            const res = await fetch(`/api/v1/prices/${encodeURIComponent((s || '').toString())}`, { cache: 'no-store' })
            if (!res.ok) throw new Error('price fetch failed')
            const data = await res.json()
            return [s, Number(data?.mark ?? data?.last ?? 0)] as const
          } catch {
            return [s, 0] as const
          }
        }))
        setPrices(Object.fromEntries(entries.filter(([, price]) => price > 0)))
      } catch (e) {
        console.error('Error fetching prices:', e)
      }
      timer = setTimeout(fetchPrices, 5000)
    }
    
    if (positions.length > 0) fetchPrices()
    return () => clearTimeout(timer)
  }, [positions])

  // Считаем общую заблокированную маржу
  const totalMarginLocked = positions.reduce((sum, p) => {
    if (p.mode === 'ISOLATED' && p.imLocked) {
      return sum + Number(p.imLocked)
    }
    return sum
  }, 0)

  // Функция закрытия позиции
  const closePosition = async (positionId: string, symbolName: string, fallbackPrice: number) => {
    try {
      setClosing(prev => ({ ...prev, [positionId]: true }))
      
      // Загружаем свежую цену перед закрытием
      let currentPrice = fallbackPrice
      try {
        const priceRes = await fetch(`/api/v1/prices/${encodeURIComponent(symbolName)}`, { cache: 'no-store' })
        if (priceRes.ok) {
          const priceData = await priceRes.json()
          const freshPrice = Number(priceData?.mark ?? priceData?.last ?? 0)
          if (freshPrice > 0) {
            currentPrice = freshPrice
            console.log(`[CLOSE POSITION] Fetched fresh price for ${symbolName}:`, {
              fallbackPrice,
              freshPrice,
              mark: priceData?.mark,
              last: priceData?.last
            })
          }
        }
      } catch (e) {
        console.warn(`[CLOSE POSITION] Failed to fetch fresh price, using fallback:`, e)
        // Используем fallback
      }
      
      console.log(`[CLOSE POSITION] Closing position ${positionId} with price:`, {
        positionId,
        symbolName,
        price: currentPrice,
        fallbackPrice
      })
      
      const res = await authenticatedFetch(`/api/v1/positions/${positionId}/close`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ price: currentPrice })
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        console.error(`[CLOSE POSITION] Failed to close position ${positionId}:`, data)
        addToast({ 
          type: 'error', 
          title: 'Ошибка закрытия', 
          description: data?.message || 'Не удалось закрыть позицию' 
        })
        return
      }
      
      console.log(`[CLOSE POSITION] Successfully closed position ${positionId}:`, {
        realized_pnl: data?.realized_pnl,
        position: data?.position
      })
      
      addToast({ 
        type: 'success', 
        title: 'Позиция закрыта', 
        description: `PnL: ${data.realized_pnl ? '$' + Number(data.realized_pnl).toFixed(2) : 'N/A'}` 
      })
      
      // Оптимизация: просто удаляем позицию из списка вместо полной перезагрузки
      setPositions(prev => prev.filter(p => p.id !== positionId))
      
      // Отправляем событие для обновления других компонентов
      window.dispatchEvent(new Event('positions:changed'))
    } catch (error) {
      console.error('Error closing position:', error)
      addToast({ 
        type: 'error', 
        title: 'Ошибка сети', 
        description: 'Попробуйте позже' 
      })
    } finally {
      setClosing(prev => ({ ...prev, [positionId]: false }))
    }
  }

  return (
    <Card className="border rounded-md text-sm sm:text-base mt-2">
      <button className="w-full flex items-center justify-between px-3 py-2 text-sm" onClick={()=>setOpen(v=>!v)}>
        <span className="font-medium">{t('positions.openTrades')} ({positions.length})</span>
        <span className="text-muted-foreground">{open ? t('positions.collapse') : t('positions.expand')}</span>
      </button>
      {open && (
        <div className="p-3 space-y-2">
          {loading && <div className="text-center text-muted-foreground py-4">{t('common.loading')}</div>}
          {!loading && positions.length === 0 && (
            <div className="text-center text-muted-foreground py-4">{t('positions.noOpen')}</div>
          )}
          {!loading && positions.length > 0 && totalMarginLocked > 0 && (
            <div className="hidden sm:flex p-3 text-xs bg-muted/30 rounded items-center justify-between mb-2">
              <span className="text-muted-foreground">{t('positions.marginLocked')}:</span>
              <span className="font-semibold">${totalMarginLocked.toFixed(2)}</span>
            </div>
          )}
          {!loading && positions.length > 0 && (
            <Accordion type="multiple" className="w-full">
              {positions.map((p) => {
                const side = (typeof p.side === 'string' ? p.side.toUpperCase() : p.side) as 'LONG' | 'SHORT'
                const qty = Number(p.qty)
                const entry = Number(p.entryPrice)
                const liq = p.liqPriceCached == null ? null : Number(p.liqPriceCached)
                const symbolName = (p.symbol?.name || p.symbol?.id || '') as string
                
                // Рассчитываем текущий PnL
                let currentPnl = 0
                let currentRoe = 0
                const contextPrice = getPrice(String(symbolName))
                const apiPrice = prices[String(symbolName)]
                const mark = contextPrice || apiPrice || entry
                currentPnl = calcPnl(side === 'LONG' ? 'long' : 'short', entry, mark, qty)
                const im = Math.abs(qty * entry) / (p.leverage || 1)
                currentRoe = calcRoe(currentPnl, im)
                
                return (
                  <AccordionItem key={p.id} value={p.id} className="border rounded-lg mb-2">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full gap-2 pr-4">
                        <div className="flex items-center gap-2 sm:gap-4 flex-wrap text-left">
                          <div className="font-medium">{symbolName}</div>
                          <div className={`px-2 py-1 rounded text-xs ${side === 'LONG' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                            {side === 'LONG' ? t('portfolio.long') : t('portfolio.short')}
                          </div>
                          <div className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                            {t('portfolio.tradeOpen')}
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
                            <div className={`font-bold ${currentPnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              {currentPnl >= 0 ? '+' : ''}${currentPnl.toFixed(2)}
                            </div>
                            <div className={`text-sm ${currentRoe >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              {currentRoe >= 0 ? '+' : ''}{currentRoe.toFixed(2)}%
                            </div>
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-semibold text-lg">{t('positions.tradeDetails')}</h4>
                          <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded">
                            {t('positions.openPosition')}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">ID</span>
                              <span>{p.id.slice(-6)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">{t('positions.status')}:</span>
                              <span className="font-semibold text-green-600 dark:text-green-400">
                                OPEN
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">{t('positions.type')}:</span>
                              <span className={side === 'LONG' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                                {side === 'LONG' ? 'BUY' : 'SELL'}
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
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">{t('positions.mode')}:</span>
                              <span>{p.mode === 'ISOLATED' ? 'Isolated' : 'Cross'}</span>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">{t('positions.qty')}:</span>
                              <span>{qty.toFixed(4)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">{t('positions.createdAt')}:</span>
                              <span className="text-xs">{new Date(p.createdAt).toLocaleString('ru-RU')}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">{t('positions.updatedAt')}:</span>
                              <span className="text-xs">{new Date(p.updatedAt).toLocaleString('ru-RU')}</span>
                            </div>
                            {liq && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">{t('positions.liqPrice')}:</span>
                                <span>{liq.toFixed(5)}</span>
                              </div>
                            )}
                            {p.mode === 'ISOLATED' && p.imLocked && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">{t('positions.marginLocked')}:</span>
                                <span className="font-semibold">${Number(p.imLocked).toFixed(2)}</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">{t('positions.markPrice')}:</span>
                              <span>${mark.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="pt-2 border-t border-border">
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-muted-foreground">PnL:</span>
                            <div className="flex items-center space-x-2">
                              <span className={`text-lg font-bold ${currentPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {currentPnl >= 0 ? '+' : ''}${currentPnl.toFixed(2)}
                              </span>
                            </div>
              </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">ROE (%):</span>
                            <div className="flex items-center space-x-2">
                              <span className={`text-lg font-bold ${currentRoe >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {currentRoe >= 0 ? '+' : ''}{currentRoe.toFixed(2)}%
                              </span>
                            </div>
              </div>
                          
                          {/* Кнопка закрытия */}
                          <div className="mt-4 pt-4 border-t border-border">
                            <Button 
                              onClick={() => closePosition(p.id, symbolName, mark)}
                              disabled={closing[p.id]}
                              variant="destructive"
                              className="w-full"
                            >
                              {closing[p.id] ? t('positions.closing') : t('positions.closePosition')}
                            </Button>
              </div>
              </div>
            </div>
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
            </Accordion>
          )}
        </div>
      )}
    </Card>
  )
}


