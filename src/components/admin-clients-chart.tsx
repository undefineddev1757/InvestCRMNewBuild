"use client"

import * as React from "react"
import { useEffect, useState } from 'react'
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import { useLanguage } from '@/contexts/language-context'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const chartConfig = {
  clients: {
    label: "clients",
    color: "hsl(217, 91%, 60%)",
  },
} satisfies ChartConfig

export function AdminClientsChart() {
  const [timeRange, setTimeRange] = React.useState("90d")
  const [data, setData] = useState<Array<{ date: string; clients: number }>>([])
  const [loading, setLoading] = useState(true)
  const { t, language } = useLanguage()

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/stats/clients')
      if (res.ok) {
        const result = await res.json()
        setData(result.stats || [])
      }
    } catch (error) {
      console.error('Error fetching client stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredData = React.useMemo(() => {
    const now = new Date()
    let daysToSubtract = 90
    if (timeRange === "30d") {
      daysToSubtract = 30
    } else if (timeRange === "7d") {
      daysToSubtract = 7
    }
    const startDate = new Date(now)
    startDate.setDate(startDate.getDate() - daysToSubtract)

    // Создаем карту существующих данных
    const dataMap = new Map<string, number>()
    data.forEach((item) => {
      dataMap.set(item.date, item.clients)
    })

    // Заполняем все дни в периоде (включая пропущенные с нулями)
    const result: Array<{ date: string; clients: number }> = []
    const currentDate = new Date(startDate)
    
    while (currentDate <= now) {
      const dateStr = currentDate.toISOString().split('T')[0]
      result.push({
        date: dateStr,
        clients: dataMap.get(dateStr) || 0
      })
      currentDate.setDate(currentDate.getDate() + 1)
    }

    return result
  }, [data, timeRange])

  // Рассчитываем общее количество за период
  const totalClients = filteredData.reduce((sum, item) => sum + item.clients, 0)

  return (
    <Card className="pt-0">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle>{t('admin.clientsPeriod')}</CardTitle>
          <CardDescription>
            {loading ? t('common.loading') : `${t('admin.totalClients')}: ${totalClients}`}
          </CardDescription>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger
            className="w-[160px] rounded-lg"
            aria-label={t('admin.selectPeriod')}
          >
            <SelectValue placeholder={t('admin.last3months')} />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="90d" className="rounded-lg">
              {t('admin.last3months')}
            </SelectItem>
            <SelectItem value="30d" className="rounded-lg">
              {t('admin.last30days')}
            </SelectItem>
            <SelectItem value="7d" className="rounded-lg">
              {t('admin.last7days')}
            </SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {loading ? (
          <div className="h-[250px] flex items-center justify-center">
            <p className="text-muted-foreground">Загрузка данных...</p>
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[250px] w-full"
          >
            <AreaChart data={filteredData}>
              <defs>
                <linearGradient id="fillClients" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-clients)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-clients)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value) => {
                  const date = new Date(value)
                  const locale = language === 'ru' ? 'ru-RU' : language === 'de' ? 'de-DE' : 'en-US'
                  return date.toLocaleDateString(locale, {
                    month: "short",
                    day: "numeric",
                  })
                }}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => {
                      const locale = language === 'ru' ? 'ru-RU' : language === 'de' ? 'de-DE' : 'en-US'
                      return new Date(value).toLocaleDateString(locale, {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })
                    }}
                    indicator="dot"
                  />
                }
              />
              <Area
                dataKey="clients"
                type="natural"
                fill="url(#fillClients)"
                stroke="var(--color-clients)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}