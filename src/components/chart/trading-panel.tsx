"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Info, TrendingUp, TrendingDown, Lock } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { useUser } from '@/contexts/user-context'
import { useClientStatus } from '@/hooks/use-client-status'
import { calcNotional, calcInitialMargin, calcMaintenanceMargin, calcLiquidationPriceApprox } from '@/lib/trading'
import { useLanguage } from '@/contexts/language-context'
import { authenticatedFetch } from '@/lib/api-client'

interface TradingPanelProps {
  symbol?: string
  currentPrice?: number
  className?: string
}

export function TradingPanel({ symbol = "", currentPrice = 0, className }: TradingPanelProps) {
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy')
  const [leverage, setLeverage] = useState(1)
  const [volume, setVolume] = useState(1)
  const [mode, setMode] = useState<'isolated' | 'cross'>('isolated')
  const [submitting, setSubmitting] = useState(false)
  const [accessLevel, setAccessLevel] = useState<'BASE' | 'FULL'>('FULL') // По умолчанию полный доступ
  const [canCreateDeals, setCanCreateDeals] = useState(true)
  const [depositRequiredAmount, setDepositRequiredAmount] = useState<number>(0)
  const [symbolInfo, setSymbolInfo] = useState<any>(null)
  const { addToast } = useToast()
  const { user } = useUser()
  const { t } = useLanguage()
  
  // Проверка статуса клиента (блокировка, email верификация)
  useClientStatus()

  // ✅ Логируем изменения props
  useEffect(() => {
    console.log('🎲 TradingPanel props changed:', { symbol, currentPrice })
  }, [symbol, currentPrice])


  // Определяем доступные плечи с учетом символа и уровня доступа
  const getAvailableLeverages = () => {
    const baseOptions = [1, 5, 10, 20]
    
    // Если есть информация о символе, используем его ограничения
    if (symbolInfo?.allowedLeverages) {
      const symbolLeverages = Array.isArray(symbolInfo.allowedLeverages) 
        ? symbolInfo.allowedLeverages 
        : JSON.parse(symbolInfo.allowedLeverages || '[]')
      return baseOptions.filter(lev => symbolLeverages.includes(lev))
    }
    
    // Иначе используем базовые опции
    return baseOptions
  }
  
  const leverageOptions = getAvailableLeverages()
  
  // Улучшенный расчет маржи
  const notional = calcNotional(volume, currentPrice)
  const initialMargin = calcInitialMargin(notional, leverage)
  const maintenanceMargin = calcMaintenanceMargin(volume, currentPrice, 0.005) // 0.5% MMR
  
  // Ликвидационная цена (приблизительная)
  const liquidationPrice = calcLiquidationPriceApprox({
    side: tradeType === 'buy' ? 'long' : 'short',
    qty: volume,
    entryPrice: currentPrice,
    markPrice: currentPrice,
    leverage: leverage,
    mmr: 0.005,
    feeBuffer: 0.0005,
    mmrBuffer: 0.001
  })

  // Загрузка уровня доступа клиента и информации о символе
  useEffect(() => {
    const fetchAccessLevel = async () => {
      if (!user?.email) return
      
      try {
        const res = await authenticatedFetch(`/api/client/me`, {
          credentials: 'include',
          cache: 'no-store'
        })
        
        if (res.ok) {
          const data = await res.json()
          setAccessLevel(data.client?.accessLevel || 'FULL')
          setCanCreateDeals(data.client?.canCreateDeals !== false)
          const raw = data.client?.depositRequiredAmount
          const amt = Number(typeof raw === 'string' ? raw : raw ?? 0)
          setDepositRequiredAmount(Number.isFinite(amt) ? amt : 0)
        }
      } catch (error) {
        console.error('[TradingPanel] Error fetching access level:', error)
      }
    }

    const fetchSymbolInfo = async () => {
      if (!symbol) return
      
      try {
        const res = await fetch(`/api/admin/symbols?search=${encodeURIComponent(symbol)}&limit=1`)
        if (res.ok) {
          const data = await res.json()
          if (data.symbols && data.symbols.length > 0) {
            setSymbolInfo(data.symbols[0])
          }
        }
      } catch (error) {
        console.error('[TradingPanel] Error fetching symbol info:', error)
      }
    }

    fetchAccessLevel()
    fetchSymbolInfo()
  }, [user?.email, symbol])
  
  const handleTrade = async () => {
    // Проверка прав на создание сделок
    if (!canCreateDeals) {
      addToast({ 
        type: 'error', 
        title: 'Доступ запрещен', 
        description: 'У вас нет прав на создание сделок. Обратитесь к администратору.',
        duration: 5000
      })
      return
    }
    
    try {
      setSubmitting(true)
      const side = tradeType === 'buy' ? 'long' : 'short'
      const apiSymbol = symbol.replace('/', '').toUpperCase()
      const res = await authenticatedFetch(`/api/v1/positions/open`, {
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({ symbol: apiSymbol, side, qty: Number(volume), mode, leverage: Number(leverage), price: Number(currentPrice) })
      })
      const data = await res.json()
      if (!res.ok) {
        let errorMessage = data?.message || data?.code || 'Не удалось открыть позицию'
        
        // Улучшенная обработка ошибок
        if (data?.code === 'INVALID_QTY_STEP') {
          if (data?.nearestValidQty) {
            errorMessage = `Объем должен быть кратен ${data.qtyStep}. Используйте: ${data.nearestValidQty}`
            // Автоматически исправляем значение
            setVolume(data.nearestValidQty)
          } else {
            errorMessage = `Объем должен быть кратен ${data.qtyStep || 'шагу количества'}`
          }
        } else if (data?.code === 'INVALID_QTY') {
          errorMessage = `Минимальный объем: ${data.minQty || '0.01'}`
          if (data.minQty) {
            setVolume(Math.max(Number(data.minQty), 0.01))
          }
        }
        
        addToast({ 
          type: 'error', 
          title: 'Ошибка сделки', 
          description: errorMessage,
          duration: 5000
        })
        return
      }
      addToast({ type: 'success', title: 'Позиция открыта', description: `IM: ${Number(data?.calculations?.initialMargin ?? 0).toFixed(2)} | Liq: ${Number(data?.calculations?.liquidationPrice ?? 0).toFixed(2)}` })
      try { window.dispatchEvent(new Event('positions:changed')) } catch {}
    } catch (e: any) {
      addToast({ type: 'error', title: 'Сбой сети', description: e?.message || 'Попробуйте позже' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <TooltipProvider>
      <Card className={className}>
        <CardHeader className="pb-1 pt-2 px-3">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <CardTitle className="text-xs font-semibold">{symbol || ''}</CardTitle>
            </div>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {currentPrice > 0 ? currentPrice.toFixed(5) : '...'}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-1.5 pb-2 px-3">
        {/* Buy/Sell Buttons */}
        <div className="grid grid-cols-2 gap-1.5">
          <Button
            variant={tradeType === 'buy' ? 'default' : 'outline'}
            onClick={() => setTradeType('buy')}
            className={`h-7 text-xs ${tradeType === 'buy' ? 'bg-green-600 hover:bg-green-700' : ''}`}
          >
            <TrendingUp className="w-2.5 h-2.5 mr-1" />
            {t('trade.buy')}
          </Button>
          <Button
            variant={tradeType === 'sell' ? 'default' : 'outline'}
            onClick={() => setTradeType('sell')}
            className={`h-7 text-xs ${tradeType === 'sell' ? 'bg-red-600 hover:bg-red-700' : ''}`}
          >
            <TrendingDown className="w-2.5 h-2.5 mr-1" />
            {t('trade.sell')}
          </Button>
        </div>

        {/* Leverage Selection */}
        <div className="space-y-0.5">
          <Label className="text-[10px] font-medium">{t('positions.leverage')}:</Label>
          <div className="flex gap-1">
            {leverageOptions.map((lev) => {
              // Проверяем ограничения по уровню доступа
              const isAccessRestricted = accessLevel === 'BASE' && lev >= 10
              
              // Проверяем ограничения по символу
              const isSymbolRestricted = symbolInfo?.allowedLeverages && 
                !leverageOptions.includes(lev)
              
              const isRestricted = isAccessRestricted || isSymbolRestricted
              const button = (
                <Button
                  key={lev}
                  variant={leverage === lev ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => !isRestricted && setLeverage(lev)}
                  disabled={isRestricted}
                  className={`flex-1 h-6 text-[10px] ${isRestricted ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isRestricted && <Lock className="w-2.5 h-2.5 mr-0.5" />}
                  {lev}
                </Button>
              )

              if (isRestricted) {
                return (
                  <Tooltip key={lev}>
                    <TooltipTrigger asChild>
                      {button}
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs whitespace-normal">
                      <div className="space-y-1">
                        <p className="font-semibold text-yellow-600 dark:text-yellow-500">
                          {t('positions.leverage')} {lev}x {t('common.unavailable')}
                        </p>
                        {isAccessRestricted && (
                          <p className="text-xs text-muted-foreground">
                            {t('trade.fullAccessRequired')}
                          </p>
                        )}
                        {isSymbolRestricted && (
                          <p className="text-xs text-muted-foreground">
                            {t('trade.notAllowedForSymbol')}
                          </p>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )
              }

              return button
            })}
          </div>
        </div>

        {/* Volume */}
        <div className="space-y-0.5">
          <Label className="text-[10px] font-medium">{t('positions.qty')}:</Label>
          <div className="flex items-center space-x-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setVolume(Math.max(0.01, volume - 0.01))}
              disabled={volume <= 0.01}
              className="h-6 w-6 p-0 text-[10px]"
            >
              -
            </Button>
            <Input
              type="number"
              value={volume}
              onChange={(e) => setVolume(Math.max(0.01, parseFloat(e.target.value) || 0.01))}
              className="text-center h-6 text-[10px]"
              step="0.01"
              min="0.01"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setVolume(volume + 0.01)}
              className="h-6 w-6 p-0 text-[10px]"
            >
              +
            </Button>
          </div>
        </div>

        {/* Margin */}
        <div className="space-y-0.5">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground">{t('trade.initialMargin')}:</span>
            <span className="font-medium text-blue-600">{initialMargin.toFixed(2)} $</span>
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground">{t('trade.maintenanceMargin')}:</span>
            <span className="font-medium text-orange-600">{maintenanceMargin.toFixed(2)} $</span>
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground">{t('positions.liqPrice')}:</span>
            <span className="font-medium text-red-600">{liquidationPrice.toFixed(2)} $</span>
          </div>
        </div>

        <Separator className="my-1" />

        {/* Risk Warning for High Leverage */}
        {leverage >= 10 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-1.5">
            <div className="flex items-start space-x-1.5">
              <Info className="w-3 h-3 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
              <div className="space-y-0.5">
                <p className="text-[10px] font-semibold text-yellow-800 dark:text-yellow-200">
                  ⚠️ {t('trade.highRisk')}
                </p>
                <p className="text-[9px] text-yellow-700 dark:text-yellow-300">
                  {t('positions.leverage')} {leverage}x. {t('positions.liqPrice')}: {((1 / leverage) * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Access Warning */}
        {(!canCreateDeals || depositRequiredAmount > 0) && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-1.5">
            <p className="text-[10px] text-destructive text-center">
              {depositRequiredAmount > 0
                ? `${t('trade.required')}: ${depositRequiredAmount} USD`
                : t('trade.tradingBlocked')}
            </p>
          </div>
        )}

        {/* Execute Trade Button */}
        <Button
          onClick={handleTrade}
          className={`w-full h-7 ${
            tradeType === 'buy' 
              ? 'bg-green-600 hover:bg-green-700' 
              : 'bg-red-600 hover:bg-red-700'
          } text-xs`}
          disabled={submitting || !canCreateDeals || depositRequiredAmount > 0}
        >
          {submitting ? '...' : (tradeType === 'buy' ? t('trade.buy') : t('trade.sell'))}
        </Button>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}
