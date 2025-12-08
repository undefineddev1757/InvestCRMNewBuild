"use client"

import { useEffect, useRef, useState, memo } from 'react'

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
  const [adjustments, setAdjustments] = useState<any[]>([])
  const [isManipulating, setIsManipulating] = useState(false)
  
  // Для плавного подъёма/спуска манипуляций
  const lastDisplayedRef = useRef<Record<number, number>>({})
  const smoothingAlphaRef = useRef<number>(0.08)
  const lastManipulatedCandleRef = useRef<any>(null)
  
  // ✅ Стартовая цена манипуляции (для правильного DUMP)
  const manipulationStartPriceRef = useRef<{ adjId: string, price: number } | null>(null)

  const currentSymbol = symbol || 'BTCUSD'
  
  // Экспоненциальный фильтр для плавного перехода
  function smoothValue(prev: number, target: number, alpha?: number) {
    const actualAlpha = alpha ?? smoothingAlphaRef.current
    return prev + (target - prev) * actualAlpha
  }

  // Загрузка активных корректировок
  const loadAdjustments = async () => {
    try {
      const url = `/api/admin/symbols/adjustments?symbol=${encodeURIComponent(currentSymbol)}`
      console.log('📥 Loading adjustments from:', url)
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        console.log('📥 Adjustments loaded:', data.adjustments)
        const newAdjustments = Array.isArray(data.adjustments) ? data.adjustments : []
        
        ;(window as any).__currentAdjustments = newAdjustments
        
        setAdjustments(newAdjustments)
        
        // Проверяем, есть ли активные корректировки (для live манипуляций)
        const now = new Date()
        const hasActive = newAdjustments.some((adj: any) => {
          const startTime = new Date(adj.startAt)
          const endTime = new Date(adj.endsAt)
          return now >= startTime && now <= endTime
        })
        
        setIsManipulating(hasActive)
        
        // Если есть ЛЮБЫЕ корректировки (даже прошлые), обновляем график
        if (newAdjustments.length > 0) {
          console.log(`📊 Found ${newAdjustments.length} manipulation(s), refreshing chart`)
          // Очищаем кеш и запускаем обновление через небольшую задержку
          setTimeout(() => {
            if (datafeedRef.current && chartRef.current) {
              // console.log('🔄 Clearing cache and requesting new data')
              datafeedRef.current.clearCache()
              
              // Запрашиваем новые данные с манипуляциями
              const period = chartRef.current.getPeriod?.() || { multiplier: 1, timespan: 'minute' }
              const symbolCfg = getSymbolConfig(currentSymbol)
              const now = Date.now()
              const from = now - 1000 * 60 * 60 * 2 // Только последние 2 часа истории
              
              datafeedRef.current.getHistoryKLineData(symbolCfg, period, from, now).then((data: any) => {
                if (data && data.length > 0 && chartRef.current) {
                  try {
                    chartRef.current.applyNewData?.(data)
                    console.log(`✅ Chart updated: ${data.length} candles`)
                  } catch (e) {
                    console.error('Failed to apply manipulated data:', e)
                  }
                }
              })
            }
          }, 100)
        }
        
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
  }

  const getSymbolConfig = (symbolName: string) => {
    const cleanSymbol = symbolName.replace('X:', '').replace('C:', '')
    
    let type = 'CS'
    
    if (cleanSymbol.includes('BTC') || cleanSymbol.includes('ETH') || (cleanSymbol.includes('USD') && cleanSymbol.length <= 8)) {
      type = 'crypto'
    } else if (cleanSymbol.length <= 6 && cleanSymbol.includes('USD')) {
      type = 'currency'
    }
    
    let exchange = 'XNYS'
    let market = 'stocks'
    let ticker = cleanSymbol
    let name = cleanSymbol
    let pricePrecision = 2
    
    if (type === 'crypto') {
      exchange = 'CRYPTO'
      market = 'crypto'
      ticker = `X:${cleanSymbol}`
      name = `${cleanSymbol} USD`
      pricePrecision = 2
    } else if (type === 'currency') {
      exchange = 'FOREX'
      market = 'fx'
      ticker = `C:${cleanSymbol}`
      name = `${cleanSymbol}`
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
      shortName: cleanSymbol,
      ticker,
      priceCurrency: 'USD',
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
    private allTimers: any[] = []

    constructor(apiKey: string) {
      this.apiKey = apiKey
    }

    async getHistoryKLineData(symbol: any, period: any, from: number, to: number) {
      try {
        let ticker = symbol?.ticker || 'SPCE'
        let multiplier = period?.multiplier || 1
        let timespan = period?.timespan || 'minute'

        ticker = ticker.replace(/\//g, '')

        const bare = ticker.replace(/^C:/, '').replace(/^X:/, '')
        if (symbol?.type === 'currency' && !ticker.startsWith('C:')) {
          ticker = `C:${bare}`
        } else if (symbol?.type === 'crypto' && !ticker.startsWith('X:')) {
          ticker = `X:${bare}`
        }

        if (symbol?.type === 'CS' && timespan === 'minute') {
          timespan = 'day'
          multiplier = 1
        }

        if (timespan === 'month') {
          timespan = symbol?.type === 'currency' ? 'week' : 'day'
          multiplier = 1
        }

        if (from < 0 || to < 0 || from >= to) {
          return this.generateFallbackData(symbol, period, from, to)
        }

        const url = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/${multiplier}/${timespan}/${from}/${to}?adjusted=true&sort=asc&limit=50000&apiKey=${this.apiKey}`
        
        const periodMs = this.getPeriodMs({ multiplier, timespan })
        const cacheTtl = 30 * 1000
        const cacheKey = `${ticker}|${multiplier}|${timespan}|${Math.floor(from / periodMs)}|${Math.floor(to / periodMs)}`

        // Проверяем наличие манипуляций - если есть, НЕ используем кеш
        const adjustments = (typeof window !== 'undefined') ? (window as any).__currentAdjustments : []
        const hasAdjustments = Array.isArray(adjustments) && adjustments.length > 0
        
        if (!hasAdjustments) {
          const cached = this.historyCache.get(cacheKey)
          if (cached && Date.now() - cached.savedAt < cached.ttl) {
            return cached.data
          }
        }

        const inflightExisting = this.inflight.get(cacheKey)
        if (inflightExisting) return await inflightExisting

        console.log('🚀 Polygon API request:', {
          ticker,
          symbolType: symbol?.type,
          url: url.replace(this.apiKey, 'API_KEY_HIDDEN')
        })

        const fetchPromise = (async () => {
          const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
          
          // Проверяем манипуляции внутри промиса
          const adjCheck = (typeof window !== 'undefined') ? (window as any).__currentAdjustments : []
          const hasAdj = Array.isArray(adjCheck) && adjCheck.length > 0

          const doFetch = async (): Promise<any> => {
            const response = await fetch(url)
            if (!response.ok) {
              console.log('Polygon API error:', response.status, response.statusText)

              if (response.status === 429) {
                const currentBackoff = this.backoffMs.get(ticker) || 1000
                await sleep(currentBackoff)
                this.backoffMs.set(ticker, Math.min(currentBackoff * 2, 60000))
                const retry = await fetch(url)
                if (!retry.ok) {
                  return null
                }
                this.backoffMs.set(ticker, 1000)
                return await retry.json()
              }

              if (response.status === 401 && symbol?.type === 'CS' && timespan === 'minute') {
                console.log('Retrying with daily data for stock:', bare)
                const dailyUrl = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/1/day/${from}/${to}?adjusted=true&sort=asc&limit=50000&apiKey=${this.apiKey}`
                const dailyResponse = await fetch(dailyUrl)
                if (dailyResponse.ok) {
                  this.backoffMs.set(ticker, 1000)
                  return await dailyResponse.json()
                }
              }
              return null
            }
            this.backoffMs.set(ticker, 1000)
            return await response.json()
          }

          const data = await doFetch()
          if (!data) {
            return this.generateFallbackData(symbol, period, from, to)
          }

          console.log('✅ Polygon API response:', {
            ticker,
            resultsCount: data.results?.length || 0,
            firstPrice: data.results?.[0]?.c,
            lastPrice: data.results?.[data.results?.length - 1]?.c
          })
      
          if (!data.results || data.results.length === 0) {
            console.log('⚠️ No data from Polygon, using fallback')
            return this.generateFallbackData(symbol, period, from, to)
          }
      
          let mapped = data.results.map((item: any) => {
            return {
              timestamp: item.t,
              open: item.o,
              high: item.h,
              low: item.l,
              close: item.c,
              volume: item.v || 0
            }
          })
          
          // Если есть манипуляции, заполняем пробелы минутными свечами ТОЛЬКО внутри периода манипуляции
          if (hasAdj && adjCheck.length > 0) {
            // Находим диапазон всех манипуляций
            const minAdjStart = Math.min(...adjCheck.map(adj => new Date(adj.startAt).getTime()))
            const maxAdjEnd = Math.max(...adjCheck.map(adj => new Date(adj.endsAt).getTime()))
            
            // Генерируем минутные свечи ТОЛЬКО для периода манипуляции
            const filledCandles: any[] = []
            
            // Добавляем свечи ДО манипуляции (реальные данные)
            const candlesBeforeAdj = mapped.filter((c: any) => c.timestamp < minAdjStart)
            filledCandles.push(...candlesBeforeAdj)
            
            // Генерируем синтетические свечи для периода манипуляции
            for (let ts = minAdjStart; ts <= maxAdjEnd; ts += periodMs) {
              // Ищем существующую свечу для этого времени
              let existingCandle = mapped.find((c: any) => Math.abs(c.timestamp - ts) < periodMs / 2)
              
              if (!existingCandle) {
                // Если свечи нет, ищем ближайшую предыдущую
                const prevCandle = filledCandles.slice(-1)[0] || mapped.filter((c: any) => c.timestamp < ts).slice(-1)[0]
                
                if (prevCandle) {
                  // Генерируем синтетическую свечу на основе предыдущей
                  const basePrice = prevCandle.close
                  const variation = basePrice * 0.0001 // 0.01% вариация
                  
                  existingCandle = {
                    timestamp: ts,
                    open: basePrice,
                    high: basePrice + variation,
                    low: basePrice - variation,
                    close: basePrice,
                    volume: prevCandle.volume * 0.1
                  }
                }
              }
              
              if (existingCandle) {
                filledCandles.push(existingCandle)
              }
            }
            
            // Добавляем свечи ПОСЛЕ манипуляции (реальные данные)
            const candlesAfterAdj = mapped.filter((c: any) => c.timestamp > maxAdjEnd)
            filledCandles.push(...candlesAfterAdj)
            
            // Сортируем по времени
            mapped = filledCandles.sort((a, b) => a.timestamp - b.timestamp)
            console.log(`📊 Generated candles: ${candlesBeforeAdj.length} before, ${filledCandles.length - candlesBeforeAdj.length - candlesAfterAdj.length} during, ${candlesAfterAdj.length} after manipulation`)
          }
          
          // ✅ ПОЛНОСТЬЮ ПЕРЕСТРАИВАЕМ график по манипуляции
          if (hasAdj) {
            console.log(`🎯 Applying ${adjCheck.length} manipulation(s) to ${mapped.length} candles`)
            let manipulatedCount = 0
            let prevManipulatedClose: number | null = null
            
            const manipulated = mapped.map((candle: any, index: number) => {
              const candleStart = Number(candle.timestamp)
              const candleEnd = candleStart + periodMs
              let isManipulated = false
              let isPumpPhase = false
              let adjustmentValue = 0
              let progress = 0
              
              for (const adj of adjCheck) {
                const startMs = new Date(adj.startAt).getTime()
                const endMs = new Date(adj.endsAt).getTime()
                
                // ✅ Свеча должна быть ВНУТРИ периода манипуляции
                const intersects = candleStart >= startMs && candleStart < endMs
                
                if (intersects) {
                  isManipulated = true
                  const totalDuration = endMs - startMs
                  const elapsed = candleStart - startMs
                  progress = Math.max(0, Math.min(1, elapsed / totalDuration))
                  const PUMP_PHASE = 0.8
                  
                  isPumpPhase = progress <= PUMP_PHASE
                  adjustmentValue = adj.value
                }
              }
              
              if (isManipulated && Math.abs(adjustmentValue) > 0) {
                manipulatedCount++
                
                // Определяем размер движения для этой свечи
                const adj = adjCheck[0]
                
                // ✅ НЕПРЕРЫВНОСТЬ: open = close предыдущей свечи
                let newOpen = prevManipulatedClose !== null ? prevManipulatedClose : candle.close
                
                // Рассчитываем целевое смещение
                let targetOffset = 0
                if (adj.type === 'PERCENT') {
                  targetOffset = newOpen * adj.value / 100
                } else {
                  targetOffset = adj.value
                }
                
                const isPositiveAdj = adjustmentValue > 0
                let newClose: number
                
                const PUMP_PHASE = 0.8
                
                if (isPumpPhase) {
                  // PUMP (80%): движение к пику
                  const totalCandles = Math.floor((new Date(adj.endsAt).getTime() - new Date(adj.startAt).getTime()) / periodMs)
                  const stepSize = targetOffset / Math.max(totalCandles, 1)
                  
                  if (isPositiveAdj) {
                    newClose = newOpen + Math.abs(stepSize)  // Зеленая (рост)
                  } else {
                    newClose = newOpen - Math.abs(stepSize)  // Красная (падение)
                  }
                } else {
                  // DUMP (20%): плавное возвращение к реальной цене
                  const realPrice = candle.close // Реальная рыночная цена
                  
                  // Рассчитываем, сколько свечей в DUMP фазе
                  const startMs = new Date(adj.startAt).getTime()
                  const endMs = new Date(adj.endsAt).getTime()
                  const totalDuration = endMs - startMs
                  const pumpDuration = totalDuration * PUMP_PHASE
                  const dumpDuration = totalDuration * (1 - PUMP_PHASE)
                  const dumpCandles = Math.max(Math.floor(dumpDuration / periodMs), 1)
                  
                  // Расстояние от текущей цены до реальной
                  const distanceToReal = realPrice - newOpen
                  const dumpStep = distanceToReal / dumpCandles
                  
                  newClose = newOpen + dumpStep
                  
                  // Убеждаемся, что цвет правильный
                  // Если падаем (isPositiveAdj = true), то close < open (красная)
                  // Если растем (isPositiveAdj = false), то close > open (зеленая)
                  if (isPositiveAdj && newClose > newOpen) {
                    // Принудительно делаем красной
                    newClose = newOpen - Math.abs(dumpStep)
                  } else if (!isPositiveAdj && newClose < newOpen) {
                    // Принудительно делаем зеленой
                    newClose = newOpen + Math.abs(dumpStep)
                  }
                }
                
                // Добавляем реалистичные тени
                const bodySize = Math.abs(newClose - newOpen)
                const wickSize = Math.max(bodySize * 0.2, 1)  // Минимум 1
                const newHigh = Math.max(newOpen, newClose) + wickSize
                const newLow = Math.min(newOpen, newClose) - wickSize
                
                // Сохраняем close для следующей свечи
                prevManipulatedClose = newClose
                
                return {
                  ...candle,
                  open: newOpen,
                  high: newHigh,
                  low: newLow,
                  close: newClose,
                  volume: candle.volume,
                  _manipulated: true
                }
              }
              
              // Сбрасываем prevManipulatedClose если вышли из манипуляции
              if (!isManipulated) {
                prevManipulatedClose = null
              }
              
              return candle
            })
            
            console.log(`✅ Applied manipulation to ${manipulatedCount}/${mapped.length} candles`)
            
            return manipulated
          }
          
          this.historyCache.set(cacheKey, { data: mapped, savedAt: Date.now(), ttl: cacheTtl })
          return mapped
        })()

        this.inflight.set(cacheKey, fetchPromise)
        const result = await fetchPromise
        this.inflight.delete(cacheKey)
        return result
      } catch (error) {
        console.error('Error fetching data:', error)
        return this.generateFallbackData(symbol, period, from, to)
      }
    }

    private generateFallbackData(symbol: any, period: any, from: number, to: number) {
      const data = []
      const periodMs = this.getPeriodMs(period)
      const startTime = Math.max(from, Date.now() - periodMs * 100)
      
      for (let time = startTime; time <= to; time += periodMs) {
        const basePrice = symbol?.type === 'crypto' ? 100000 : (symbol?.type === 'CS' ? 5 : 1)
        const variation = 0.02
        const price = basePrice * (1 + (Math.random() - 0.5) * variation)
  
        data.push({
          timestamp: time,
          open: price,
          high: price * 1.01,
          low: price * 0.99,
          close: price,
          volume: Math.random() * 1000
        })
      }
      
      return data
    }

    getPeriodMs(period: any): number {
      const mult = period?.multiplier || 1
      const span = period?.timespan || 'minute'
      
      const msMap: Record<string, number> = {
        minute: 60 * 1000,
        hour: 60 * 60 * 1000,
        day: 24 * 60 * 60 * 1000,
        week: 7 * 24 * 60 * 60 * 1000,
        month: 30 * 24 * 60 * 60 * 1000
      }
      
      return (msMap[span] || 60000) * mult
    }

    subscribe(symbol: any, period: any, callback: (data: any) => void) {
      const key = `${symbol?.ticker}-${period?.multiplier}${period?.timespan}`
      const periodMs = this.getPeriodMs(period)
    
      const norm = String(symbol?.ticker || '').replace(/^C:/, '').replace(/^X:/, '')
      if (typeof window !== 'undefined') {
        if ((window as any).__currentChartSymbol !== norm) {
          ;(window as any).__currentChartSymbol = norm
        }
        // Сохраняем callback для внешних обновлений
        ;(window as any).__chartUpdateCallback = callback
      }
    
      this.barOpen.delete(key)
      this.barHigh.delete(key)
      this.barLow.delete(key)
      this.lastBarTs.delete(key)
      this.lastEmitted.delete(key)
    
      const tick = async () => {
        try {
          const now = Date.now()
          const from = now - periodMs * 3
          const data = await this.getHistoryKLineData(symbol, period, from, now)
        
          if (data && data.length > 0) {
            const lastBar = data[data.length - 1]
            const lastTs = this.lastBarTs.get(key)
            
            if (!lastTs || lastBar.timestamp > lastTs) {
              this.lastBarTs.set(key, lastBar.timestamp)
              this.barOpen.set(key, lastBar.open)
              this.barHigh.set(key, lastBar.high)
              this.barLow.set(key, lastBar.low)
              
              const bar = {
                timestamp: lastBar.timestamp,
                open: lastBar.open,
                high: lastBar.high,
                low: lastBar.low,
                close: lastBar.close,
                volume: lastBar.volume
              }
              
              this.lastEmitted.set(key, bar)
              callback(bar)
              
              if (onPriceUpdate) {
                const unifiedSymbol = (symbol?.shortName || symbol?.ticker || currentSymbol)
                  .replace('C:', '').replace('X:', '').replace('/', '').replace('USD', 'USD')
               
                onPriceUpdate({ 
                  symbol: { shortName: unifiedSymbol, ticker: unifiedSymbol }, 
                  price: lastBar.close 
                })
              }
            }
          }
        } catch (e) {
          console.error('Tick error:', e)
        }
      }
      
      tick()
      const tickInterval = (period?.timespan === 'day' || period?.timespan === 'week' || period?.timespan === 'month') ? 300000 : 60000
      
      const t = setInterval(tick, tickInterval)
      this.timers.set(key, t)
      this.allTimers.push(t)
    }

    unsubscribe(symbol: any, period: any) {
      const key = `${symbol?.ticker}-${period?.multiplier}${period?.timespan}`
      const timer = this.timers.get(key)
      if (timer) {
        clearInterval(timer)
        this.timers.delete(key)
      }
    }

    stopAll() {
      try {
        for (const t of this.allTimers) clearInterval(t)
      } catch {}
      this.allTimers = []
      this.timers.forEach((t) => clearInterval(t))
      this.timers.clear()
    }

    clearCache() {
      this.barOpen.clear()
      this.barHigh.clear()
      this.barLow.clear()
      this.lastBarTs.clear()
      this.lastEmitted.clear()
      this.historyCache.clear()
      this.inflight.clear()
      this.backoffMs.clear()
      console.log('PolygonDatafeed cache cleared completely')
    }

    async searchSymbols(query: string) {
      try {
        const response = await fetch('/api/curated-symbols')
        if (response.ok) {
          const data = await response.json()
          return data.data || []
        }
      } catch (error) {
        console.error('Error searching symbols:', error)
      }
      
      const fallback = [
        { ticker: 'BTCUSD', name: 'Bitcoin / US Dollar', shortName: 'BTC/USD', exchange: 'CRYPTO', market: 'crypto', type: 'crypto', priceCurrency: 'USD', pricePrecision: 2 },
        { ticker: 'SPCE', name: 'Virgin Galactic', shortName: 'SPCE', exchange: 'XNYS', market: 'stocks', type: 'CS', priceCurrency: 'USD', pricePrecision: 2 }
      ]

      if (!query) return fallback
      
      const q = query.toLowerCase()
      return fallback.filter((s: any) => 
        s.name.toLowerCase().includes(q) ||
        s.shortName.toLowerCase().includes(q)
      )
    }
  }

  // Live обновление для активной манипуляции - каждую секунду
  useEffect(() => {
    if (!isManipulating) {
      // Очищаем интервал если манипуляция неактивна
      if (liveManipulationIntervalRef.current) {
        clearInterval(liveManipulationIntervalRef.current)
        liveManipulationIntervalRef.current = null
      }
      lastManipulatedCandleRef.current = null
      manipulationStartPriceRef.current = null  // Сброс стартовой цены
      return
    }

    // КРИТИЧЕСКАЯ ПРОВЕРКА: если интервал уже запущен, не создаем новый
    if (liveManipulationIntervalRef.current) {
      console.log('⚠️ Live manipulation already running, skipping duplicate')
      return
    }

    console.log('🎯 Starting live manipulation - smooth update every 100ms')

    const updateLiveCandle = async () => {
      if (!datafeedRef.current || !chartRef.current) return

      try {
        const symbol = getSymbolConfig(currentSymbol)
        const period = chartRef.current.getPeriod?.() || { multiplier: 1, timespan: 'minute' }
        const now = Date.now()
        const periodMs = datafeedRef.current.getPeriodMs(period)
        const currentCandleTime = Math.floor(now / periodMs) * periodMs

        // Если есть сохраненная свеча с таким же timestamp - используем её как базу
        let baseCandle = lastManipulatedCandleRef.current
        
        // Если timestamp изменился или свечи нет - получаем новую
        if (!baseCandle || baseCandle.timestamp !== currentCandleTime) {
          const from = currentCandleTime - periodMs * 2
          const rawData = await datafeedRef.current.getHistoryKLineData(symbol, period, from, now)
          if (!rawData || rawData.length === 0) return
          baseCandle = rawData[rawData.length - 1]
          
          // Сбрасываем сглаживание для новой свечи
          delete lastDisplayedRef.current[baseCandle.timestamp]
        }

        // Получаем манипуляции
        const adjustments = (window as any).__currentAdjustments || []
        if (!adjustments || adjustments.length === 0) {
          // если манипуляций нет — обновляем lastDisplayedRef для корректной синхронизации и return
          lastDisplayedRef.current[baseCandle.timestamp] = baseCandle.close
          return
        }

        // Берём только первую активную манипуляцию (можно расширить логику для нескольких)
        const adj = adjustments[0]
        const startTime = new Date(adj.startAt).getTime()
        const endTime = new Date(adj.endsAt).getTime()
        
        // ✅ Если манипуляция завершена - показываем реальные котировки и продолжаем обновление
        if (now >= endTime) {
          lastDisplayedRef.current[baseCandle.timestamp] = baseCandle.close
          manipulationStartPriceRef.current = null
          lastManipulatedCandleRef.current = null
          
          // Останавливаем live манипуляцию
          setIsManipulating(false)
          console.log('✅ Manipulation ended, switching to real quotes')
          
          // Обновляем график реальной свечой
          const updateCallback = (window as any).__chartUpdateCallback
          if (typeof updateCallback === 'function') {
            updateCallback(baseCandle)
          }
          
          // Обновляем цену
          if (onPriceUpdate) {
            const unifiedSymbol = (symbol?.shortName || symbol?.ticker || currentSymbol)
              .replace('C:', '').replace('X:', '').replace('/', '')
            onPriceUpdate({
              symbol: { shortName: unifiedSymbol, ticker: unifiedSymbol },
              price: baseCandle.close
            })
          }
          return  // Выходим, т.к. манипуляция закончена
        }
        
        const totalDuration = Math.max(1, endTime - startTime)
        const elapsed = Math.max(0, Math.min(totalDuration, now - startTime))
        const progress = Math.max(0, Math.min(1, elapsed / totalDuration))

        // PUMP_PHASE
        const PUMP_PHASE = 0.8
        let isPumpPhase = false
        
        if (progress <= PUMP_PHASE) {
          isPumpPhase = true
        } else {
          isPumpPhase = false
        }

        const lastTs = baseCandle.timestamp
        const adjustmentValue = adj.value
        const isPositiveAdjustment = adjustmentValue > 0
        
        // ✅ НЕПРЕРЫВНОСТЬ: используем close предыдущей свечи
        const prevManipulatedCandle = lastManipulatedCandleRef.current
        let currentOpen: number
        
        // Если это та же свеча (тот же timestamp) - сохраняем open
        // Если новая свеча - open = close предыдущей
        if (prevManipulatedCandle && prevManipulatedCandle.timestamp === lastTs) {
          currentOpen = prevManipulatedCandle.open
        } else if (prevManipulatedCandle && prevManipulatedCandle.close) {
          currentOpen = prevManipulatedCandle.close  // НЕПРЕРЫВНОСТЬ
        } else {
          currentOpen = baseCandle.close
        }
        
        // ✅ СОХРАНЯЕМ СТАРТОВУЮ ЦЕНУ при начале манипуляции
        const adjId = adj.id || `${adj.startAt}-${adj.value}`
        if (!manipulationStartPriceRef.current || manipulationStartPriceRef.current.adjId !== adjId) {
          manipulationStartPriceRef.current = {
            adjId: adjId,
            price: currentOpen
          }
        }
        
        const startPrice = manipulationStartPriceRef.current.price
        
        // ✅ КРИТИЧЕСКИ ВАЖНО: Вычисляем целевую цену относительно базовой
        let targetPrice: number
        if (adj.type === 'PERCENT') {
          // Для процентов: целевая цена = базовая * (1 + процент/100)
          targetPrice = startPrice * (1 + adj.value / 100)
        } else {
          // Для абсолютных значений: целевая цена = базовая + значение
          targetPrice = startPrice + adj.value
        }
        
        // Вычисляем коэффициент изменения относительно базовой цены
        const fullShiftCoefficient = (targetPrice - startPrice) / startPrice
        
        // Вычисляем targetClose в зависимости от фазы
        let targetClose: number
        
        // Получаем реальную рыночную цену для плавного возврата
        const realMarketPrice = baseCandle.close
        
        // ✅ ПРАВИЛЬНАЯ ЛОГИКА PUMP/DUMP с применением коэффициента
        if (isPumpPhase) {
          // PUMP фаза: плавное движение от startPrice к targetPrice
          const pumpProgress = progress / PUMP_PHASE
          const currentShiftCoefficient = fullShiftCoefficient * pumpProgress
          // Применяем коэффициент к текущей рыночной цене
          targetClose = realMarketPrice * (1 + currentShiftCoefficient)
        } else {
          // DUMP фаза: плавное движение от targetPrice к РЕАЛЬНОЙ рыночной цене
          const dumpProgress = (progress - PUMP_PHASE) / (1 - PUMP_PHASE)
          const peakPrice = realMarketPrice * (1 + fullShiftCoefficient)
          targetClose = peakPrice + (realMarketPrice - peakPrice) * dumpProgress
        }
        
        // ✅ БЕЗ СГЛАЖИВАНИЯ для непрерывности (обновления каждые 100мс уже плавные)
        // Создаем свечу
        const newOpen = currentOpen
        const newClose = targetClose  // Используем прямо targetClose без сглаживания
        
        // Добавляем реалистичные тени
        const bodySize = Math.abs(newClose - newOpen)
        const wickSize = Math.max(bodySize * 0.2, 1)
        const newHigh = Math.max(newOpen, newClose) + wickSize
        const newLow = Math.min(newOpen, newClose) - wickSize

        const updatedCandle = {
          timestamp: lastTs,
          open: newOpen,
          high: newHigh,
          low: newLow,
          close: newClose,
          volume: baseCandle.volume
        }

        // ✅ ПРАВИЛЬНОЕ РЕШЕНИЕ: Обновляем через datafeed callback
        try {
          // Сохраняем последнюю манипулированную свечу
          lastManipulatedCandleRef.current = updatedCandle
          
          // Используем callback из subscribe для обновления графика
          const updateCallback = (window as any).__chartUpdateCallback
          if (typeof updateCallback === 'function') {
            // Вызываем callback так же, как это делает tick в subscribe
            updateCallback(updatedCandle)
            // console.log('📊 Live candle updated via callback:', newClose.toFixed(2))
          } else {
            console.warn('⚠️ Chart update callback not available')
          }
        } catch (e) {
          console.error('Live update error:', e)
        }

        // Передаём цену наружу
        if (onPriceUpdate) {
          const unifiedSymbol = (symbol?.shortName || symbol?.ticker || currentSymbol)
            .replace('C:', '').replace('X:', '').replace('/', '')
          onPriceUpdate({
            symbol: { shortName: unifiedSymbol, ticker: unifiedSymbol },
            price: newClose
          })
        }
      } catch (e) {
        console.error('Live update error (smooth):', e)
      }
    }

    // Первое обновление сразу
    updateLiveCandle()
    
    // ✅ ИЗМЕНЕНО: обновление каждые 100мс для более плавного движения
    liveManipulationIntervalRef.current = setInterval(updateLiveCandle, 100)
    
    return () => {
      if (liveManipulationIntervalRef.current) {
        clearInterval(liveManipulationIntervalRef.current)
        liveManipulationIntervalRef.current = null
        console.log('🧹 Live manipulation interval cleaned up')
      }
    }
  }, [isManipulating, currentSymbol, getSymbolConfig, onPriceUpdate])

  // Чистим старые записи из lastDisplayedRef для экономии памяти
  useEffect(() => {
    const t = setInterval(() => {
      try {
        const now = Date.now()
        const keepWindow = 1000 * 60 * 60 // 1 час
        for (const tsStr of Object.keys(lastDisplayedRef.current)) {
          const ts = Number(tsStr)
          if (isNaN(ts)) continue
          if (now - ts > keepWindow) {
            delete lastDisplayedRef.current[ts]
          }
        }
      } catch {}
    }, 60 * 1000) // раз в минуту
    return () => clearInterval(t)
  }, [])

  // Основной эффект для создания графика
  useEffect(() => {
    if (!containerRef.current) return

    // КРИТИЧЕСКАЯ проверка: если контейнер уже содержит элементы, значит график уже создан
    if (containerRef.current.children.length > 0) {
      console.log('⚠️ Chart container already has children, skipping initialization')
      return
    }

    // Проверяем, что график еще не инициализирован через ref
    if (isInitializedRef.current && chartRef.current) {
      console.log('⚠️ Chart already initialized via ref, skipping duplicate')
      return
    }

    console.log('🔄 Initializing chart for symbol:', currentSymbol)

    if (updateTimerRef.current) {
      clearInterval(updateTimerRef.current)
      updateTimerRef.current = null
    }

    if (chartRef.current) {
      try {
        if (datafeedRef.current) {
          datafeedRef.current.stopAll()
        }
        chartRef.current.destroy?.()
        chartRef.current = null
      } catch (error) {
        console.error('Error destroying chart:', error)
      }
    }

    // Полностью очищаем контейнер и удаляем все дочерние элементы
    if (containerRef.current) {
      while (containerRef.current.firstChild) {
        containerRef.current.removeChild(containerRef.current.firstChild)
      }
    }

    const symbolConfig = getSymbolConfig(currentSymbol)
    console.log('📊 Chart config:', symbolConfig)

    const datafeed = new PolygonDatafeed(process.env.NEXT_PUBLIC_POLYGON_API_KEY || '')
    datafeed.clearCache()
    datafeedRef.current = datafeed

    const defaultPeriod = symbolConfig.type === 'CS' 
      ? { multiplier: 1, timespan: 'day', text: '1D' }
      : { multiplier: 1, timespan: 'minute', text: '1m' }

    // Динамический импорт KLineChartPro
    let chart: any = null
    
    const initChart = async () => {
      try {
        // Устанавливаем флаг сразу
        isInitializedRef.current = true

        const { KLineChartPro } = await import('@klinecharts/pro')
        
        if (!containerRef.current) {
          console.log('⚠️ Container ref is null, aborting chart init')
          isInitializedRef.current = false
          return
        }

        // Финальная проверка перед созданием - если уже есть дочерние элементы, значит график уже создан
        if (containerRef.current.children.length > 0) {
          console.log('⚠️ Container already has children before chart creation, aborting')
          isInitializedRef.current = false
          return
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

        await loadAdjustments()
      } catch (error) {
        console.error('Error loading KLineChartPro:', error)
        isInitializedRef.current = false
      }
    }

    initChart()

    return () => {
      isInitializedRef.current = false
      
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
        datafeedRef.current = null
        ;(window as any).__currentChart = null
        
        // Очищаем контейнер при размонтировании
        if (containerRef.current) {
          while (containerRef.current.firstChild) {
            containerRef.current.removeChild(containerRef.current.firstChild)
          }
        }
      } catch {}
    }
  }, [currentSymbol])

  // SSE для мгновенного обновления
  useEffect(() => {
    try {
      if (sseRef.current) {
        try { sseRef.current.close() } catch {}
        sseRef.current = null
      }

      const url = `/api/realtime/adjustments?symbol=${encodeURIComponent(currentSymbol)}`
      const es = new EventSource(url)
      sseRef.current = es

      es.onmessage = async (ev) => {
        try {
          const msg = JSON.parse(ev.data || '{}')
          if (!msg) return
          
          if (msg.type === 'ready' || msg.type === 'created' || msg.type === 'updated' || msg.type === 'deleted') {
            // loadAdjustments уже очищает кеш и обновляет график
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
  }, [currentSymbol])

  return (
    <div className={`${className} h-full`}>
      <div className="relative border rounded-lg overflow-hidden h-full">
        <div ref={containerRef} className="w-full h-full" />
      </div>
    </div>
  )
}

// Мемоизируем компонент для предотвращения лишних ре-рендеров
export default memo(KLineChartProComponent)