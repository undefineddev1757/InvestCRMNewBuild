"use client"

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Save, Plus, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export default function SecuritySettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [ipWhitelist, setIpWhitelist] = useState<string[]>([])
  const [newIp, setNewIp] = useState('')

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/settings/security')
      if (res.ok) {
        const data = await res.json()
        setIpWhitelist(data.ipWhitelist || [])
      }
    } catch (error) {
      console.error('Error fetching security settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddIp = () => {
    if (!newIp.trim()) return
    
    // Простая валидация IP
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$|^\[::1\]|^localhost$/
    if (!ipPattern.test(newIp.trim())) {
      alert('Неверный формат IP адреса')
      return
    }

    if (ipWhitelist.includes(newIp.trim())) {
      alert('Этот IP уже добавлен')
      return
    }

    setIpWhitelist([...ipWhitelist, newIp.trim()])
    setNewIp('')
  }

  const handleRemoveIp = (ip: string) => {
    setIpWhitelist(ipWhitelist.filter(i => i !== ip))
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const res = await fetch('/api/admin/settings/security', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ipWhitelist
        })
      })

      if (res.ok) {
        alert('Настройки безопасности успешно сохранены!')
        await fetchSettings()
      } else {
        const data = await res.json()
        alert(data.message || 'Ошибка сохранения настроек')
      }
    } catch (error) {
      console.error('Error saving security settings:', error)
      alert('Ошибка сохранения настроек')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">Загрузка...</div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Безопасность</h1>
          <p className="text-muted-foreground mt-1">Настройки безопасности и доступа</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Сохранение...' : 'Сохранить'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>IP Whitelist</CardTitle>
          <CardDescription>
            Список разрешенных IP адресов для доступа в админ панель. Только пользователи с этих IP смогут войти.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add new IP */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="newIp" className="sr-only">Новый IP адрес</Label>
              <Input
                id="newIp"
                placeholder="192.168.1.1 или [::1] или localhost"
                value={newIp}
                onChange={(e) => setNewIp(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddIp()
                  }
                }}
              />
            </div>
            <Button onClick={handleAddIp}>
              <Plus className="h-4 w-4 mr-2" />
              Добавить
            </Button>
          </div>

          {/* IP List */}
          {ipWhitelist.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
              <p>Нет добавленных IP адресов</p>
              <p className="text-sm mt-1">Добавьте IP адреса для ограничения доступа</p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Разрешенные IP адреса ({ipWhitelist.length})</Label>
              <div className="grid gap-2">
                {ipWhitelist.map((ip, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{index + 1}</Badge>
                      <span className="font-mono text-sm">{ip}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveIp(ip)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-4 text-sm text-blue-600 dark:text-blue-400">
            <p className="font-medium">💡 Важно:</p>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>Убедитесь, что добавили свой текущий IP адрес</li>
              <li>Для локального доступа используйте: <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">localhost</code> или <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">[::1]</code></li>
              <li>После сохранения изменения вступят в силу немедленно</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
