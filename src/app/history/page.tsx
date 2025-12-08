"use client"

import { useEffect, useState, useCallback } from 'react'
import { AppSidebar } from '@/components/app-sidebar'
import { AppHeader } from '@/components/app-header'
import { useUser } from '@/contexts/user-context'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

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
}

export default function HistoryPage() {
  const { user } = useUser()
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<PositionRow[]>([])
  const [status, setStatus] = useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL')

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const qs = new URLSearchParams()
      if (user?.email) qs.append('email', user.email)
      if (status) qs.append('status', status)
      const res = await fetch(`/api/v1/positions/history?${qs}`, { credentials: 'include' })
      const data = await res.json()
      setRows(Array.isArray(data?.positions) ? data.positions : [])
    } finally {
      setLoading(false)
    }
  }, [user?.email, status])

  useEffect(() => { load() }, [load])
  useEffect(()=>{
    const h = () => load()
    window.addEventListener('history:refresh', h)
    return ()=> window.removeEventListener('history:refresh', h)
  }, [load])

  return (
    <div className="min-h-screen bg-background flex">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader />

        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">История сделок</h1>
            <div className="flex items-center gap-2 text-sm">
              <button className={`px-3 py-1 rounded-md border ${status==='ALL'?'bg-accent':''}`} onClick={()=>setStatus('ALL')}>Все</button>
              <button className={`px-3 py-1 rounded-md border ${status==='OPEN'?'bg-accent':''}`} onClick={()=>setStatus('OPEN')}>Открытые</button>
              <button className={`px-3 py-1 rounded-md border ${status==='CLOSED'?'bg-accent':''}`} onClick={()=>setStatus('CLOSED')}>Закрытые</button>
            </div>
          </div>

          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Дата</TableHead>
                  <TableHead>Символ</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Направление</TableHead>
                  <TableHead>Объем</TableHead>
                  <TableHead>Цена входа</TableHead>
                  <TableHead>Плечо</TableHead>
                  <TableHead>Realized PnL</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow><TableCell colSpan={7} className="text-center">Загрузка...</TableCell></TableRow>
                )}
                {!loading && rows.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Нет данных</TableCell></TableRow>
                )}
                {rows.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>{new Date(r.createdAt).toLocaleString()}</TableCell>
                    <TableCell>{r.symbol?.name || r.symbol?.id}</TableCell>
                    <TableCell>{r.status}</TableCell>
                    <TableCell className={r.side==='LONG'?'text-green-600':'text-red-600'}>{r.side==='LONG'?'Long':'Short'}</TableCell>
                    <TableCell>{Number(r.qty)}</TableCell>
                    <TableCell>{Number(r.entryPrice).toFixed(5)}</TableCell>
                    <TableCell>{r.leverage}x</TableCell>
                    <TableCell className={(r as any).realizedPnl == null ? 'text-muted-foreground' : ((r as any).realizedPnl >= 0 ? 'text-green-600' : 'text-red-600')}>
                      {(r as any).realizedPnl == null ? '—' : `${Number((r as any).realizedPnl).toFixed(2)} $`}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  )
}


