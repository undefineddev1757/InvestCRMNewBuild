"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { RefreshCw, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { MassImportSymbols } from '@/components/admin/mass-import-symbols'
import { Badge } from '@/components/ui/badge'

type SymbolRow = {
  id: string
  name: string
  ticker?: string | null
  min_qty: string
  qty_step: string
  price_step: string
  allowed_leverages: number[]
  mmr: string
  fee_taker: string
  fee_maker: string
  mark_price_source: string | null
  type?: string | null
  market?: string | null
  logo_url?: string
  created_at: string | Date
  updated_at: string | Date
}

function getCryptoIconUrl(symbol: string): string | undefined {
  const base = symbol.replace(/USD$/i, '').toLowerCase()
  if (base === 'btc' || base === 'eth') {
    return `https://cryptoicons.org/api/icon/${base}/64`
  }
  return undefined
}

function getStockIconUrl(symbol: string): string | undefined {
  if (symbol === 'AAPL') return 'https://s3-symbol-logo.tradingview.com/apple.svg'
  return undefined
}

function getForexFlags(symbol: string): string | undefined {
  const pairs: Record<string, string> = {
    EURUSD: '🇪🇺🇺🇸',
    GBPUSD: '🇬🇧🇺🇸',
    USDJPY: '🇺🇸🇯🇵',
  }
  return pairs[symbol]
}

// Функция для получения логотипа символа
async function getSymbolLogo(symbol: string): Promise<string | null> {
  try {
    // 1. Попробуем CryptoIcons для популярных криптовалют
    const cryptoIconsMap: Record<string, string> = {
      'BTCUSD': 'btc',
      'ETHUSD': 'eth', 
      'XRPUSD': 'xrp',
      'ADAUSD': 'ada',
      'LTCUSD': 'ltc',
      'DOGEUSD': 'doge',
      'DOTUSD': 'dot',
      'LINKUSD': 'link',
      'UNIUSD': 'uni',
      'AAVEUSD': 'aave',
      'SOLUSD': 'sol',
      'AVAXUSD': 'avax',
      'MATICUSD': 'matic',
      'ATOMUSD': 'atom',
      'NEARUSD': 'near'
    }
    
    const cryptoId = cryptoIconsMap[symbol.toUpperCase()]
    if (cryptoId) {
      return `https://cryptoicons.org/api/icon/${cryptoId}/64`
    }
    
    // 2. Попробуем CoinGecko для других криптовалют
    if (symbol.includes('USD') && symbol.length > 3) {
      const baseSymbol = symbol.replace('USD', '').toLowerCase()
      const response = await fetch(`https://api.coingecko.com/api/v3/coins/${baseSymbol}`)
      if (response.ok) {
        const data = await response.json()
        return data.image?.small || null
      }
    }
    
    // 3. Попробуем TradingView API для акций
    const tvResponse = await fetch(`https://symbol-search.tradingview.com/symbol_search/?text=${symbol}&exchange=&lang=en&search_type=undefined&domain=production&sort_by_country=US`)
    if (tvResponse.ok) {
      const data = await tvResponse.json()
      if (data.length > 0) {
        return data[0].logo_url || null
      }
    }
    
    // 4. Fallback на статические иконки
    return getCryptoIconUrl(symbol) || getStockIconUrl(symbol) || null
  } catch (error) {
    console.error('Error fetching logo:', error)
    return null
  }
}

export default function AdminPairsPage() {
  const [symbols, setSymbols] = useState<SymbolRow[]>([])
  const [loading, setLoading] = useState(true)
  const [prices, setPrices] = useState<Record<string, number>>({})
  const [meta, setMeta] = useState<Record<string, { imageUrl?: string; emojiFallback?: string }>>({})
  const [editing, setEditing] = useState<null | any>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<any>({ name: '', ticker: '', type: 'crypto', market: 'crypto', min_qty: '0.0001', qty_step: '0.0001', price_step: '0.0001', mmr: '0.005', fee_taker: '0', fee_maker: '0', logo_url: '' })
  const [query, setQuery] = useState('')
  const [adjOpen, setAdjOpen] = useState<null | SymbolRow>(null)
  const [adjForm, setAdjForm] = useState<{ type: 'PERCENT' | 'ABSOLUTE'; value: string; minutes: string }>({ type: 'PERCENT', value: '0,5', minutes: '10' })
  const [adjActive, setAdjActive] = useState<any[]>([])
  const [adjLoading, setAdjLoading] = useState(false)
  const [adjBasePrice, setAdjBasePrice] = useState<number | undefined>(undefined)
  const [historyOpen, setHistoryOpen] = useState<null | SymbolRow>(null)
  const [history, setHistory] = useState<any[]>([])
  const [deleting, setDeleting] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetchSymbols()
  }, [])

  const fetchSymbols = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/symbols')
      if (res.ok) {
        const data = await res.json()
        setSymbols(data.symbols || [])
        // Сразу показываем таблицу, а метаданные/цены подтянем в фоне
        setLoading(false)
        ;(async () => {
          try {
            const m = await fetch('/api/v1/symbols/meta')
            if (m.ok) {
              const j = await m.json()
              setMeta(j.meta || {})
            } else {
              setMeta({})
            }
          } catch { setMeta({}) }
          const list: SymbolRow[] = data.symbols || []
          if (Array.isArray(list) && list.length) {
            try {
              const entries = await Promise.all(
                list.map(async (s: SymbolRow) => {
                  try {
                    const r = await fetch(`/api/v1/prices/${encodeURIComponent(s.name)}`)
                    if (!r.ok) return [s.name, undefined] as const
                    const j = await r.json()
                    return [s.name, Number(j.mark)] as const
                  } catch { return [s.name, undefined] as const }
                })
              )
              const next: Record<string, number> = {}
              for (const [name, price] of entries) {
                if (typeof price === 'number' && Number.isFinite(price)) next[name] = price
              }
              setPrices(next)
            } catch { setPrices({}) }
          } else { setPrices({}) }
        })()
      }
    } catch (e) {
      console.error('Error fetching symbols', e)
    } finally {
      // loading уже выключен ранее; оставим страховку
      setLoading(false)
    }
  }

  const openEdit = (s: SymbolRow) => {
    setEditing(s)
    setForm({
      name: s.name,
      ticker: s.ticker || '',
      type: s.type || 'crypto',
      market: s.market || 'crypto',
      min_qty: s.min_qty,
      qty_step: s.qty_step,
      price_step: s.price_step,
      mmr: s.mmr,
      fee_taker: s.fee_taker,
      fee_maker: s.fee_maker,
      mark_price_source: s.mark_price_source || ''
    })
  }

  const saveEdit = async () => {
    if (!editing) return
    const res = await fetch(`/api/admin/symbols/${editing.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(form) })
    if (res.ok) {
      setEditing(null)
      await fetchSymbols()
    } else {
      alert('Ошибка сохранения')
    }
  }

  const openCreate = () => {
    setCreating(true)
    setForm({ name: '', ticker: '', type: 'crypto', market: 'crypto', min_qty: '0.0001', qty_step: '0.0001', price_step: '0.0001', mmr: '0.005', fee_taker: '0', fee_maker: '0', logo_url: '' })
  }

  const autoFetchLogo = async () => {
    if (!form.name) return
    try {
      const logo = await getSymbolLogo(form.name)
      if (logo) {
        setForm({ ...form, logo_url: logo })
      }
    } catch (error) {
      console.error('Error fetching logo:', error)
    }
  }

  const stopAdjustment = async (symbol: string) => {
    try {
      const activeAdj = adjActive.find(a => a.symbol === symbol)
      if (activeAdj) {
        const res = await fetch(`/api/admin/symbols/adjustments/${activeAdj.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endsAt: new Date().toISOString() })
        })
        if (res.ok) {
          // Обновляем список активных корректировок
          setAdjActive(prev => prev.filter(a => a.symbol !== symbol))
          alert('Корректировка остановлена')
        } else {
          alert('Ошибка остановки корректировки')
        }
      }
    } catch (error) {
      console.error('Error stopping adjustment:', error)
      alert('Ошибка остановки корректировки')
    }
  }

  const saveCreate = async () => {
    const res = await fetch('/api/admin/symbols', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(form) })
    if (res.ok) {
      setCreating(false)
      await fetchSymbols()
    } else {
      alert('Ошибка создания')
    }
  }

  const deleteSymbol = async (row: SymbolRow) => {
    if (!row?.id) return
    if (!confirm(`Удалить пару ${row.name}? Вы уверены?`)) return
    try {
      setDeleting(prev => ({ ...prev, [row.id]: true }))
      const res = await fetch(`/api/admin/symbols/${row.id}`, { method: 'DELETE' })
      if (!res.ok) {
        alert('Не удалось удалить пару')
        return
      }
      await fetchSymbols()
    } catch (e) {
      alert('Ошибка сети при удалении')
    } finally {
      setDeleting(prev => ({ ...prev, [row.id]: false }))
    }
  }


  return (
    <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Торговые пары</h1>
          <div className="flex items-center gap-2">
            <input
              value={query}
              onChange={(e)=>setQuery(e.target.value)}
              placeholder="Поиск символа"
              className="h-9 w-64 border rounded px-3 text-sm"
            />
          <Button variant="outline" size="sm" onClick={fetchSymbols}>
            <RefreshCw className="h-4 w-4 mr-2" /> Обновить
          </Button>
          <MassImportSymbols onImportComplete={fetchSymbols} />
            <Button variant="outline" size="sm" onClick={openCreate}>Добавить</Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Всего пар: {symbols.length}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Загрузка...</div>
          ) : symbols.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">Нет данных по парам</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Картинка</TableHead>
                  <TableHead>Символ</TableHead>
                  <TableHead>Ticker</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Market</TableHead>
                  <TableHead>Цена</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(symbols.filter(s => {
                  if (!query) return true
                  const q = query.toLowerCase()
                  return (
                    s.name.toLowerCase().includes(q) ||
                    (s.mark_price_source || '').toLowerCase().includes(q)
                  )
                })).map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <Avatar className="h-9 w-9">
                        {s.logo_url ? (
                          <AvatarImage src={s.logo_url} alt={s.name} />
                        ) : getCryptoIconUrl(s.name) ? (
                          <AvatarImage src={getCryptoIconUrl(s.name)} alt={s.name} />
                        ) : getStockIconUrl(s.name) ? (
                          <AvatarImage src={getStockIconUrl(s.name)} alt={s.name} />
                        ) : getForexFlags(s.name) ? (
                          <div className="text-lg">{getForexFlags(s.name)}</div>
                        ) : null}
                        <AvatarFallback className="text-base">{s.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="font-mono text-xs">{s.ticker || '—'}</TableCell>
                    <TableCell className="uppercase text-xs">{s.type || '—'}</TableCell>
                    <TableCell className="uppercase text-xs">{s.market || '—'}</TableCell>
                    <TableCell>
                      {prices[s.name] !== undefined ? Number(prices[s.name]).toFixed(2) : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {adjActive.find(a => a.symbol === s.name) ? (
                          <>
                            <Badge variant="destructive">Активна</Badge>
                            <Button size="sm" variant="destructive" onClick={() => stopAdjustment(s.name)}>
                              Стоп
                            </Button>
                          </>
                        ) : (
                          <Button size="sm" onClick={async ()=>{ 
                            setAdjOpen(s); 
                            setAdjForm({ type: 'PERCENT', value: '0,5', minutes: '10' }); 
                            try { 
                              const r = await fetch(`/api/admin/symbols/adjustments?symbol=${encodeURIComponent(s.name)}`)
                              const j = await r.json();
                              setAdjActive(Array.isArray(j.adjustments)? j.adjustments : [])
                            } catch { setAdjActive([]) }
                            
                            // Загружаем актуальную цену
                            try {
                              const pr = await fetch(`/api/v1/prices/${encodeURIComponent(s.name)}`, { cache: 'no-store' })
                              if (pr.ok) { 
                                const pj = await pr.json(); 
                                const p = Number(pj?.mark ?? pj?.last ?? pj?.price); 
                                if (Number.isFinite(p) && p > 0) {
                                  setAdjBasePrice(p);
                                  // Обновляем цену в таблице для синхронизации
                                  setPrices(prev => ({ ...prev, [s.name]: p }))
                                } else {
                                  setAdjBasePrice(undefined) 
                                }
                              } else {
                                setAdjBasePrice(undefined)
                              }
                            } catch (e) { 
                              console.error('Error loading price:', e)
                              setAdjBasePrice(undefined) 
                            }
                          }}>Изменить цену</Button>
                        )}
                        <Button size="sm" variant="secondary" onClick={async ()=>{
                          setHistoryOpen(s)
                          try {
                            const res = await fetch(`/api/admin/symbols/adjustments?symbol=${encodeURIComponent(s.name)}&all=1`)
                            const j = await res.json()
                            setHistory(j.adjustments || [])
                          } catch { setHistory([]) }
                        }}>История</Button>
                        <Button size="sm" variant="destructive" onClick={()=>deleteSymbol(s)} disabled={!!deleting[s.id]}>
                          {deleting[s.id] ? 'Удаление...' : 'Удалить'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Adjustment Dialog */}
      <Dialog open={!!adjOpen} onOpenChange={(v)=>{ if(!v){ setAdjOpen(null); setAdjActive([]); setAdjBasePrice(undefined) } }}>
        <DialogContent className="max-w-2xl w-[80vw] p-6">
          <DialogHeader className="pb-4">
            <DialogTitle>Корректировка графика</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground">Символ</label>
              <input className="w-full border rounded h-9 px-3 text-sm bg-muted/40" value={adjOpen?.name || ''} disabled readOnly />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Базовая цена (Polygon)</label>
              <input 
                className="w-full border rounded h-9 px-3 text-sm bg-muted/40" 
                value={adjBasePrice !== undefined ? adjBasePrice.toFixed(2) : 'Загрузка...'} 
                disabled 
                readOnly 
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Тип</label>
              <select className="w-full border rounded h-9 px-3 text-sm bg-muted/40" value={adjForm.type} onChange={(e)=>setAdjForm({ ...adjForm, type: e.target.value as any })}>
                <option value="PERCENT">Процент (%)</option>
                <option value="ABSOLUTE">Абсолютное значение</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Значение {adjForm.type === 'PERCENT' ? '(%)' : '($)'}</label>
              <input className="w-full border rounded h-9 px-3 text-sm bg-muted/40" value={adjForm.value} onChange={(e)=>setAdjForm({ ...adjForm, value: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Длительность (минут)</label>
              <input className="w-full border rounded h-9 px-3 text-sm bg-muted/40" value={adjForm.minutes} onChange={(e)=>setAdjForm({ ...adjForm, minutes: e.target.value })} />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" onClick={()=>{ setAdjOpen(null); setAdjBasePrice(undefined) }}>Отмена</Button>
              <Button onClick={async ()=>{
                if (!adjOpen) return
                
                // Используем уже загруженную базовую цену или загружаем свежую
                let basePrice: number | undefined = adjBasePrice
                if (!basePrice || !Number.isFinite(basePrice)) {
                  try { 
                    const pr = await fetch(`/api/v1/prices/${encodeURIComponent(adjOpen.name)}`, { cache: 'no-store' })
                    if (pr.ok) { 
                      const pj = await pr.json()
                      const p = Number(pj?.mark ?? pj?.last ?? pj?.price)
                      if (Number.isFinite(p) && p > 0) {
                        basePrice = p
                        setAdjBasePrice(p)
                        setPrices(prev => ({ ...prev, [adjOpen.name]: p }))
                      }
                    }
                  } catch (e) {
                    console.error('Error loading price:', e)
                  }
                }
                
                // Конвертируем запятую в точку для правильного парсинга числа
                const valueStr = adjForm.value.replace(',', '.')
                const value = Number(valueStr)
                const minutes = Number(adjForm.minutes)
                
                if (isNaN(value) || isNaN(minutes)) {
                  alert('Проверьте правильность введенных значений')
                  return
                }
                
                const res = await fetch('/api/admin/symbols/adjustments', { 
                  method: 'POST', 
                  headers: { 'content-type':'application/json' }, 
                  body: JSON.stringify({ 
                    symbol: adjOpen.name, 
                    type: adjForm.type, 
                    value: value, 
                    minutes: minutes, 
                    basePrice 
                  }) 
                })
                
                if (res.ok) {
                  setAdjOpen(null)
                  setAdjBasePrice(undefined)
                  // Обновляем список активных корректировок
                  await fetchSymbols()
                } else {
                  alert('Ошибка создания корректировки')
                }
              }}>Создать корректировку</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={!!historyOpen} onOpenChange={(v)=>!v && setHistoryOpen(null)}>
        <DialogContent className="max-w-4xl w-[90vw] max-h-[80vh] p-6">
          <DialogHeader className="pb-4">
            <DialogTitle>История изменения: {historyOpen?.name}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-auto px-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-3 px-4 font-semibold">Тип</th>
                  <th className="py-3 px-4 font-semibold">Значение</th>
                  <th className="py-3 px-4 font-semibold">Старт</th>
                  <th className="py-3 px-4 font-semibold">Окончание</th>
                  <th className="py-3 px-4 font-semibold">Минут</th>
                  <th className="py-3 px-4 font-semibold">Действие</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 && (
                  <tr><td colSpan={6} className="py-8 px-4 text-center text-muted-foreground">Нет записей</td></tr>
                )}
                {history.map((h: any) => {
                  const now = Date.now()
                  const start = new Date(h.startAt).getTime()
                  const end = new Date(h.endsAt).getTime()
                  const isActive = now >= start && now <= end
                  
                  return (
                    <tr key={h.id} className="border-t hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-4">{h.type}</td>
                      <td className="py-3 px-4">{h.value}</td>
                      <td className="py-3 px-4">{new Date(h.startAt).toLocaleString('ru-RU')}</td>
                      <td className="py-3 px-4">{new Date(h.endsAt).toLocaleString('ru-RU')}</td>
                      <td className="py-3 px-4">{h.durationMinutes}</td>
                      <td className="py-3 px-4">
                        {isActive ? (
                          <Button 
                            size="sm" 
                            variant="destructive" 
                            onClick={async () => {
                              if (!confirm('Остановить корректировку?')) return
                              try {
                                const res = await fetch(`/api/admin/symbols/adjustments/${h.id}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ endsAt: new Date().toISOString() })
                                })
                                if (res.ok) {
                                  alert('Корректировка остановлена')
                                  // Обновляем историю
                                  const historyRes = await fetch(`/api/admin/symbols/adjustments?symbol=${encodeURIComponent(historyOpen?.name || '')}&all=1`)
                                  if (historyRes.ok) {
                                    const historyJson = await historyRes.json()
                                    setHistory(historyJson.adjustments || [])
                                  }
                                } else {
                                  alert('Ошибка остановки корректировки')
                                }
                              } catch (error) {
                                console.error('Error stopping adjustment:', error)
                                alert('Ошибка остановки корректировки')
                              }
                            }}
                            className="h-6 px-2 text-xs"
                          >
                            Стоп
                          </Button>
                        ) : (
                          <div className="flex items-center gap-1 text-muted-foreground text-xs">
                            {now < start ? (
                              <>
                                <Clock className="h-3 w-3" />
                                <span>Ожидает</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-3 w-3 text-green-500" />
                                <span>Завершена</span>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setHistoryOpen(null)}>Закрыть</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Create Dialog */}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-w-2xl w-[80vw] p-6">
          <DialogHeader className="pb-4">
            <DialogTitle>Новый символ</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground">Символ</label>
              <div className="flex gap-2">
                <input className="flex-1 border rounded px-2 h-8" value={form.name} onChange={(e)=>setForm({ ...form, name: e.target.value })} />
                <Button size="sm" variant="outline" onClick={autoFetchLogo} disabled={!form.name}>
                  🖼️ Авто
                </Button>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Polygon Ticker</label>
              <input className="w-full border rounded px-2 h-8" value={form.ticker} onChange={(e)=>setForm({ ...form, ticker: e.target.value })} placeholder="например, X:BTCUSD" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Тип</label>
              <select className="w-full border rounded h-8 px-2" value={form.type} onChange={(e)=>setForm({ ...form, type: e.target.value })}>
                <option value="crypto">crypto</option>
                <option value="forex">forex</option>
                <option value="stock">stock</option>
                <option value="index">index</option>
                <option value="commodity">commodity</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Рынок</label>
              <input className="w-full border rounded px-2 h-8" value={form.market} onChange={(e)=>setForm({ ...form, market: e.target.value })} placeholder="crypto | US | forex | metals" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">URL логотипа</label>
              <input className="w-full border rounded px-2 h-8" value={form.logo_url} onChange={(e)=>setForm({ ...form, logo_url: e.target.value })} placeholder="https://..." />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">MMR</label>
              <input className="w-full border rounded px-2 h-8" value={form.mmr} onChange={(e)=>setForm({ ...form, mmr: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Шаг цены</label>
              <input className="w-full border rounded px-2 h-8" value={form.price_step} onChange={(e)=>setForm({ ...form, price_step: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Шаг объема</label>
              <input className="w-full border rounded px-2 h-8" value={form.qty_step} onChange={(e)=>setForm({ ...form, qty_step: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Мин. объем</label>
              <input className="w-full border rounded px-2 h-8" value={form.min_qty} onChange={(e)=>setForm({ ...form, min_qty: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Комиссия taker</label>
              <input className="w-full border rounded px-2 h-8" value={form.fee_taker} onChange={(e)=>setForm({ ...form, fee_taker: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Комиссия maker</label>
              <input className="w-full border rounded px-2 h-8" value={form.fee_maker} onChange={(e)=>setForm({ ...form, fee_maker: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setCreating(false)}>Отмена</Button>
            <Button onClick={saveCreate}>Создать</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
