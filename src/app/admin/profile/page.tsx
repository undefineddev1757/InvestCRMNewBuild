"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Save } from 'lucide-react'

export default function AdminProfilePage() {
  const [adminName, setAdminName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')

  useEffect(() => {
    try {
      const name = localStorage.getItem('admin_name') || ''
      const email = localStorage.getItem('admin_email') || ''
      setAdminName(name)
      setAdminEmail(email)
    } catch {}
  }, [])

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Профиль</h1>
        <p className="text-muted-foreground mt-1">Управление профилем администратора</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Информация о профиле</CardTitle>
          <CardDescription>Просмотр и редактирование данных администратора</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Имя</Label>
              <Input
                id="name"
                value={adminName}
                disabled
                placeholder="Администратор"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={adminEmail}
                disabled
                placeholder="admin@example.com"
              />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Для изменения данных профиля обратитесь к главному администратору.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
