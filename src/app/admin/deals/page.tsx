"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Pencil, Trash2, RefreshCw, TrendingUp, TrendingDown } from "lucide-react"

interface Deal {
  id: string
  client: { id: string; name: string; email: string } | null
  symbol: string
  displayName: string
  side: 'LONG' | 'SHORT'
  qty: number
  leverage: number
  entryPrice: number
  exitPrice: number | null
  status: 'OPEN' | 'CLOSED' | 'LIQUIDATED'
  pnl: number | null
  pnlPercentage: number | null
  createdAt: string
}

export default function AdminDealsPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <AdminDealsPageContent />
    </Suspense>
  )
}

function AdminDealsPageContent() {
  const searchParams = useSearchParams()
  const [deals, setDeals] = useState<Deal[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [clientIdFilter, setClientIdFilter] = useState(searchParams.get('clientId') || '')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all')

  useEffect(() => {
    loadDeals()
  }, [clientIdFilter, statusFilter])

  async function loadDeals() {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (clientIdFilter) params.append('clientId', clientIdFilter)
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter)

      const res = await fetch(`/api/admin/deals?${params}`)
      const data = await res.json()
      setDeals(data.deals || [])
      setTotal(data.total || 0)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  function formatPnL(pnl: number | null) {
    if (!pnl) return '—'
    const formatted = Math.abs(pnl).toFixed(2)
    if (pnl > 0) return <span className="text-green-600">+${formatted}</span>
    if (pnl < 0) return <span className="text-red-600">-${formatted}</span>
    return <span>$0.00</span>
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Сделки</h1>
        <Button onClick={loadDeals} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Обновить
        </Button>
      </div>

      <div className="flex gap-4">
        <Input
          placeholder="ID клиента..."
          value={clientIdFilter}
          onChange={(e) => setClientIdFilter(e.target.value)}
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            <SelectItem value="OPEN">Открытые</SelectItem>
            <SelectItem value="CLOSED">Закрытые</SelectItem>
            <SelectItem value="LIQUIDATED">Ликвидированные</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Клиент</TableHead>
              <TableHead>Актив</TableHead>
              <TableHead>Тип</TableHead>
              <TableHead className="text-right">Объем</TableHead>
              <TableHead className="text-right">Цена входа</TableHead>
              <TableHead className="text-right">Цена выхода</TableHead>
              <TableHead className="text-right">PnL</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Дата</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">Загрузка...</TableCell>
              </TableRow>
            ) : deals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">Сделок нет</TableCell>
              </TableRow>
            ) : (
              deals.map((deal) => (
                <TableRow key={deal.id}>
                  <TableCell>
                    <div className="font-medium">{deal.client?.name || '—'}</div>
                    <div className="text-xs text-muted-foreground">{deal.client?.email}</div>
                  </TableCell>
                  <TableCell>{deal.displayName}</TableCell>
                  <TableCell>
                    {deal.side === 'LONG' ? (
                      <Badge className="bg-green-600"><TrendingUp className="w-3 h-3 mr-1" />BUY</Badge>
                    ) : (
                      <Badge className="bg-red-600"><TrendingDown className="w-3 h-3 mr-1" />SELL</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{deal.qty}</TableCell>
                  <TableCell className="text-right">${deal.entryPrice.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{deal.exitPrice ? `$${deal.exitPrice.toFixed(2)}` : '—'}</TableCell>
                  <TableCell className="text-right">{formatPnL(deal.pnl)}</TableCell>
                  <TableCell>
                    <Badge variant={deal.status === 'OPEN' ? 'default' : deal.status === 'CLOSED' ? 'secondary' : 'destructive'}>
                      {deal.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(deal.createdAt).toLocaleDateString('ru')}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
