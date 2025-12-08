"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, DollarSign, TrendingUp } from 'lucide-react'
import { AdminClientsChart } from '@/components/admin-clients-chart'
import { useLanguage } from '@/contexts/language-context'

interface Metrics {
  clientsToday: number
  profit: number
}

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<Metrics>({ clientsToday: 0, profit: 0 })
  const [loading, setLoading] = useState(true)
  const { t } = useLanguage()

  useEffect(() => {
    fetchMetrics()
  }, [])

  const fetchMetrics = async () => {
    try {
      const res = await fetch('/api/admin/metrics')
      if (res.ok) {
        const data = await res.json()
        setMetrics(data)
      }
    } catch (error) {
      console.error('Error fetching metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('admin.dashboardTitle')}</h1>
        <p className="text-muted-foreground mt-1">{t('admin.dashboardSubtitle')}</p>
      </div>

      {/* Три карточки метрик */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('admin.clientsToday')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : metrics.clientsToday}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t('admin.newRegistrationsToday')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('admin.profit')}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : `$${metrics.profit.toFixed(2)}`}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t('admin.totalProfit')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('admin.metricPlaceholderTitle')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">—</div>
            <p className="text-xs text-muted-foreground mt-1">{t('admin.metricPlaceholderHint')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Блок с графиками */}
      <div className="grid gap-4 md:grid-cols-2">
        <AdminClientsChart />

        <Card>
          <CardHeader>
            <CardTitle>{t('admin.chart2')}</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
            <p className="text-muted-foreground">{t('admin.chartPlaceholder')}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('admin.chart3')}</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <p className="text-muted-foreground">{t('admin.chartPlaceholder')}</p>
        </CardContent>
      </Card>
    </div>
  )
}