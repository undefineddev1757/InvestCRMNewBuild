"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

interface ImportResult {
  success: number
  errors: string[]
  warnings: string[]
}

export function MassImportSymbols({ onImportComplete }: { onImportComplete?: () => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const [importText, setImportText] = useState('')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const { addToast } = useToast()

  const parseImportText = (text: string) => {
    const lines = text.split('\n').map(line => line.trim()).filter(Boolean)
    const symbols: any[] = []
    
    for (const raw of lines) {
      // Поддерживаем два формата: табы или вертикальные черты
      const line = raw.replace(/^\|\s*|\s*\|$/g, '') // убрать крайние |
      const byPipe = line.split('|').map(p => p.trim()).filter(Boolean)
      const byTab = line.split('\t').map(p => p.trim()).filter(Boolean)
      const parts = byPipe.length >= 3 ? byPipe : byTab
      
      if (parts.length >= 4) {
        const [name, ticker, type, market] = parts
        symbols.push({
          name: name.trim(),
          ticker: ticker.trim().toUpperCase(),
          type: type.trim().toLowerCase(),
          market: market.trim().toLowerCase()
        })
        continue
      }
      if (parts.length >= 3) {
        const [name, group, ticker] = parts
        symbols.push({
          name: name.trim(),
          group: group.trim(),
          ticker: ticker.trim().toUpperCase()
        })
      }
    }
    
    return symbols
  }

  const handleImport = async () => {
    if (!importText.trim()) {
      addToast({ type: 'error', title: 'Ошибка', description: 'Введите данные для импорта' })
      return
    }

    setImporting(true)
    setResult(null)

    try {
      const symbols = parseImportText(importText)
      
      if (symbols.length === 0) {
        addToast({ type: 'error', title: 'Ошибка', description: 'Не удалось распарсить символы' })
        return
      }

      const response = await fetch('/api/admin/symbols/mass-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols })
      })

      const data = await response.json()

      if (response.ok) {
        setResult(data)
        addToast({ 
          type: 'success', 
          title: 'Импорт завершен', 
          description: `Успешно импортировано: ${data.success} символов` 
        })
        
        if (onImportComplete) {
          onImportComplete()
        }
      } else {
        addToast({ type: 'error', title: 'Ошибка импорта', description: data.message || 'Неизвестная ошибка' })
      }
    } catch (error) {
      console.error('Import error:', error)
      addToast({ type: 'error', title: 'Ошибка', description: 'Ошибка при импорте символов' })
    } finally {
      setImporting(false)
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    setImportText('')
    setResult(null)
  }

  return (
    <>
      <Button onClick={() => setIsOpen(true)} variant="outline">
        <Upload className="w-4 h-4 mr-2" />
        Массовый импорт
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Массовый импорт символов</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="import-text">Данные для импорта</Label>
              <Textarea
                id="import-text"
                placeholder={
                  'Поддерживаются форматы:\n' +
                  '1) Название\tГруппа\tТикер\n' +
                  '2) | Название | Тикер | type | market |\n\n' +
                  'Примеры:\nApple\tUS Stocks\tAAPL\n| BTC/USD | X:BTCUSD | crypto | crypto |'
                }
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                rows={10}
                className="font-mono text-sm"
              />
              <p className="text-sm text-muted-foreground mt-2">
                Формат: Название → Табуляция → Группа → Табуляция → Тикер
              </p>
            </div>

            {result && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Результат импорта</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span>Успешно импортировано: <Badge variant="secondary">{result.success}</Badge></span>
                  </div>
                  
                  {result.errors.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-5 h-5 text-red-500" />
                        <span className="font-medium">Ошибки ({result.errors.length}):</span>
                      </div>
                      <div className="bg-red-50 p-3 rounded-md max-h-32 overflow-y-auto">
                        {result.errors.map((error, index) => (
                          <div key={index} className="text-sm text-red-700">{error}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.warnings.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-5 h-5 text-yellow-500" />
                        <span className="font-medium">Предупреждения ({result.warnings.length}):</span>
                      </div>
                      <div className="bg-yellow-50 p-3 rounded-md max-h-32 overflow-y-auto">
                        {result.warnings.map((warning, index) => (
                          <div key={index} className="text-sm text-yellow-700">{warning}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Закрыть
            </Button>
            <Button onClick={handleImport} disabled={importing || !importText.trim()}>
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Импорт...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Импортировать
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
