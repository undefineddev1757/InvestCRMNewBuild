
"use client"

import { useEffect, useRef, useState, memo, useCallback } from 'react'

// @ts-ignore - игнорируем отсутствие типов для klinecharts-pro
const KLineChartProImport = typeof window !== 'undefined' ? null : null

interface KLineChartProComponentProps {
  className?: string
  symbol?: string
  onSymbolChange?: (symbol: any) => void
  onPriceUpdate?: (data: { symbol?: any; price: number }) => void
}

function KLineChartProComponent({ 
  className, 
  symbol, 
  onSymbolChange, 
  onPriceUpdate 
}: KLineChartProComponentProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<any>(null)
  const datafeedRef = useRef<any>(null)
  const updateTimerRef = useRef<any>(null)
  const sseRef = useRef<any>(null)
  const isInitializedRef = useRef<boolean>(false)
  const liveManipulationIntervalRef = useRef<any>(null)
  const isInitializingRef = useRef<boolean>(false)
  const [adjustments, setAdjustments] = useState<any[]>([])
  const [isManipulating, setIsManipulating] = useState(false)
  const [noTradingPairs, setNoTradingPairs] = useState(false)
  
  const currentSymbol = symbol || ''
  
  const currentSymbolRef = useRef<string>(currentSymbol)
  const cancelTokenRef = useRef<{ cancelled: boolean } | null>(null)
  
  const lastDisplayedRef = useRef<Record<string, number>>({})
  const smoothingAlphaRef = useRef<number>(0.35)  // Более живая манипуляция
  const returnSmoothingAlphaRef = useRef<number>(0.12)  // Плавный возврат (больше свечей)
  
  const lastManipulatedCandleRef = useRef<any>(null)
  const manipulationStartPriceRef = useRef<{ adjId: string, price: number } | null>(null)
  const lastManipulationDirectionRef = useRef<'pump' | 'dump' | null>(null)
  const returningCandleCountRef = useRef<number>(0)
  const manipulationPhaseRef = useRef<'active' | 'returning' | null>(null)
  const manipulationSymbolRef = useRef<string | null>(null)  // Символ, который манипулируется
  const returnStartManipPercentRef = useRef<number>(0)  // Начальный процент манипуляции при старте возврата
  
  function smoothValue(prev: number, target: number, alpha?: number) {
    const actualAlpha = alpha ?? smoothingAlphaRef.current
    return prev + (target - prev) * actualAlpha
  }

  const loadAdjustments = useCallback(async () => {
    if (!currentSymbol) return []
    try {
      const url = `/api/admin/symbols/adjustments?symbol=${encodeURIComponent(currentSymbol)}`
      console.log(`📥 [${currentSymbol}] Loading adjustments from:`, url)
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        console.log(`📥 [${currentSymbol}] Adjustments loaded:`, data.adjustments.length, 'items', data.adjustments)
        const newAdjustments = Array.isArray(data.adjustments) ? data.adjustments : []
        
        ;(window as any).__currentAdjustments = newAdjustments
        
        setAdjustments(newAdjustments)
        
        const now = new Date()
        const hasActive = newAdjustments.some((adj: any) => {
          const startTime = new Date(adj.startAt)
          const endTime = new Date(adj.endsAt)
          return now >= startTime && now <= endTime
        })
        
        setIsManipulating(hasActive)
        
        console.log(`📊 Loaded ${newAdjustments.length} manipulation(s) for live mode`)
        
        return newAdjustments
      } else {
        console.error('❌ Failed to load adjustments:', res.status, res.statusText)
        setAdjustments([])
        setIsManipulating(false)
        ;(window as any).__currentAdjustments = []
      }
    } catch (error) {
      console.error('❌ Error loading adjustments:', error)
      setAdjustments([])
      setIsManipulating(false)
      ;(window as any).__currentAdjustments = []
    }
    return []
  }, [currentSymbol])

  const getSymbolConfig = (symbolName: string) => {
    const raw = symbolName.toUpperCase().trim()
    const hasSlash = raw.includes('/')
    const cleanSymbol = raw.replace('X:', '').replace('C:', '').replace('/', '')
    
    const forexBases = ['EUR', 'GBP', 'USD', 'JPY', 'AUD', 'NZD', 'CAD', 'CHF']
    let type = 'CS'
    let quoteCurrency = 'USD'
    if (hasSlash) {
      const [b, q] = raw.split('/')
      const base = (b || '').toUpperCase()
      const quote = (q || '').toUpperCase()
      const bothFx = forexBases.includes(base) && forexBases.includes(quote)
      type = bothFx ? 'currency' : 'crypto'
    } else if (cleanSymbol.endsWith('USD') || cleanSymbol.endsWith('USDT') || cleanSymbol.endsWith('USDC') || /BTC|ETH|SOL|DOGE|XRP|ADA|MATIC|BNB|LTC|LINK|AVAX|NEAR|ATOM|TRX|1INCH/i.test(cleanSymbol)) {
      type = 'crypto'
    } else if (forexBases.includes(cleanSymbol.slice(0, 3)) && forexBases.includes(cleanSymbol.slice(-3))) {
      type = 'currency'
    }
    
    console.log('🔍 Symbol classification:', { symbolName, cleanSymbol, type })
    
    let exchange = 'XNYS'
    let market = 'stocks'
    let ticker = cleanSymbol
    let name = cleanSymbol
    let pricePrecision = 2

    const formatWithSlash = (sym: string) => {
      if (sym.includes('/')) return sym
      if (sym.length >= 6) {
        const base = sym.slice(0, sym.length - 3)
        const quote = sym.slice(-3)
        return `${base}/${quote}`
      }
      return sym
    }
    
    if (type === 'crypto') {
      exchange = 'CRYPTO'
      market = 'crypto'
      let base = cleanSymbol
      
      if (hasSlash) {
        const parts = raw.split('/')
        base = (parts[0] || '').toUpperCase()
        quoteCurrency = (parts[1] || 'USD').toUpperCase()
      } else if (cleanSymbol.endsWith('USDT')) {
        base = cleanSymbol.slice(0, -4)
        quoteCurrency = 'USD'
      } else if (cleanSymbol.endsWith('USDC')) {
        base = cleanSymbol.slice(0, -4)
        quoteCurrency = 'USD'
      } else if (cleanSymbol.endsWith('USD')) {
        base = cleanSymbol.slice(0, -3)
        quoteCurrency = 'USD'
      } else if (cleanSymbol.endsWith('EUR')) {
        base = cleanSymbol.slice(0, -3)
        quoteCurrency = 'EUR'
      } else if (cleanSymbol.endsWith('BTC')) {
        base = cleanSymbol.slice(0, -3)
        quoteCurrency = 'BTC'
      } else if (cleanSymbol.endsWith('ETH')) {
        base = cleanSymbol.slice(0, -3)
        quoteCurrency = 'ETH'
      }
      
      ticker = `X:${base}-${quoteCurrency}`
      name = formatWithSlash(`${base}${quoteCurrency}`)
      pricePrecision = 2
      console.log('🔧 Crypto ticker formatted:', { base, quote: quoteCurrency, ticker })
    } else if (type === 'currency') {
      exchange = 'FOREX'
      market = 'fx'
      ticker = `C:${cleanSymbol}`
      name = formatWithSlash(cleanSymbol)
      pricePrecision = 5
    } else {
      exchange = 'XNYS'
      market = 'stocks'
      ticker = cleanSymbol
      name = cleanSymbol
      pricePrecision = 2
    }
    
    return {
      exchange,
      market,
      name,
      shortName: formatWithSlash(cleanSymbol),
      ticker,
      priceCurrency: quoteCurrency,
      type,
      pricePrecision
    }
  }

  class PolygonDatafeed {
    private apiKey: string
    private timers = new Map<string, any>()
    private barOpen = new Map<string, number>()
    private barHigh = new Map<string, number>()
    private barLow = new Map<string, number>()
    private lastBarTs = new Map<string, number>()
    private lastEmitted = new Map<string, any>()
    private historyCache = new Map<string, { data: any[]; savedAt: number; ttl: number }>()
    private inflight = new Map<string, Promise<any[]>>()
    private backoffMs = new Map<string, number>()

    constructor(apiKey: string) {
      this.apiKey = apiKey
    }

    async getHistoryKLineData(symbol: any, period: any, from: number, to: number) {
      try {
        console.log('📊 getHistoryKLineData called with:', { 
          symbolTicker: symbol?.ticker, 
          symbolType: symbol?.type, 
          symbolName: symbol?.name,
          period, 
          from: new Date(from).toISOString(), 
          to: new Date(to).toISOString() 
        })
        
        let ticker = symbol?.ticker
        let multiplier = period?.multiplier || 1
        let timespan = period?.timespan || 'minute'

        if (!ticker) {
          console.error('❌ No ticker provided')
          setNoTradingPairs(true)
          return []
        }

        if (symbol?.type === 'crypto') {
          const rawTicker = String(ticker)
          const noPrefix = rawTicker.replace(/^X:/, '').replace(/^C:/, '')
          
          let base = noPrefix
          let quote = 'USD'
          
          if (noPrefix.includes('-')) {
            [base, quote] = noPrefix.split('-')
          } else if (noPrefix.includes('/')) {
            [base, quote] = noPrefix.split('/')
          } else if (noPrefix.endsWith('USDT')) {
            base = noPrefix.slice(0, -4)
            quote = 'USD'
          } else if (noPrefix.endsWith('USD')) {
            base = noPrefix.slice(0, -3)
            quote = 'USD'
          } else if (noPrefix.endsWith('EUR')) {
            base = noPrefix.slice(0, -3)
            quote = 'EUR'
          }
          
          ticker = `X:${base}-${quote}`
          console.log('🔧 Formatted crypto ticker:', ticker)
        } else {
          ticker = String(ticker).replace(/\//g, '')
        }

        const bare = ticker.replace(/^C:/, '').replace(/^X:/, '')
        if (symbol?.type === 'currency' && !ticker.startsWith('C:')) {
          ticker = `C:${bare}`
        } else if (symbol?.type === 'crypto' && !ticker.startsWith('X:')) {
          ticker = `X:${bare}`
        }

        if (symbol?.type === 'CS' && timespan === 'minute') {
          console.log('⚠️ Switching to daily for stocks')
          timespan = 'day'
          multiplier = 1
        }

        if (timespan === 'month') {
          timespan = symbol?.type === 'currency' ? 'week' : 'day'
          multiplier = 1
        }

        const key = `${ticker}|${multiplier}|${timespan}|${from}|${to}`
        const cached = this.historyCache.get(key)
        if (cached && Date.now() - cached.savedAt < cached.ttl) {
          console.log('📦 Returning from cache:', key)
          setNoTradingPairs(false)
          return this.applyAllManipulations(cached.data)
        }

        if (this.inflight.has(key)) {
          console.log('⏳ Already fetching:', key)
          const result = await this.inflight.get(key)!
          setNoTradingPairs(false)
          return result
        }

        const promise = this.doFetch(ticker, multiplier, timespan, from, to)
        this.inflight.set(key, promise)

        try {
          const result = await promise
          this.inflight.delete(key)
          
          if (!result || result.length === 0) {
            console.warn('⚠️ No trading pairs available from Polygon')
            setNoTradingPairs(true)
            return []
          }
          
          setNoTradingPairs(false)
          return result
        } catch (err) {
          this.inflight.delete(key)
          console.error('❌ Error fetching data:', err)
          setNoTradingPairs(true)
          throw err
        }
      } catch (error) {
        console.error('❌ getHistoryKLineData error:', error)
        setNoTradingPairs(true)
        return []
      }
    }

    private async doFetch(ticker: string, multiplier: number, timespan: string, from: number, to: number) {
      const fromDate = new Date(from).toISOString().split('T')[0]
      const toDate = new Date(to).toISOString().split('T')[0]

      const url = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/${multiplier}/${timespan}/${fromDate}/${toDate}?adjusted=true&sort=asc&limit=50000&apiKey=${this.apiKey}`
      console.log('🌐 Polygon request:', url)

      const currentBackoff = this.backoffMs.get(ticker) || 0
      if (currentBackoff > 0) {
        console.log(`⏳ Waiting ${currentBackoff}ms before request`)
        await new Promise(resolve => setTimeout(resolve, currentBackoff))
      }

      let retries = 3
      while (retries > 0) {
        try {
          const res = await fetch(url)
          
          if (res.status === 429) {
            const retryAfter = res.headers.get('Retry-After')
            const waitMs = retryAfter ? parseInt(retryAfter) * 1000 : 5000
            console.warn(`⏳ Rate limited, waiting ${waitMs}ms (retries left: ${retries})`)
            this.backoffMs.set(ticker, Math.min(waitMs, 60000))
            await new Promise(resolve => setTimeout(resolve, waitMs))
            retries--
            continue
          }

          if (!res.ok) {
            console.error(`❌ HTTP ${res.status}: ${res.statusText}`)
            if (retries > 1) {
              retries--
              await new Promise(resolve => setTimeout(resolve, 1000))
              continue
            }
            setNoTradingPairs(true)
            return []
          }

          const data = await res.json()

          if (data.status === 'ERROR' || data.status === 'error') {
            console.error('❌ Polygon error:', data.error || data.message)
            this.backoffMs.set(ticker, Math.min((currentBackoff || 1000) * 2, 30000))
            if (retries > 1) {
              retries--
              await new Promise(resolve => setTimeout(resolve, 1000))
              continue
            }
            return []
          }

          if (!data.results || data.results.length === 0) {
            if (data.status === 'OK') {
              console.warn('⚠️ No data available for this symbol/timeframe')
              setNoTradingPairs(true)
            } else {
              console.error('❌ Unexpected response:', data)
            }
            return []
          }

          this.backoffMs.delete(ticker)

          const klines = data.results.map((bar: any) => ({
            timestamp: bar.t,
            open: bar.o,
            high: bar.h,
            low: bar.l,
            close: bar.c,
            volume: bar.v || 0,
            turnover: (bar.vw || bar.c) * (bar.v || 0)
          }))

          const key = `${ticker}|${multiplier}|${timespan}|${from}|${to}`
          const ttl = timespan === 'minute' ? 60000 : 300000
          this.historyCache.set(key, { data: klines, savedAt: Date.now(), ttl })

          console.log(`✅ Polygon returned ${klines.length} bars`)
          setNoTradingPairs(false)
          
          return this.applyAllManipulations(klines)
          
        } catch (error) {
          console.error('❌ Fetch error:', error)
          retries--
          if (retries === 0) {
            console.error('❌ All retries failed')
            throw error
          }
          console.warn(`⚠️ Retry ${4 - retries}/3`)
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
      
      return []
    }

    private applyAllManipulations(klines: any[]) {
      console.log('🔧 [applyAllManipulations] Обработка:', klines.length, 'свечей')
      
      const curAdjustments = (window as any).__currentAdjustments || []
      console.log('🔧 [applyAllManipulations] Adjustments:', curAdjustments.length)
      
      if (!curAdjustments || curAdjustments.length === 0) {
        return klines.map(candle => ({
          ...candle,
          manipulation_value: 0
        }))
      }
      
      let lastManipulationPercent = 0
      let nonZeroCount = 0
      
      const result = klines.map((candle: any, index: number) => {
        const barTime = candle.timestamp
        
        const activeAdj = curAdjustments.find((adj: any) => {
          const startTime = new Date(adj.startAt).getTime()
          const endTime = new Date(adj.endsAt).getTime()
          return barTime >= startTime && barTime <= endTime
        })
        
        let manipulationPercent = 0
        
        if (activeAdj) {
          const type = activeAdj.type
          const value = Number(activeAdj.value) || 0
          
          const startTime = new Date(activeAdj.startAt).getTime()
          const endTime = new Date(activeAdj.endsAt).getTime()
          let progress = Math.min(Math.max((barTime - startTime) / (endTime - startTime), 0), 1)
          
          // Ease-in-out
          progress = progress < 0.5 
            ? 2 * progress * progress 
            : 1 - Math.pow(-2 * progress + 2, 2) / 2
          
          if (type === 'PERCENT') {
            manipulationPercent = value * progress
          } else {
            const basePrice = Number(activeAdj.basePrice || candle.close)
            manipulationPercent = (value / basePrice) * 100 * progress
          }
          
          lastManipulationPercent = manipulationPercent
        } else if (lastManipulationPercent !== 0) {
          // Плавный возврат после окончания манипуляции
          manipulationPercent = lastManipulationPercent * 0.92
          
          if (Math.abs(manipulationPercent) < 0.01) {
            manipulationPercent = 0
            lastManipulationPercent = 0
          } else {
            lastManipulationPercent = manipulationPercent
          }
        }
        
        if (manipulationPercent !== 0) nonZeroCount++
        
        // Применяем манипуляцию к ценам
        const multiplier = 1 + (manipulationPercent / 100)
        
        return {
          ...candle,
          open: candle.open * multiplier,
          high: candle.high * multiplier,
          low: candle.low * multiplier,
          close: candle.close * multiplier,
          manipulation_value: manipulationPercent
        }
      })
      
      console.log(`✅ [applyAllManipulations] Результат: ${result.length} свечей, ${nonZeroCount} с манипуляцией`)
      
      return result
    }

    startUpdateKLineData(symbol: any, period: any, callback: (data: any) => void): void {
      const key = `${symbol?.ticker}|${period?.multiplier}|${period?.timespan}`
      
      if (this.timers.has(key)) {
        console.log('⚠️ Clearing existing timer before creating new one:', key)
        this.stopUpdateKLineData(symbol, period)
      }

      const ticker = symbol?.ticker
      if (!ticker) {
        console.error('❌ No ticker for live updates')
        setNoTradingPairs(true)
        return
      }

      setNoTradingPairs(false)

      const updateInterval = 2000  // Обновляем каждые 2 секунды

      const fetchTicker = async () => {
        try {
          if (stopControl.stopped) return
          
          const url = `https://api.polygon.io/v2/last/trade/${ticker}?apiKey=${this.apiKey}`
          const res = await fetch(url)
          
          if (!res.ok) {
            console.warn('⚠️ Failed to fetch ticker:', res.status)
            return
          }
          
          const data = await res.json()

          if (data.status === 'OK' && data.results) {
            const trade = data.results
            const rawPrice = trade.p
            const ts = trade.t

            if (stopControl.stopped) return

            const barKey = `${ticker}|${period?.multiplier}|${period?.timespan}`
            const now = Date.now()

            let barStart: number
            const mult = period?.multiplier || 1
            const span = period?.timespan || 'minute'

            // Всегда используем стандартный интервал (минутный), манипуляция применяется через цены
            if (span === 'minute') {
              barStart = Math.floor(now / (mult * 60 * 1000)) * (mult * 60 * 1000)
            } else if (span === 'day') {
              const d = new Date(now)
              d.setUTCHours(0, 0, 0, 0)
              barStart = d.getTime()
            } else {
              barStart = now
            }

            const lastTs = this.lastBarTs.get(barKey) || 0
            
            // Новая свеча - инициализируем OHLC
            if (barStart !== lastTs) {
              console.log('🕐 New bar started:', new Date(barStart).toISOString())
              
              // Открываемся от последней манипулированной цены для непрерывности
              const openPrice = lastManipulatedCandleRef.current 
                ? lastManipulatedCandleRef.current.close 
                : rawPrice
              
              this.barOpen.set(barKey, openPrice)
              this.barHigh.set(barKey, openPrice)
              this.barLow.set(barKey, openPrice)
              this.lastBarTs.set(barKey, barStart)
            }

            // Обновляем High/Low текущими ценами
            let open = this.barOpen.get(barKey) || rawPrice
            let high = this.barHigh.get(barKey) || rawPrice
            let low = this.barLow.get(barKey) || rawPrice

            if (rawPrice > high) {
              high = rawPrice
              this.barHigh.set(barKey, high)
            }
            if (rawPrice < low) {
              low = rawPrice
              this.barLow.set(barKey, low)
            }

            // Создаём RAW свечу
            let bar = {
              timestamp: barStart,
              open,
              high,
              low,
              close: rawPrice,
              volume: 0,
              turnover: 0,
              realTime: ts
            }

            // Применяем манипуляцию
            const manipulatedBar = this.applyLiveManipulation(bar, symbol)

            console.log('📊 Emitting bar:', {
              timestamp: new Date(manipulatedBar.timestamp).toISOString(),
              open: manipulatedBar.open.toFixed(2),
              high: manipulatedBar.high.toFixed(2),
              low: manipulatedBar.low.toFixed(2),
              close: manipulatedBar.close.toFixed(2),
              manipulation: manipulatedBar.manipulation_value?.toFixed(2) || 0,
              phase: manipulationPhaseRef.current || 'normal'
            })

            callback(manipulatedBar)
            this.lastEmitted.set(barKey, manipulatedBar)

            // Отправляем обновление цены для других компонентов
            if (onPriceUpdate) {
              onPriceUpdate({ 
                symbol, 
                price: manipulatedBar.close 
              })
            }
          } else {
            console.warn('⚠️ No trade data from Polygon')
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          if (errorMessage.includes('ERR_INSUFFICIENT_RESOURCES') || 
              errorMessage.includes('Failed to fetch')) {
            console.warn('⚠️ Browser resource limit reached, stopping live updates for:', ticker)
            const timer = this.timers.get(key)
            if (timer) {
              clearInterval(timer)
              this.timers.delete(key)
            }
            return
          }
          console.error('❌ Error fetching ticker:', error)
        }
      }

      const stopControl = { stopped: false }
      const scheduleNext = () => {
        if (stopControl.stopped) return
        const timeoutId = setTimeout(() => {
          fetchTicker().then(() => scheduleNext())
        }, updateInterval)
        this.timers.set(key, { timeout: timeoutId, stopControl } as any)
      }
      
      fetchTicker().then(() => scheduleNext())
      console.log('✅ Started live updates:', key)
    }

    subscribe(symbol: any, period: any, callback: (data: any) => void): void {
      this.startUpdateKLineData(symbol, period, callback)
    }

    unsubscribe(symbol: any, period: any): void {
      this.stopUpdateKLineData(symbol, period)
    }

    private applyLiveManipulation(bar: any, symbol?: any): any {
      try {
        const adjustments = (window as any).__currentAdjustments || []
        if (adjustments.length === 0) {
          lastManipulatedCandleRef.current = null
          manipulationStartPriceRef.current = null
          lastDisplayedRef.current = {}
          manipulationPhaseRef.current = null
          returningCandleCountRef.current = 0
          manipulationSymbolRef.current = null
          returnStartManipPercentRef.current = 0
          return {
            ...bar,
            manipulation_value: 0
          }
        }

        const symbolKey = symbol?.ticker || symbol?.name || 'unknown'
        const barTime = bar.timestamp
        
        // Проверяем, что бар относится к текущему символу
        const currentSymbolName = currentSymbolRef.current
        
        // Нормализуем символы для сравнения (убираем /, -, X:, C:, пробелы)
        const normalizeSymbol = (s: string) => s.toUpperCase().replace(/[\s\-\/]/g, '').replace(/^[XC]:/, '')
        
        const normalizedCurrent = normalizeSymbol(currentSymbolName)
        const normalizedName = symbol?.name ? normalizeSymbol(symbol.name) : ''
        const normalizedTicker = symbol?.ticker ? normalizeSymbol(symbol.ticker) : ''
        const normalizedShort = symbol?.shortName ? normalizeSymbol(symbol.shortName) : ''
        
        const symbolMatches = normalizedName === normalizedCurrent || 
                             normalizedTicker === normalizedCurrent ||
                             normalizedShort === normalizedCurrent ||
                             normalizedName.includes(normalizedCurrent) ||
                             normalizedTicker.includes(normalizedCurrent)
        
        if (!symbolMatches) {
          console.log(`⚠️ Symbol mismatch: bar for ${symbol?.name || symbol?.ticker} (normalized: ${normalizedName || normalizedTicker}), but chart shows ${currentSymbolName} (normalized: ${normalizedCurrent})`)
          return {
            ...bar,
            manipulation_value: 0
          }
        }
        
        const activeAdj = adjustments.find((adj: any) => {
          const startTime = new Date(adj.startAt).getTime()
          const endTime = new Date(adj.endsAt).getTime()
          return barTime >= startTime && barTime <= endTime
        })

        // ===== ВОЗВРАТ К РЕАЛЬНОЙ ЦЕНЕ =====
        if (!activeAdj) {
          const wasManipulated = lastManipulatedCandleRef.current !== null
          
          if (wasManipulated) {
            // Проверяем, что возврат для того же символа
            if (manipulationSymbolRef.current && manipulationSymbolRef.current !== symbolKey) {
              console.log(`⚠️ Skipping return for different symbol: manipulation was for ${manipulationSymbolRef.current}, but got ${symbolKey}`)
              return {
                ...bar,
                manipulation_value: 0
              }
            }
            
            manipulationPhaseRef.current = 'returning'
            returningCandleCountRef.current++
            
            const prevManipulatedClose = lastManipulatedCandleRef.current?.close || bar.close
            
            // При первой свече возврата сохраняем начальный процент манипуляции
            if (returningCandleCountRef.current === 1) {
              const initialManipPercent = ((prevManipulatedClose - bar.close) / bar.close) * 100
              returnStartManipPercentRef.current = initialManipPercent
              console.log(`🎯 Начало возврата: начальная манипуляция ${initialManipPercent.toFixed(2)}%`)
            }
            
            // Плавно уменьшаем манипуляцию от начального значения
            const progressFactor = Math.pow(1 - returnSmoothingAlphaRef.current, returningCandleCountRef.current)
            const newManipPercent = returnStartManipPercentRef.current * progressFactor
            
            const diffPercent = Math.abs(newManipPercent)
            
            console.log(`🔴 Возврат свеча ${returningCandleCountRef.current}: manip ${newManipPercent.toFixed(2)}%, от: ${prevManipulatedClose.toFixed(2)}, реальная: ${bar.close.toFixed(2)}`)
            
            // Проверяем: достигли реальной цены (< 0.1%) ИЛИ лимит свечей (10)
            if (diffPercent < 0.1 || returningCandleCountRef.current >= 10) {
              console.log('✅ Возврат завершён, переход к реальным ценам')
              lastManipulatedCandleRef.current = null
              lastManipulationDirectionRef.current = null
              lastDisplayedRef.current = {}
              manipulationStartPriceRef.current = null
              manipulationPhaseRef.current = null
              returningCandleCountRef.current = 0
              manipulationSymbolRef.current = null
              returnStartManipPercentRef.current = 0
              // Возвращаем реальный бар
              return {
                ...bar,
                manipulation_value: 0
              }
            }

            // Применяем оставшуюся манипуляцию к реальным OHLC
            const multiplier = 1 + (newManipPercent / 100)
            
            // Open берём от предыдущей манипулированной свечи для непрерывности
            const prevManipOpen = lastManipulatedCandleRef.current?.close || (bar.open * multiplier)
            
            const returnBar = {
              ...bar,
              open: prevManipOpen,
              high: Math.max(prevManipOpen, bar.high * multiplier, bar.close * multiplier),
              low: Math.min(prevManipOpen, bar.low * multiplier, bar.close * multiplier),
              close: bar.close * multiplier,
              manipulation_value: newManipPercent
            }
            
            lastManipulatedCandleRef.current = returnBar
            
            return returnBar
          }
          
          // Полностью завершаем
          manipulationPhaseRef.current = null
          returningCandleCountRef.current = 0
          lastManipulatedCandleRef.current = null
          manipulationSymbolRef.current = null
          returnStartManipPercentRef.current = 0
          return {
            ...bar,
            manipulation_value: 0
          }
        }

        // ===== АКТИВНАЯ МАНИПУЛЯЦИЯ =====
        
        const type = activeAdj.type
        const value = Number(activeAdj.value) || 0
        
        if (isNaN(value) || value === 0) {
          console.warn('⚠️ Неверное значение манипуляции:', activeAdj.value)
          return {
            ...bar,
            manipulation_value: 0
          }
        }
        
        // Инициализация базовой цены ОДИН РАЗ при старте манипуляции
        if (!manipulationStartPriceRef.current || 
            manipulationStartPriceRef.current.adjId !== activeAdj.id) {
          
          const initialBase = activeAdj.basePrice 
            ? Number(activeAdj.basePrice)
            : bar.close
          
          manipulationStartPriceRef.current = {
            adjId: activeAdj.id,
            price: initialBase
          }
          
          returningCandleCountRef.current = 0
          manipulationPhaseRef.current = 'active'
          manipulationSymbolRef.current = symbolKey  // Запоминаем символ манипуляции
          
          console.log('🎯 Начало манипуляции:', {
            adjId: activeAdj.id,
            symbol: symbolKey,
            basePrice: initialBase,
            type,
            value,
            targetChange: type === 'PERCENT' ? `${value}%` : `$${value}`
          })
        }
        
        manipulationPhaseRef.current = 'active'

        const basePrice = Number(manipulationStartPriceRef.current?.price || bar.close)
        
        // Целевая цена
        let targetPrice: number
        if (type === 'PERCENT') {
          targetPrice = basePrice * (1 + value / 100)
        } else {
          targetPrice = basePrice + value
        }

        // Прогресс манипуляции по РЕАЛЬНОМУ ВРЕМЕНИ
        const startTime = new Date(activeAdj.startAt).getTime()
        const endTime = new Date(activeAdj.endsAt).getTime()
        const currentTime = Date.now()
        
        let progress = Math.min(Math.max((currentTime - startTime) / (endTime - startTime), 0), 1)
        
        // Ease-in-out для плавности
        progress = progress < 0.5 
          ? 2 * progress * progress 
          : 1 - Math.pow(-2 * progress + 2, 2) / 2

        // Текущая целевая цена на данный момент времени
        const currentTargetPrice = basePrice + (targetPrice - basePrice) * progress
        
        const adjId = `${symbolKey}-${activeAdj.id}`
        const prevDisplayed = lastDisplayedRef.current[adjId]
        
        // ===== ПЛАВНОЕ ДВИЖЕНИЕ =====
        let manipulatedClose: number
        
        if (prevDisplayed !== undefined) {
          // Плавно двигаемся от предыдущего значения к текущей целевой цене
          manipulatedClose = smoothValue(prevDisplayed, currentTargetPrice, smoothingAlphaRef.current)
        } else {
          // Первое обновление - начинаем от базовой цены
          manipulatedClose = smoothValue(basePrice, currentTargetPrice, smoothingAlphaRef.current)
        }
        
        // Open берём из реального бара
        const manipulatedOpen = bar.open
        
        // High/Low корректируются пропорционально манипуляции
        const priceShift = manipulatedClose - bar.close
        let manipulatedHigh = bar.high + priceShift
        let manipulatedLow = bar.low + priceShift
        
        // High/Low должны охватывать Open и Close
        manipulatedHigh = Math.max(manipulatedHigh, manipulatedOpen, manipulatedClose)
        manipulatedLow = Math.min(manipulatedLow, manipulatedOpen, manipulatedClose)
        
        lastDisplayedRef.current[adjId] = manipulatedClose

        const isPump = value > 0
        lastManipulationDirectionRef.current = isPump ? 'pump' : 'dump'

        // Вычисляем manipulation_value для отображения
        let manipulationValue = ((manipulatedClose - basePrice) / basePrice) * 100

        // Валидация
        if (!isFinite(manipulatedClose) || !isFinite(manipulatedOpen) || 
            !isFinite(manipulatedHigh) || !isFinite(manipulatedLow)) {
          console.error('❌ Некорректные данные цен')
          return {
            ...bar,
            manipulation_value: 0
          }
        }

        const manipulatedBar = {
          ...bar,
          open: manipulatedOpen,
          high: manipulatedHigh,
          low: manipulatedLow,
          close: manipulatedClose,
          manipulation_value: manipulationValue
        }

        lastManipulatedCandleRef.current = manipulatedBar

        console.log(`🟢 Манипуляция: progress ${(progress * 100).toFixed(1)}%, target ${currentTargetPrice.toFixed(2)}, close ${manipulatedClose.toFixed(2)}`)

        return manipulatedBar
      } catch (error) {
        console.error('❌ Error in applyLiveManipulation:', error)
        return {
          ...bar,
          manipulation_value: 0
        }
      }
    }

    stopUpdateKLineData(symbol: any, period: any): void {
      const key = `${symbol?.ticker}|${period?.multiplier}|${period?.timespan}`
      const timerData = this.timers.get(key)
      if (timerData) {
        if (typeof timerData === 'object' && 'stopControl' in timerData) {
          timerData.stopControl.stopped = true
          clearTimeout(timerData.timeout)
        } else {
          clearInterval(timerData as any)
        }
        this.timers.delete(key)
        console.log('⏹️ Stopped live updates:', key)
      }
    }

    stopAll(): void {
      console.log('🛑 Stopping all timers, count:', this.timers.size)
      this.timers.forEach((timerData, key) => {
        if (typeof timerData === 'object' && 'stopControl' in timerData) {
          timerData.stopControl.stopped = true
          clearTimeout(timerData.timeout)
          console.log('⏹️ Stopped timer:', key)
        } else {
          clearInterval(timerData as any)
          console.log('⏹️ Stopped interval:', key)
        }
      })
      this.timers.clear()
      console.log('✅ All timers cleared')
    }

    clearCache(): void {
      this.historyCache.clear()
      console.log('🗑️ Cache cleared')
    }

    async searchSymbols(keyword: string): Promise<any[]> {
      try {
        const url = keyword 
          ? `/api/curated-symbols?limit=50&search=${encodeURIComponent(keyword)}`
          : `/api/curated-symbols?limit=50`
        const res = await fetch(url, { cache: 'no-store' })
        if (!res.ok) return []
        const data = await res.json()
        return (data?.data || []).map((s: any) => ({
          ticker: s.ticker || s.shortName,
          name: s.shortName || s.name,
          shortName: s.shortName,
          type: s.type || 'crypto'
        }))
      } catch {
        return []
      }
    }
  }

  useEffect(() => {
    if (datafeedRef.current && currentSymbolRef.current && currentSymbolRef.current !== currentSymbol) {
      console.log('🔄 Symbol changing from', currentSymbolRef.current, 'to', currentSymbol)
      datafeedRef.current.stopAll()
      
      lastDisplayedRef.current = {}
      manipulationStartPriceRef.current = null
      lastManipulatedCandleRef.current = null
      lastManipulationDirectionRef.current = null
      returningCandleCountRef.current = 0
      manipulationPhaseRef.current = null
      manipulationSymbolRef.current = null
      returnStartManipPercentRef.current = 0
      
      if (isInitializedRef.current) {
        isInitializedRef.current = false
        isInitializingRef.current = false
        console.log('🔄 Reset initialization flags for new symbol')
      }
    }
    
    currentSymbolRef.current = currentSymbol
  }, [currentSymbol])

  useEffect(() => {
    if (isInitializedRef.current) return
    if (isInitializingRef.current) return
    if (!currentSymbol) return
    
    console.log('🚀 Initializing chart for symbol:', currentSymbol)
    
    isInitializedRef.current = true
    isInitializingRef.current = true
    
    let chart: any = null

    async function initChart(symbolToInit: string) {
      try {
        console.log('📊 Starting chart initialization for:', symbolToInit)
        
        const apiKey = process.env.NEXT_PUBLIC_POLYGON_API_KEY || 'YOUR_POLYGON_API_KEY'
        
        if (!apiKey || apiKey === 'YOUR_POLYGON_API_KEY') {
          console.error('❌ Polygon API key not configured')
          isInitializedRef.current = false
          isInitializingRef.current = false
          return
        }

        // @ts-ignore - динамический импорт @klinecharts/pro
        const { KLineChartPro } = await import('@klinecharts/pro')
        console.log('✅ KLineChartPro loaded')

        const datafeed = new PolygonDatafeed(apiKey)
        datafeedRef.current = datafeed
        ;(window as any).__currentDatafeed = datafeed

        const symbolConfig = getSymbolConfig(symbolToInit)
        console.log('🔧 Symbol config:', symbolConfig)

        const defaultPeriod = { multiplier: 1, timespan: 'minute', text: '1m' }

        if (symbolToInit !== currentSymbolRef.current) {
          console.log('⚠️ Symbol changed during init, using current symbol:', {
            init: symbolToInit,
            current: currentSymbol 
          })
          symbolToInit = currentSymbol
        }

        if (!containerRef.current) {
          console.log('⚠️ Container ref is null, aborting chart init')
          isInitializedRef.current = false
          return
        }

        if (containerRef.current.children.length > 0) {
          console.log('⚠️ Container has children, cleaning up before chart creation')
          while (containerRef.current.firstChild) {
            containerRef.current.removeChild(containerRef.current.firstChild)
          }
        }

        chart = new KLineChartPro({
          container: containerRef.current,
          symbol: symbolConfig,
          locale: 'ru',
          period: defaultPeriod,
          datafeed: datafeed,
          mainIndicators: ['MA'],
          subIndicators: []
        })
        ;(chart as any).__currentSymbol = currentSymbol

        try {
          const isDark = document.documentElement.classList.contains('dark') || document.body.classList.contains('dark')
          if (isDark) {
            (chart as any).setTheme?.('dark')
            containerRef.current?.setAttribute?.('data-theme', 'dark')
          } else {
            (chart as any).setTheme?.('light')
            containerRef.current?.removeAttribute?.('data-theme')
          }

          const applyGrid = (dark: boolean) => {
            const gridColor = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
            try {
              ;(chart as any).setStyles?.({
                grid: {
                  horizontal: { color: gridColor, style: 'dashed' },
                  vertical: { color: gridColor, style: 'dashed' }
                },
                candle: {
                  type: 'candle_solid',
                  bar: {
                    upColor: '#26a69a',
                    downColor: '#ef5350',
                    noChangeColor: '#888888'
                  },
                  tooltip: {
                    showRule: 'always',
                    showType: 'standard',
                    labels: ['O: ', 'H: ', 'L: ', 'C: ', 'V: '],
                    text: {
                      size: 12,
                      family: 'Helvetica Neue',
                      weight: 'normal',
                      color: '#D9D9D9'
                    }
                  },
                  priceMark: {
                    show: true,
                    high: {
                      show: true,
                      color: '#D9D9D9',
                      textMargin: 5,
                      textSize: 10,
                      textFamily: 'Helvetica Neue',
                      textWeight: 'normal'
                    },
                    low: {
                      show: true,
                      color: '#D9D9D9',
                      textMargin: 5,
                      textSize: 10,
                      textFamily: 'Helvetica Neue',
                      textWeight: 'normal',
                    },
                    last: {
                      show: true,
                      upColor: '#26A69A',
                      downColor: '#EF5350',
                      noChangeColor: '#888888',
                      line: {
                        show: true,
                        style: 'dashed',
                        dashValue: [4, 4],
                        size: 1
                      },
                      text: {
                        show: true,
                        style: 'fill',
                        size: 12,
                        paddingLeft: 2,
                        paddingTop: 2,
                        paddingRight: 2,
                        paddingBottom: 2,
                        color: '#FFFFFF',
                        family: 'Helvetica Neue',
                        weight: 'normal',
                        borderStyle: 'solid',
                        borderSize: 0,
                        borderColor: 'transparent',
                        borderRadius: 2
                      }
                    }
                  }
                }
              })
            } catch {}
          }
          applyGrid(isDark)

          const observer = new MutationObserver(() => {
            const dark = document.documentElement.classList.contains('dark') || document.body.classList.contains('dark')
            ;(chart as any).setTheme?.(dark ? 'dark' : 'light')
            const el = containerRef.current
            if (dark) el?.setAttribute?.('data-theme', 'dark')
            else el?.removeAttribute?.('data-theme')
            applyGrid(dark)
          })
          observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
          observer.observe(document.body, { attributes: true, attributeFilter: ['class'] })
          ;(chart as any).__themeObserver = observer
        } catch {}

        chartRef.current = chart
        ;(window as any).__currentChart = chart

        try {
          (chart as any).setLoadDataCallback?.(async ({ from, to, period: p }: any) => {
            try {
              return await datafeed.getHistoryKLineData(symbolConfig, p || defaultPeriod, from, to)
            } catch {
              return []
            }
          })
        } catch {}

        try {
          const getLang = () => {
            try { return (localStorage.getItem('language') as string) || 'ru' } catch { return 'ru' }
          }
          const dict: any = {
            ru: { symbol_search: 'Поиск символа', symbol_code: 'Код актива' },
            en: { symbol_search: 'Symbol search', symbol_code: 'Symbol code' },
            de: { symbol_search: 'Symbolsuchen', symbol_code: 'Symbolcode' },
          }
          const patchTexts = () => {
            const lang = getLang()
            const m = dict[lang] || dict['en']
            const root = containerRef.current
            if (!root || !m) return
            const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
            const targets: Text[] = []
            while (walker.nextNode()) {
              const n = walker.currentNode as Text
              const t = (n.nodeValue || '').trim()
              if (t === 'symbol_search') targets.push(n)
              if (t === 'symbol_code') targets.push(n)
            }
            targets.forEach((n) => {
              const t = (n.nodeValue || '').trim()
              if (t === 'symbol_search') n.nodeValue = m.symbol_search
              if (t === 'symbol_code') n.nodeValue = m.symbol_code
            })
            const inputs = root.querySelectorAll('input')
            inputs.forEach((el) => {
              if (el.getAttribute('placeholder') === 'symbol_code') {
                el.setAttribute('placeholder', m.symbol_code)
              }
            })
          }
          const overlayObserver = new MutationObserver(() => patchTexts())
          overlayObserver.observe(containerRef.current, { childList: true, subtree: true })
          ;(chart as any).__overlayObserver = overlayObserver
        } catch {}

        await loadAdjustments()
        
        isInitializingRef.current = false
      } catch (error) {
        console.error('Error loading KLineChartPro:', error)
        isInitializedRef.current = false
        isInitializingRef.current = false
      }
    }

    initChart(currentSymbol)

    return () => {
      isInitializedRef.current = false
      isInitializingRef.current = false
      
      if (updateTimerRef.current) {
        clearInterval(updateTimerRef.current)
        updateTimerRef.current = null
      }
      try { 
        if (datafeedRef.current) {
          datafeedRef.current.stopAll()
        }
        if (chartRef.current) {
          chartRef.current.destroy?.()
          chartRef.current = null
        }
        try { (chart as any).__themeObserver?.disconnect?.() } catch {}
        try { (chart as any).__overlayObserver?.disconnect?.() } catch {}
        datafeedRef.current = null
        ;(window as any).__currentChart = null
        
        if (containerRef.current) {
          while (containerRef.current.firstChild) {
            containerRef.current.removeChild(containerRef.current.firstChild)
          }
        }
      } catch {}
    }
  }, [currentSymbol, loadAdjustments])

  useEffect(() => {
    try {
      if (sseRef.current) {
        try { sseRef.current.close() } catch {}
        sseRef.current = null
      }

      if (!currentSymbol) return

      const url = `/api/realtime/adjustments?symbol=${encodeURIComponent(currentSymbol)}`
      const es = new EventSource(url)
      sseRef.current = es

      es.onmessage = async (ev) => {
        try {
          const msg = JSON.parse(ev.data || '{}')
          if (!msg) return
          
          if (msg.type === 'ready' || msg.type === 'created' || msg.type === 'updated' || msg.type === 'deleted') {
            await loadAdjustments()
          }
        } catch {}
      }

      es.onerror = () => {}
    } catch {}

    return () => {
      try { sseRef.current?.close?.() } catch {}
      sseRef.current = null
    }
  }, [currentSymbol, loadAdjustments])

  return (
    <div className={`${className} h-full`}>
      <div className="relative border rounded-lg overflow-hidden h-full">
        {noTradingPairs && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="text-center p-6">
              <p className="text-lg font-semibold text-muted-foreground">
                Нет доступных торговых пар
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                В данный момент торговые пары отсутствуют
              </p>
            </div>
          </div>
        )}
        <div ref={containerRef} className="w-full h-full" />
        {adjustments.length > 0 && (
          <div className="absolute top-2 right-2 bg-orange-500/90 text-white text-xs px-2 py-1 rounded-md shadow-lg z-10">
            🎯 {adjustments.length} активная манипуляция
          </div>
        )}
      </div>
    </div>
  )
}

export default memo(KLineChartProComponent)