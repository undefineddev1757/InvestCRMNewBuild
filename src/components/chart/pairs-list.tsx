"use client"

import { useEffect, useMemo, useState } from 'react'
import { useUser } from '@/contexts/user-context'
import { useLanguage } from '@/contexts/language-context'
import { authenticatedFetch } from '@/lib/api-client'

type Pair = {
  ticker: string
  shortName?: string
  type?: string
  priceCurrency?: string
}

export default function PairsList({ onSelect }: { onSelect?: (short: string) => void }) {
  const { user } = useUser()
  const { t } = useLanguage()
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [pairs, setPairs] = useState<Pair[]>([])
  const [favs, setFavs] = useState<string[]>([])
  const [blocked, setBlocked] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        setLoading(true)
        // Берём curated + polygon и объединяем
        try {
          // Загружаем только пары из базы данных (curated-symbols)
          const curRes = await fetch(`/api/curated-symbols?limit=1000`)
          const cur = curRes.ok ? await curRes.json() : { data: [] }
          
          if (!cancelled) setPairs(cur.data || [])
        } catch (error) {
          console.error('Error loading pairs from API, using database fallback:', error)
          // Fallback - только пары из базы данных
          const databasePairs = [
            { ticker: 'BTCUSD', name: 'Bitcoin / US Dollar', shortName: 'BTC/USD', priceCurrency: 'USD' },
            { ticker: 'SPCE', name: 'Virgin Galactic', shortName: 'SPCE', priceCurrency: 'USD' }
          ]
          if (!cancelled) setPairs(databasePairs)
        }
      } finally {
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // блокировка выбора пар при требовании депозита
  useEffect(() => {
    let cancelled = false
    async function check() {
      try {
        if (!user?.email) return
        const res = await authenticatedFetch(`/api/client/me`, { cache: 'no-store' })
        if (!res.ok) return
        const j = await res.json()
        const raw = j?.client?.depositRequiredAmount
        const amount = Number(typeof raw === 'string' ? raw : raw ?? 0)
        const isBlocked = Number.isFinite(amount) && amount > 0
        console.log('🔒 PairsList blocked status:', { amount, isBlocked })
        if (!cancelled) setBlocked(isBlocked)
      } catch {}
    }
    check()
    return () => { cancelled = true }
  }, [user?.email])

  // favorites load/save
  useEffect(() => {
    try {
      const raw = localStorage.getItem('pairs:favs')
      if (raw) setFavs(JSON.parse(raw))
    } catch {}
  }, [])
  const saveFavs = (next: string[]) => {
    setFavs(next)
    try { localStorage.setItem('pairs:favs', JSON.stringify(next)) } catch {}
  }
  const toggleFav = (short: string) => {
    const key = short.toUpperCase()
    if (favs.includes(key)) saveFavs(favs.filter(x => x !== key))
    else saveFavs([...favs, key])
  }

  const filtered = useMemo(() => {
    if (!query) return pairs
    const q = query.toLowerCase()
    return pairs.filter(p => (p.shortName || p.ticker).toLowerCase().includes(q))
  }, [pairs, query])

  const favList = useMemo(() => {
    const set = new Set(favs)
    return filtered.filter(p => set.has((p.shortName || p.ticker?.replace('C:','') || '').toUpperCase()))
  }, [filtered, favs])
  const restList = useMemo(() => {
    const set = new Set(favs)
    return filtered.filter(p => !set.has((p.shortName || p.ticker?.replace('C:','') || '').toUpperCase()))
  }, [filtered, favs])

  return (
    <div className="border rounded-md p-1.5 max-h-[40dvh] sm:max-h-[45dvh] lg:max-h-none lg:h-[min(50dvh,500px)] flex flex-col bg-card">
      <div className="sticky top-0 bg-card z-10 pb-1.5 -mx-1.5 px-1.5 flex items-center gap-1.5 mb-1.5">
        <input
          value={query}
          onChange={(e)=>setQuery(e.target.value)}
          placeholder={t('pairs.search')}
          className="w-full h-6 rounded-md border px-1.5 text-[10px]"
        />
        <button
          type="button"
          className="h-6 px-2 text-[10px] border rounded-md"
          onClick={()=>{
            try {
              const key = (query || '').trim()
              if (!key) return
              fetch(`/api/admin/symbols/search?key=${encodeURIComponent(key)}`, { cache: 'no-store' })
            } catch {}
          }}
        >
          Go
        </button>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden text-[11px]">
        {loading && <div className="p-1.5 text-muted-foreground text-[10px]">{t('common.loading')}</div>}
        {!loading && filtered.length === 0 && (
          <div className="p-1.5 text-muted-foreground text-[10px]">{t('pairs.nothingFound')}</div>
        )}
        {!loading && favList.length > 0 && (
          <div className="pb-0.5">
            <div className="px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-muted-foreground">{t('pairs.favorites')}</div>
            {favList.map(p => {
              // ✅ Нормализуем shortName для единообразия
              let short = p.shortName || p.ticker?.replace('C:','').replace('X:','') || ''
              // Если нет слэша, добавляем его (ADAUSD -> ADA/USD)
              if (short && !short.includes('/') && short.length >= 6) {
                const base = short.slice(0, -3)
                const quote = short.slice(-3)
                short = `${base}/${quote}`
              }
              const isFav = favs.includes(short.toUpperCase())
              return (
                <div key={`fav-${p.ticker}`} className={`px-1.5 h-8 rounded-md flex items-center justify-between ${blocked ? 'opacity-50' : 'hover:bg-accent/60'} bg-card` }>
                  <button onClick={()=> !blocked && onSelect && onSelect(short)} className="text-left flex-1 text-[10px] h-8 flex items-center" disabled={blocked}>
                    <span className="font-medium">{short}</span>
                  </button>
                  <button onClick={()=>!blocked && toggleFav(short)} className="text-yellow-500 ml-1 text-xs h-8 flex items-center" disabled={blocked}>{isFav ? '★' : '☆'}</button>
                </div>
              )
            })}
          </div>
        )}
        {!loading && restList.map(p => {
          // ✅ Нормализуем shortName для единообразия
          let short = p.shortName || p.ticker?.replace('C:','').replace('X:','') || ''
          // Если нет слэша, добавляем его (ADAUSD -> ADA/USD)
          if (short && !short.includes('/') && short.length >= 6) {
            const base = short.slice(0, -3)
            const quote = short.slice(-3)
            short = `${base}/${quote}`
          }
          const isFav = favs.includes(short.toUpperCase())
          return (
            <div key={p.ticker} className={`px-1.5 h-8 rounded-md flex items-center justify-between ${blocked ? 'opacity-50' : 'hover:bg-accent/60'} bg-card` }>
              <button onClick={()=> !blocked && onSelect && onSelect(short)} className="text-left flex-1 text-[10px] h-8 flex items-center" disabled={blocked}>
                <span className="font-medium">{short}</span>
                <span className="text-muted-foreground text-[9px] ml-1">{p.priceCurrency || 'USD'}</span>
              </button>
              <button onClick={()=>!blocked && toggleFav(short)} className="text-yellow-500 ml-1 text-xs h-8 flex items-center" disabled={blocked}>{isFav ? '★' : '☆'}</button>
            </div>
          )
        })}
      </div>
    </div>
  )
}


