"use client"

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'

interface PositionDetailsProps {
  position: {
    id: string
    symbol: string
    side: 'LONG' | 'SHORT'
    qty: number
    entryPrice: number
    currentPrice: number
    leverage: number
    margin: number
    pnl: number
    pnlPercentage: number
    commission: number
    createdAt: string
    updatedAt?: string
    status?: string
    liquidationPrice?: number
    takeProfit?: number
    stopLoss?: number
  }
  onClose: () => void
}

export default function PositionDetails({ position, onClose }: PositionDetailsProps) {
  const isProfit = position.pnl >= 0
  const isClosed = position.status === 'CLOSED'

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const formatPrice = (price: number) => {
    return price.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 5 
    })
  }

  const formatQuantity = (qty: number) => {
    return qty.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 8 
    })
  }

  return (
    <div className="border rounded-lg bg-card">
      <Accordion type="single" collapsible>
        <AccordionItem value="item-1" className="border-0">
          <div className="flex items-center justify-between p-4 hover:bg-muted/50">
            <div className="flex items-center gap-3 flex-1">
              <span className="font-mono font-semibold text-foreground">{position.symbol}</span>
              <Badge variant="secondary" className={position.side === 'LONG' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-mono' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-mono'}>
                {position.side === 'LONG' ? 'Long' : 'Short'}
              </Badge>
              <Badge variant="secondary" className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 font-mono">
                {isClosed ? 'Закрыта' : 'Открыта'}
              </Badge>
              <span className="text-sm text-muted-foreground font-mono">
                {formatQuantity(position.qty)} @ {formatPrice(position.entryPrice)}
              </span>
              <span className="text-sm text-muted-foreground font-mono">{position.leverage}x</span>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className={`text-base font-bold font-mono ${isProfit ? 'text-green-500' : 'text-red-500'}`}>
                  {isProfit ? '+' : ''}{position.pnl >= 0 ? '$' : '-$'}{Math.abs(position.pnl).toFixed(2)}
                </div>
              </div>
              
              <AccordionTrigger className="hover:no-underline [&[data-state=open]>svg]:rotate-180">
                <span className="sr-only">Детали</span>
              </AccordionTrigger>
            </div>
          </div>

          <AccordionContent>
            <div className="px-4 pb-4 space-y-4">
              <div className="bg-muted/30 p-4 rounded-lg">
                <h4 className="text-sm font-semibold mb-3">Детали сделки</h4>
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ID сделки:</span>
                    <span className="font-mono">{position.id.slice(0, 6)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Объем:</span>
                    <span className="font-mono">{formatQuantity(position.qty)}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Статус:</span>
                    <span className={`font-mono font-semibold ${isClosed ? 'text-gray-600' : 'text-green-600'}`}>
                      {isClosed ? 'CLOSED' : 'OPEN'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Дата создания:</span>
                    <span className="font-mono text-sm">{formatDate(position.createdAt).split(',')[0]}, {formatDate(position.createdAt).split(',')[1]}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Тип:</span>
                    <span className={`font-mono font-semibold ${position.side === 'LONG' ? 'text-green-600' : 'text-red-600'}`}>
                      {position.side === 'LONG' ? 'BUY' : 'SELL'}
                    </span>
                  </div>
                  {position.updatedAt && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Дата обновления:</span>
                      <span className="font-mono text-sm">{formatDate(position.updatedAt).split(',')[0]}, {formatDate(position.updatedAt).split(',')[1]}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Цена входа:</span>
                    <span className="font-mono">USD {formatPrice(position.entryPrice)}</span>
                  </div>
                  {position.liquidationPrice && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ликвидация:</span>
                      <span className="font-mono">{formatPrice(position.liquidationPrice)}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Плечо:</span>
                    <span className="font-mono">{position.leverage}x</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Реализованный PnL:</span>
                    <span className={`font-mono font-semibold ${isProfit ? 'text-green-500' : 'text-red-500'}`}>
                      {isProfit ? '+' : ''}{position.pnl >= 0 ? '$' : '-$'}{Math.abs(position.pnl).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {!isClosed && (
                <Button 
                  variant="destructive" 
                  className="w-full font-mono"
                  onClick={onClose}
                >
                  Закрыть позицию
                </Button>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}
