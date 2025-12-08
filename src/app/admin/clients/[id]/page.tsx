"use client"

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowLeft, RefreshCw, Save, TrendingUp, TrendingDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/ui/toast'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface Client {
  id: string
  name: string | null
  email: string
  phone: string | null
  emailVerified: string | null
  depositRequiredAmount?: string
  depositRequiredAt?: string | null
  createdAt: string
  updatedAt: string
  _count?: {
    tradingAccounts: number
    financialAccounts: number
    transactions: number
  }
  tradingAccounts?: Array<{
    id: string
    type: string
    balance: string
    availableBalance: string
    margin: string
    profit: string
    currency: string
    number: string
  }>
  financialAccounts?: Array<{
    id: string
    balance: string
    availableBalance: string
    currency: string
    number: string
  }>
  kycRequest?: {
    id: string
    documentFront: string | null
    documentBack: string | null
    status: string
    submittedAt: string | null
    reviewedAt: string | null
    reviewedBy: string | null
    reviewNotes: string | null
    createdAt: string
    updatedAt: string
  } | null
}

interface Deal {
  id: string
  symbol: string
  displayName: string
  side: 'LONG' | 'SHORT'
  qty: number
  leverage: number
  entryPrice: number
  exitPrice: number | null
  status: 'OPEN' | 'CLOSED' | 'LIQUIDATED'
  closeType: string | null
  pnl: number | null
  pnlPercentage: number | null
  fee: number
  createdAt: string
  closedAt: string | null
}

export default function ClientDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const clientId = params.id as string
  const { addToast } = useToast()

  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'profile')
  
  // Deals state
  const [deals, setDeals] = useState<Deal[]>([])
  const [dealsLoading, setDealsLoading] = useState(false)
  
  // Wallets state
  const [wallets, setWallets] = useState<Array<{
    id: string
    address: string
    type: string
    createdAt: string
  }>>([])
  const [walletsLoading, setWalletsLoading] = useState(false)
  
  // Editing accounts state
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null)
  const [accountFormData, setAccountFormData] = useState<any>({})
  
  // Demo top-up state
  const [demoTopupAmount, setDemoTopupAmount] = useState<string>('10000')
  const [topupLoading, setTopupLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    emailVerified: true,
    isActive: true,
    // Access settings
    accessLevel: 'base' as 'base' | 'full',
    // Future permissions (not saved yet)
    canCreateDeals: true,
    canCreateWithdrawals: true,
    canCreateTickets: true,
    depositRequiredAmount: '',
  })

  useEffect(() => {
    fetchClient()
    if (activeTab === 'deals') {
      fetchDeals()
    }
    if (activeTab === 'profile') {
      fetchWallets()
    }
  }, [clientId, activeTab])

  const fetchClient = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/admin/clients/${clientId}`)
      if (res.ok) {
        const data = await res.json()
        setClient(data.client)
        if (Array.isArray(data.client?.wallets)) {
          setWallets(data.client.wallets)
        }
        setFormData({
          name: data.client.name || '',
          email: data.client.email,
          phone: data.client.phone || '',
          password: '',
          emailVerified: !!data.client.emailVerified,
          isActive: data.client.isActive !== false,
          // Access settings - получаем из API
          accessLevel: data.client.accessLevel?.toLowerCase() || 'base',
          // Permissions - получаем из API
          canCreateDeals: data.client.canCreateDeals !== false,
          canCreateWithdrawals: data.client.canCreateWithdrawals !== false,
          canCreateTickets: data.client.canCreateTickets !== false,
          depositRequiredAmount: (data.client.depositRequiredAmount ?? '0').toString(),
        })
      }
    } catch (error) {
      console.error('Error fetching client:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchWallets = async () => {
    try {
      setWalletsLoading(true)
      const res = await fetch(`/api/admin/clients/${clientId}/wallet`)
      if (res.ok) {
        const data = await res.json()
        setWallets(data.wallets || [])
      }
    } catch (error) {
      console.error('Error fetching wallets:', error)
    } finally {
      setWalletsLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const updateData: any = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        emailVerified: formData.emailVerified,
        isActive: formData.isActive,
        accessLevel: formData.accessLevel.toUpperCase(), // BASE или FULL
        // Права доступа
        canCreateDeals: formData.canCreateDeals,
        canCreateWithdrawals: formData.canCreateWithdrawals,
        canCreateTickets: formData.canCreateTickets,
      }
      if (formData.depositRequiredAmount !== undefined) {
        updateData.depositRequiredAmount = formData.depositRequiredAmount
      }
      
      if (formData.password) {
        updateData.password = formData.password
      }
      
      console.log('[SAVE] Отправка данных:', updateData)
      
      const res = await fetch(`/api/admin/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(updateData)
      })
      
      console.log('[SAVE] Ответ сервера:', res.status)
      
      if (res.ok) {
        const data = await res.json()
        console.log('[SAVE] Данные сохранены:', data)
        await fetchClient()
        addToast({
          type: 'success',
          title: 'Изменения сохранены',
          description: `Статус: ${formData.isActive ? 'Активен' : 'Заблокирован'} • Уровень: ${formData.accessLevel.toUpperCase()}`,
          duration: 4000
        })
      } else {
        const data = await res.json()
        console.error('[SAVE] Ошибка:', data)
        addToast({
          type: 'error',
          title: 'Ошибка сохранения',
          description: data.message || 'Не удалось сохранить изменения',
          duration: 5000
        })
      }
    } catch (error) {
      console.error('[SAVE] Error saving:', error)
      addToast({
        type: 'error',
        title: 'Ошибка сохранения',
        description: 'Произошла ошибка при сохранении данных',
        duration: 5000
      })
    } finally {
      setSaving(false)
    }
  }

  const generatePassword = () => {
    const length = 12
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
    let password = ''
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length))
    }
    setFormData({ ...formData, password })
  }

  const fetchDeals = async () => {
    try {
      setDealsLoading(true)
      console.log('[Deals] Fetching deals for client:', clientId)
      const res = await fetch(`/api/admin/deals?clientId=${clientId}`, {
        credentials: 'include',
        cache: 'no-store'
      })
      console.log('[Deals] Response status:', res.status)
      
      if (res.ok) {
        const data = await res.json()
        console.log('[Deals] Received deals:', data.deals?.length || 0)
        setDeals(data.deals || [])
      } else {
        const error = await res.json()
        console.error('[Deals] Error:', error)
      }
    } catch (error) {
      console.error('Error fetching deals:', error)
    } finally {
      setDealsLoading(false)
    }
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    const url = new URL(window.location.href)
    url.searchParams.set('tab', value)
    router.replace(url.pathname + url.search, { scroll: false })
  }

  const formatPnL = (pnl: number | null) => {
    if (pnl === null || pnl === undefined) return '—'
    const formatted = Math.abs(pnl).toFixed(2)
    if (pnl > 0) return <span className="text-green-600">+${formatted}</span>
    if (pnl < 0) return <span className="text-red-600">-${formatted}</span>
    return <span className="text-gray-600">$0.00</span>
  }

  const formatPercentage = (pct: number | null) => {
    if (pct === null || pct === undefined) return ''
    const formatted = Math.abs(pct).toFixed(2)
    if (pct > 0) return <span className="text-green-600 text-xs ml-1">(+{formatted}%)</span>
    if (pct < 0) return <span className="text-red-600 text-xs ml-1">(-{formatted}%)</span>
    return ''
  }

  const handleEditAccount = (account: any, type: 'trading' | 'financial') => {
    setEditingAccountId(account.id)
    setAccountFormData({
      type,
      balance: Number(account.balance),
      availableBalance: Number(account.availableBalance),
      margin: type === 'trading' ? Number(account.margin) : 0,
      profit: type === 'trading' ? Number(account.profit) : 0,
    })
  }

  const handleSaveAccount = async (accountId: string, accountType: 'trading' | 'financial') => {
    try {
      const endpoint = accountType === 'trading' 
        ? `/api/admin/accounts/trading/${accountId}`
        : `/api/admin/accounts/financial/${accountId}`
      
      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(accountFormData)
      })
      
      if (res.ok) {
        addToast({
          type: 'success',
          title: 'Счет обновлен',
          description: 'Изменения успешно сохранены',
          duration: 3000
        })
        setEditingAccountId(null)
        await fetchClient()
      } else {
        const data = await res.json()
        addToast({
          type: 'error',
          title: 'Ошибка',
          description: data.message || 'Не удалось обновить счет',
          duration: 5000
        })
      }
    } catch (error) {
      console.error('Error updating account:', error)
      addToast({
        type: 'error',
        title: 'Ошибка',
        description: 'Произошла ошибка при сохранении',
        duration: 5000
      })
    }
  }

  const handleCancelEdit = () => {
    setEditingAccountId(null)
    setAccountFormData({})
  }

  const handleDemoTopup = async () => {
    try {
      setTopupLoading(true)
      const amount = Number(demoTopupAmount)
      
      if (!amount || amount <= 0) {
        addToast({
          type: 'error',
          title: 'Ошибка',
          description: 'Введите корректную сумму',
          duration: 3000
        })
        return
      }

      const res = await fetch('/api/admin/accounts/demo-topup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          clientId: clientId,
          amount: amount
        })
      })

      if (res.ok) {
        const data = await res.json()
        addToast({
          type: 'success',
          title: data.accountCreated ? 'Демо-счет создан' : 'Демо-счет пополнен',
          description: data.message,
          duration: 4000
        })
        setDemoTopupAmount('10000')
        await fetchClient()
      } else {
        const error = await res.json()
        addToast({
          type: 'error',
          title: 'Ошибка',
          description: error.message || 'Не удалось пополнить счет',
          duration: 5000
        })
      }
    } catch (error) {
      console.error('Error topping up demo account:', error)
      addToast({
        type: 'error',
        title: 'Ошибка',
        description: 'Произошла ошибка при пополнении',
        duration: 5000
      })
    } finally {
      setTopupLoading(false)
    }
  }

  const handleKycAction = async (action: 'APPROVED' | 'REJECTED' | 'RESUBMIT', notes?: string) => {
    if (!client?.kycRequest?.id) return

    try {
      const res = await fetch(`/api/admin/kyc/${client.kycRequest.id}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          status: action,
          reviewNotes: notes || ''
        })
      })

      if (res.ok) {
        const actionText = action === 'APPROVED' ? 'одобрена' : action === 'REJECTED' ? 'отклонена' : 'требует повторной отправки'
        addToast({
          type: 'success',
          title: 'Верификация обновлена',
          description: `Заявка ${actionText}`,
          duration: 3000
        })
        await fetchClient()
      } else {
        const data = await res.json()
        addToast({
          type: 'error',
          title: 'Ошибка',
          description: data.error || 'Не удалось обновить статус',
          duration: 5000
        })
      }
    } catch (error) {
      console.error('Error updating KYC:', error)
      addToast({
        type: 'error',
        title: 'Ошибка',
        description: 'Произошла ошибка при обновлении',
        duration: 5000
      })
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">Загрузка...</div>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="p-6">
        <div className="text-center py-12">Клиент не найден</div>
      </div>
    )
  }

  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Управление пользователем</h1>
            <p className="text-muted-foreground mt-1">{client.email}</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Сохранение...' : 'Сохранить'}
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-9">
          <TabsTrigger value="profile">Профиль</TabsTrigger>
          <TabsTrigger value="access">Доступ</TabsTrigger>
          <TabsTrigger value="insurance">Страховка</TabsTrigger>
          <TabsTrigger value="deals">Сделки</TabsTrigger>
          <TabsTrigger value="accounts">Счета</TabsTrigger>
          <TabsTrigger value="address">Адрес</TabsTrigger>
          <TabsTrigger value="transactions">Транзакции</TabsTrigger>
          <TabsTrigger value="withdrawal">Снятие средств</TabsTrigger>
          <TabsTrigger value="verification">Верификация</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Основная информация</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">
                    <span className="text-red-500">*</span> E-mail
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Пароль</Label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Пароль"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={generatePassword}
                      title="Сгенерировать пароль"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Оставьте пустым, чтобы не менять</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    <span className="text-red-500">*</span> Имя:
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="surname">
                    <span className="text-red-500">*</span> Фамилия:
                  </Label>
                  <Input
                    id="surname"
                    placeholder="Фамилия"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Телефон:</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Пол:</Label>
                  <Select defaultValue="male">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Мужской</SelectItem>
                      <SelectItem value="female">Женский</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dob">Дата рождения:</Label>
                <Input id="dob" type="date" placeholder="Дата рождения:" />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="emailVerified"
                  checked={formData.emailVerified}
                  onCheckedChange={(checked) => setFormData({ ...formData, emailVerified: !!checked })}
                />
                <Label htmlFor="emailVerified" className="cursor-pointer">
                  Email верифицирован
                </Label>
              </div>
              
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm text-muted-foreground">
                  Управление статусом аккаунта (активен/заблокирован) находится во вкладке <strong>"Доступ"</strong>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Wallet Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Крипто кошелек</CardTitle>
              <Button size="sm" variant="outline" onClick={fetchWallets}>Обновить</Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {walletsLoading ? (
                <div className="text-sm text-muted-foreground">Загрузка...</div>
              ) : wallets.length === 0 ? (
                <div className="text-sm text-muted-foreground">Кошельков нет</div>
              ) : (
                wallets.map((wallet) => (
                  <div key={wallet.id} className="space-y-2 p-4 bg-muted/30 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{wallet.type} Wallet</span>
                      <Badge variant="outline">{new Date(wallet.createdAt).toLocaleDateString()}</Badge>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Адрес:</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          value={wallet.address}
                          readOnly
                          className="font-mono text-sm bg-background"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText(wallet.address)
                            addToast({
                              type: 'success',
                              title: 'Скопировано',
                              description: 'Адрес скопирован в буфер обмена'
                            })
                          }}
                        >
                          Копировать
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">ID: {wallet.id}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Access Tab */}
        <TabsContent value="access" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Настройки доступа</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Доступ – регулировка возможностей конкретного пользователя внутри торгового терминала
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Уровень доступа */}
              <div className="space-y-2">
                <Label htmlFor="accessLevel">Уровень</Label>
                <Select 
                  value={formData.accessLevel} 
                  onValueChange={(value) => setFormData({ ...formData, accessLevel: value as 'base' | 'full' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="base">Базовый</SelectItem>
                    <SelectItem value="full">Полный</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Уровень: «Базовый» и «Полный» влияют на допустимое значение торгового плеча при создании сделок
                </p>
              </div>

              {/* Ответственный администратор */}
              <div className="space-y-2">
                <Label htmlFor="responsibleAdmin">Ответственный администратор</Label>
                <Select defaultValue="none">
                  <SelectTrigger>
                    <SelectValue placeholder="Не выбрано" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Не выбрано</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Даты (readonly) */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Дата регистрации</Label>
                  <Input 
                    value={new Date(client.createdAt).toLocaleString('ru-RU')}
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label>Дата последней активности</Label>
                  <Input 
                    value={new Date(client.updatedAt).toLocaleString('ru-RU')}
                    disabled
                  />
                </div>
              </div>

              {/* Статус аккаунта (заблокирован/активен) */}
              <div className="space-y-4 p-4 bg-muted/50 rounded-lg border-2">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-semibold">Статус аккаунта</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Управление доступом клиента к торговому терминалу
                    </p>
                  </div>
                  <Badge variant={formData.isActive ? "default" : "destructive"} className="text-sm">
                    {formData.isActive ? "Активен" : "Заблокирован"}
                  </Badge>
                </div>
                
              <div className="flex items-center space-x-2">
                <Checkbox
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: !!checked })}
                  />
                  <Label htmlFor="isActive" className="cursor-pointer font-medium">
                    Аккаунт активен (клиент может войти в терминал)
                </Label>
              </div>

                {!formData.isActive && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
                    <p className="text-sm text-destructive font-medium">
                      Внимание: Клиент не сможет войти в систему
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Если клиент уже в терминале, его автоматически выкинет через 30 секунд
                    </p>
                  </div>
                )}
              </div>

              <Separator className="my-4" />

              {/* Детальные права доступа */}
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-semibold">Права доступа</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Детальная настройка возможностей клиента
                  </p>
                </div>

              {/* Возможность создавать сделки */}
                <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div className="flex items-center space-x-3">
                <Checkbox
                  id="canCreateDeals"
                  checked={formData.canCreateDeals}
                  onCheckedChange={(checked) => setFormData({ ...formData, canCreateDeals: !!checked })}
                />
                    <div>
                      <Label htmlFor="canCreateDeals" className="cursor-pointer font-medium">
                  Возможность создавать сделки
                </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Разрешить открывать новые торговые позиции
                      </p>
                    </div>
                  </div>
                  <Badge variant={formData.canCreateDeals ? "default" : "secondary"}>
                    {formData.canCreateDeals ? "Разрешено" : "Запрещено"}
                  </Badge>
              </div>

              {/* Возможность создавать заявки на вывод */}
                <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div className="flex items-center space-x-3">
                <Checkbox
                  id="canCreateWithdrawals"
                  checked={formData.canCreateWithdrawals}
                  onCheckedChange={(checked) => setFormData({ ...formData, canCreateWithdrawals: !!checked })}
                />
                    <div>
                      <Label htmlFor="canCreateWithdrawals" className="cursor-pointer font-medium">
                  Возможность создавать заявки на вывод
                </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Разрешить выводить средства со счета
                      </p>
                    </div>
                  </div>
                  <Badge variant={formData.canCreateWithdrawals ? "default" : "secondary"}>
                    {formData.canCreateWithdrawals ? "Разрешено" : "Запрещено"}
                  </Badge>
              </div>

              {/* Возможность создавать обращения */}
                <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div className="flex items-center space-x-3">
                <Checkbox
                  id="canCreateTickets"
                  checked={formData.canCreateTickets}
                  onCheckedChange={(checked) => setFormData({ ...formData, canCreateTickets: !!checked })}
                />
                    <div>
                      <Label htmlFor="canCreateTickets" className="cursor-pointer font-medium">
                  Возможность создавать обращения
                </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Разрешить отправлять сообщения в поддержку
                      </p>
                    </div>
                  </div>
                  <Badge variant={formData.canCreateTickets ? "default" : "secondary"}>
                    {formData.canCreateTickets ? "Разрешено" : "Запрещено"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Insurance Tab */}
        <TabsContent value="insurance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Страховка</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Сумма к пополнению (блокирует функционал до внесения)</Label>
                  <Input
                    type="number"
                    value={formData.depositRequiredAmount}
                    onChange={(e) => setFormData({ ...formData, depositRequiredAmount: e.target.value })}
                    placeholder="0"
                  />
                  <p className="text-xs text-muted-foreground">
                    Если больше 0 — у клиента будет ограничен функционал до пополнения на указанную сумму (в разделе Пополнить подставится значение).
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deals Tab */}
        <TabsContent value="deals" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Сделки клиента</CardTitle>
                <Button variant="outline" size="sm" onClick={fetchDeals} disabled={dealsLoading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${dealsLoading ? 'animate-spin' : ''}`} />
                  Обновить
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {dealsLoading ? (
                <div className="text-center py-8 text-muted-foreground">Загрузка сделок...</div>
              ) : deals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">У клиента пока нет сделок</div>
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Актив</TableHead>
                        <TableHead>Тип</TableHead>
                        <TableHead className="text-right">Объем</TableHead>
                        <TableHead className="text-right">Плечо</TableHead>
                        <TableHead className="text-right">Вход</TableHead>
                        <TableHead className="text-right">Выход</TableHead>
                        <TableHead className="text-right">PnL</TableHead>
                        <TableHead>Статус</TableHead>
                        <TableHead>Дата</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deals.map((deal) => (
                        <TableRow key={deal.id}>
                          <TableCell>
                            <div className="font-medium">{deal.displayName}</div>
                            <div className="text-xs text-muted-foreground">{deal.symbol}</div>
                          </TableCell>
                          <TableCell>
                            {deal.side === 'LONG' ? (
                              <Badge variant="default" className="bg-green-600">
                                <TrendingUp className="w-3 h-3 mr-1" />
                                BUY
                              </Badge>
                            ) : (
                              <Badge variant="default" className="bg-red-600">
                                <TrendingDown className="w-3 h-3 mr-1" />
                                SELL
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">{deal.qty}</TableCell>
                          <TableCell className="text-right">x{deal.leverage}</TableCell>
                          <TableCell className="text-right">${deal.entryPrice.toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            {deal.exitPrice ? `$${deal.exitPrice.toFixed(2)}` : '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatPnL(deal.pnl)}
                            {formatPercentage(deal.pnlPercentage)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              deal.status === 'OPEN' ? 'default' :
                              deal.status === 'CLOSED' ? 'secondary' :
                              'destructive'
                            }>
                              {deal.status === 'OPEN' ? 'Открыта' :
                               deal.status === 'CLOSED' ? 'Закрыта' :
                               'Ликвидирована'}
                            </Badge>
                            {deal.closeType && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {deal.closeType}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{new Date(deal.createdAt).toLocaleDateString('ru-RU')}</div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(deal.createdAt).toLocaleTimeString('ru-RU')}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Accounts Tab */}
        <TabsContent value="accounts" className="space-y-4">
          {/* Пополнение демо-счета */}
          <Card>
            <CardHeader>
              <CardTitle>Пополнение демо-счета</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Быстрое пополнение демо-баланса клиента
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 items-end max-w-md">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="topupAmount">Сумма пополнения ($)</Label>
                  <Input
                    id="topupAmount"
                    type="number"
                    step="1"
                    min="1"
                    value={demoTopupAmount}
                    onChange={(e) => setDemoTopupAmount(e.target.value)}
                    placeholder="10000"
                  />
                </div>
                <Button 
                  onClick={handleDemoTopup} 
                  disabled={topupLoading}
                  className="min-w-[140px]"
                >
                  {topupLoading ? 'Пополнение...' : 'Пополнить'}
                </Button>
              </div>
              <div className="mt-3 flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setDemoTopupAmount('1000')}
                >
                  $1,000
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setDemoTopupAmount('5000')}
                >
                  $5,000
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setDemoTopupAmount('10000')}
                >
                  $10,000
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setDemoTopupAmount('50000')}
                >
                  $50,000
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Пополнение применяется к первому найденному демо-счету клиента. 
                Если демо-счета нет, он будет создан автоматически.
              </p>
            </CardContent>
          </Card>

          {/* Торговые счета */}
          <Card>
            <CardHeader>
              <CardTitle>Торговые счета</CardTitle>
            </CardHeader>
            <CardContent>
              {client.tradingAccounts && client.tradingAccounts.length > 0 ? (
                <div className="space-y-3">
                  {client.tradingAccounts.map((account) => {
                    const isEditing = editingAccountId === account.id
                    return (
                      <div key={account.id} className="p-4 border rounded-lg bg-card hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-3">
                <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono font-medium">{account.number}</span>
                              <Badge variant={account.type === 'DEMO' ? 'secondary' : 'default'}>
                                {account.type === 'DEMO' ? 'DEMO' : 'LIVE'}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{account.currency}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {!isEditing ? (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleEditAccount(account, 'trading')}
                              >
                                Редактировать
                              </Button>
                            ) : (
                              <>
                                <Button 
                                  size="sm" 
                                  variant="default"
                                  onClick={() => handleSaveAccount(account.id, 'trading')}
                                >
                                  Сохранить
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  onClick={handleCancelEdit}
                                >
                                  Отмена
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                        
                        {isEditing ? (
                          <div className="grid grid-cols-2 gap-3 pt-3 border-t">
                  <div className="space-y-2">
                              <Label className="text-xs">Баланс</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={accountFormData.balance}
                                onChange={(e) => setAccountFormData({...accountFormData, balance: parseFloat(e.target.value) || 0})}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs">Доступно</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={accountFormData.availableBalance}
                                onChange={(e) => setAccountFormData({...accountFormData, availableBalance: parseFloat(e.target.value) || 0})}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs">Маржа</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={accountFormData.margin}
                                onChange={(e) => setAccountFormData({...accountFormData, margin: parseFloat(e.target.value) || 0})}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs">Прибыль</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={accountFormData.profit}
                                onChange={(e) => setAccountFormData({...accountFormData, profit: parseFloat(e.target.value) || 0})}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                        <div>
                              <div className="text-xs text-muted-foreground mb-1">Баланс</div>
                              <div className="text-lg font-bold">${Number(account.balance).toFixed(2)}</div>
                        </div>
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">Доступно</div>
                              <div className="font-medium">${Number(account.availableBalance).toFixed(2)}</div>
                        </div>
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">Маржа</div>
                              <div className="font-medium">${Number(account.margin).toFixed(2)}</div>
                      </div>
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">Прибыль</div>
                              <div className={`font-medium ${Number(account.profit) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                ${Number(account.profit).toFixed(2)}
                              </div>
                  </div>
                </div>
              )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-center py-8 text-muted-foreground">Нет торговых счетов</p>
              )}
            </CardContent>
          </Card>

          {/* Финансовые счета */}
          <Card>
            <CardHeader>
              <CardTitle>Финансовые счета</CardTitle>
            </CardHeader>
            <CardContent>
              {client.financialAccounts && client.financialAccounts.length > 0 ? (
                <div className="space-y-3">
                  {client.financialAccounts.map((account) => {
                    const isEditing = editingAccountId === account.id
                    return (
                      <div key={account.id} className="p-4 border rounded-lg bg-card hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-3">
                <div>
                            <div className="font-mono font-medium mb-1">{account.number}</div>
                            <p className="text-xs text-muted-foreground">{account.currency}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {!isEditing ? (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleEditAccount(account, 'financial')}
                              >
                                Редактировать
                              </Button>
                            ) : (
                              <>
                                <Button 
                                  size="sm" 
                                  variant="default"
                                  onClick={() => handleSaveAccount(account.id, 'financial')}
                                >
                                  Сохранить
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  onClick={handleCancelEdit}
                                >
                                  Отмена
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                        
                        {isEditing ? (
                          <div className="grid grid-cols-2 gap-3 pt-3 border-t">
                  <div className="space-y-2">
                              <Label className="text-xs">Баланс</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={accountFormData.balance}
                                onChange={(e) => setAccountFormData({...accountFormData, balance: parseFloat(e.target.value) || 0})}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs">Доступно для вывода</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={accountFormData.availableBalance}
                                onChange={(e) => setAccountFormData({...accountFormData, availableBalance: parseFloat(e.target.value) || 0})}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                        <div>
                              <div className="text-xs text-muted-foreground mb-1">Баланс</div>
                              <div className="text-lg font-bold">${Number(account.balance).toFixed(2)}</div>
                        </div>
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">Доступно для вывода</div>
                              <div className="font-medium">${Number(account.availableBalance).toFixed(2)}</div>
                        </div>
                            <div className="col-span-2">
                              <div className="text-xs text-muted-foreground mb-1">Заморожено</div>
                              <div className="font-medium">
                                ${(Number(account.balance) - Number(account.availableBalance)).toFixed(2)}
                      </div>
                  </div>
                </div>
              )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-center py-8 text-muted-foreground">Нет финансовых счетов</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Address Tab */}
        <TabsContent value="address" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Адрес</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Адресная информация</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Транзакции</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">История транзакций</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Withdrawal Tab */}
        <TabsContent value="withdrawal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Снятие средств</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">История выводов средств</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Verification Tab */}
        <TabsContent value="verification" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Верификация KYC</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Документы и статус верификации клиента</p>
                </div>
                {client.kycRequest && (
                  <Badge variant={
                    client.kycRequest.status === 'APPROVED' ? 'default' :
                    client.kycRequest.status === 'PENDING' ? 'secondary' :
                    client.kycRequest.status === 'REJECTED' ? 'destructive' :
                    'outline'
                  }>
                    {client.kycRequest.status === 'APPROVED' ? 'Одобрено' :
                     client.kycRequest.status === 'PENDING' ? 'На проверке' :
                     client.kycRequest.status === 'REJECTED' ? 'Отклонено' :
                     client.kycRequest.status === 'RESUBMIT' ? 'Требуется повтор' :
                     'Черновик'}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!client.kycRequest ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Клиент еще не отправил документы на верификацию</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Документы */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Лицевая сторона */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Лицевая сторона документа</Label>
                      {client.kycRequest.documentFront ? (
                        <div className="border rounded-lg overflow-hidden bg-muted">
                          <img 
                            src={client.kycRequest.documentFront} 
                            alt="Лицевая сторона" 
                            className="w-full h-64 object-contain cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => window.open(client.kycRequest?.documentFront || '', '_blank')}
                          />
                        </div>
                      ) : (
                        <div className="border rounded-lg h-64 flex items-center justify-center bg-muted">
                          <p className="text-sm text-muted-foreground">Документ не загружен</p>
                        </div>
                      )}
                    </div>

                    {/* Обратная сторона / селфи */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Обратная сторона / Селфи</Label>
                      {client.kycRequest.documentBack ? (
                        <div className="border rounded-lg overflow-hidden bg-muted">
                          <img 
                            src={client.kycRequest.documentBack} 
                            alt="Обратная сторона" 
                            className="w-full h-64 object-contain cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => window.open(client.kycRequest?.documentBack || '', '_blank')}
                          />
                        </div>
                      ) : (
                        <div className="border rounded-lg h-64 flex items-center justify-center bg-muted">
                          <p className="text-sm text-muted-foreground">Документ не загружен</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Информация о заявке */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Дата отправки</Label>
                      <p className="text-sm font-medium mt-1">
                        {client.kycRequest.submittedAt 
                          ? new Date(client.kycRequest.submittedAt).toLocaleString('ru-RU')
                          : 'Не отправлено'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Дата проверки</Label>
                      <p className="text-sm font-medium mt-1">
                        {client.kycRequest.reviewedAt 
                          ? new Date(client.kycRequest.reviewedAt).toLocaleString('ru-RU')
                          : 'Не проверено'}
                      </p>
                    </div>
                  </div>

                  {/* Комментарии админа */}
                  {client.kycRequest.reviewNotes && (
                    <div>
                      <Label className="text-sm font-semibold mb-2 block">Комментарии</Label>
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="text-sm">{client.kycRequest.reviewNotes}</p>
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Действия */}
                  {client.kycRequest.status === 'PENDING' && (
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold">Действия</Label>
                      <div className="flex gap-3">
                        <Button 
                          variant="default" 
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleKycAction('APPROVED', 'Документы проверены и одобрены')}
                        >
                          Одобрить
                        </Button>
                        <Button 
                          variant="destructive"
                          onClick={() => {
                            const notes = prompt('Причина отклонения:')
                            if (notes) handleKycAction('REJECTED', notes)
                          }}
                        >
                          Отклонить
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => {
                            const notes = prompt('Что нужно исправить:')
                            if (notes) handleKycAction('RESUBMIT', notes)
                          }}
                        >
                          Запросить повтор
                        </Button>
                      </div>
                    </div>
                  )}

                  {client.kycRequest.status === 'APPROVED' && (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                      <p className="text-sm text-green-800 dark:text-green-400 font-medium">
                        Верификация одобрена
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                        {client.kycRequest.reviewedAt && `Проверено: ${new Date(client.kycRequest.reviewedAt).toLocaleString('ru-RU')}`}
                      </p>
                    </div>
                  )}

                  {client.kycRequest.status === 'REJECTED' && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                      <p className="text-sm text-red-800 dark:text-red-400 font-medium">
                        Верификация отклонена
                      </p>
                      <p className="text-xs text-red-600 dark:text-red-500 mt-1">
                        {client.kycRequest.reviewNotes}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    </Suspense>
  )
}
