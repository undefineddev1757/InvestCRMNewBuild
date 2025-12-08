"use client"

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Save, Upload, X } from 'lucide-react'
import Image from 'next/image'

export default function GeneralSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  
  const [formData, setFormData] = useState({
    platformName: '',
    primaryColor: '#3b82f6', // blue-500 по умолчанию
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/settings/general')
      if (res.ok) {
        const data = await res.json()
        setFormData({
          platformName: data.platformName || '',
          primaryColor: data.primaryColor || '#3b82f6',
        })
        if (data.logoUrl) {
          setLogoPreview(data.logoUrl)
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setLogoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveLogo = () => {
    setLogoFile(null)
    setLogoPreview(null)
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      
      // Если есть новый файл лого, сначала загружаем его
      let logoUrl = logoPreview
      if (logoFile) {
        const uploadFormData = new FormData()
        uploadFormData.append('file', logoFile)
        uploadFormData.append('type', 'logo')
        
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: uploadFormData,
        })
        
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json()
          logoUrl = uploadData.url
        } else {
          throw new Error('Ошибка загрузки логотипа')
        }
      }

      // Сохраняем настройки
      const res = await fetch('/api/admin/settings/general', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          platformName: formData.platformName,
          primaryColor: formData.primaryColor,
          logoUrl: logoUrl || null,
        })
      })

      if (res.ok) {
        alert('Настройки успешно сохранены!')
        await fetchSettings()
        setLogoFile(null)
      } else {
        const data = await res.json()
        alert(data.message || 'Ошибка сохранения настроек')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
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
          <h1 className="text-3xl font-bold tracking-tight">Общие настройки</h1>
          <p className="text-muted-foreground mt-1">Настройте основные параметры платформы</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Сохранение...' : 'Сохранить'}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Logo Upload */}
        <Card>
          <CardHeader>
            <CardTitle>Логотип платформы</CardTitle>
            <CardDescription>Загрузите логотип, который будет отображаться в системе</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {logoPreview ? (
              <div className="relative w-full h-40 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/20">
                <Image
                  src={logoPreview}
                  alt="Logo preview"
                  width={200}
                  height={100}
                  className="object-contain max-h-32"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={handleRemoveLogo}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <label className="w-full h-40 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-muted/20 transition-colors">
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">Нажмите для загрузки</span>
                <span className="text-xs text-muted-foreground mt-1">PNG, JPG, SVG (макс. 2MB)</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoChange}
                />
              </label>
            )}
          </CardContent>
        </Card>

        {/* Platform Name */}
        <Card>
          <CardHeader>
            <CardTitle>Название платформы</CardTitle>
            <CardDescription>Отображается в заголовке браузера и в интерфейсе</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="platformName">Название</Label>
              <Input
                id="platformName"
                value={formData.platformName}
                onChange={(e) => setFormData({ ...formData, platformName: e.target.value })}
                placeholder="InvestCRM"
              />
            </div>
          </CardContent>
        </Card>

        {/* Primary Color */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Основной цвет</CardTitle>
            <CardDescription>Выберите основной цвет интерфейса платформы</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="space-y-2 flex-1">
                <Label htmlFor="primaryColor">Цвет</Label>
                <div className="flex gap-3 items-center">
                  <Input
                    id="primaryColor"
                    type="color"
                    value={formData.primaryColor}
                    onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                    className="w-20 h-10 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={formData.primaryColor}
                    onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                    placeholder="#3b82f6"
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Предпросмотр</Label>
                <div 
                  className="w-32 h-10 rounded-md border"
                  style={{ backgroundColor: formData.primaryColor }}
                />
              </div>
            </div>
            
            {/* Preset Colors */}
            <div className="mt-4">
              <Label className="mb-2 block">Готовые цвета</Label>
              <div className="flex gap-2 flex-wrap">
                {[
                  { name: 'Синий', value: '#3b82f6' },
                  { name: 'Зеленый', value: '#10b981' },
                  { name: 'Фиолетовый', value: '#8b5cf6' },
                  { name: 'Красный', value: '#ef4444' },
                  { name: 'Оранжевый', value: '#f97316' },
                  { name: 'Розовый', value: '#ec4899' },
                  { name: 'Индиго', value: '#6366f1' },
                  { name: 'Серый', value: '#6b7280' },
                ].map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => setFormData({ ...formData, primaryColor: preset.value })}
                    className="w-12 h-12 rounded-md border-2 hover:scale-110 transition-transform"
                    style={{ 
                      backgroundColor: preset.value,
                      borderColor: formData.primaryColor === preset.value ? '#000' : 'transparent'
                    }}
                    title={preset.name}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
