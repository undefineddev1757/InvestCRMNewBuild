"use client"

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Pencil, Trash2, Plus, RefreshCw, GripVertical, Search, X, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'

interface Client {
  id: string
  name: string | null
  email: string
  phone: string | null
  emailVerified: string | null
  isActive: boolean
  lastSeen: string | null
  createdAt: string
  updatedAt: string
  _count?: {
    tradingAccounts: number
    financialAccounts: number
    transactions: number
  }
  wallets?: Array<{
    id: string
    address: string
    type: string
    createdAt: string
  }>
  tradingAccounts?: Array<{
    id: string
    type: string
    balance: string
    currency: string
  }>
  financialAccounts?: Array<{
    id: string
    balance: string
    currency: string
  }>
}

export default function AdminClientsPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <AdminClientsPageContent />
    </Suspense>
  )
}

function AdminClientsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [clients, setClients] = useState<Client[]>([])
  const [filteredClients, setFilteredClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [columnOrder, setColumnOrder] = useState(['checkbox', 'status', 'name', 'email', 'phone', 'wallets', 'accounts', 'balance', 'verified', 'active', 'created', 'actions'])
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  
  // Filters and pagination from URL
  const [filters, setFilters] = useState({
    name: searchParams.get('name') || '',
    email: searchParams.get('email') || '',
    phone: searchParams.get('phone') || '',
    verified: searchParams.get('verified') || 'all',
  })
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page') || '1'))
  const [itemsPerPage] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  
  // Форма для создания/редактирования
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    emailVerified: true
  })

  useEffect(() => {
    fetchClients()
    
    // Auto-refresh каждые 10 секунд для обновления статусов
    const interval = setInterval(() => {
      fetchClients()
    }, 10000)
    
    return () => clearInterval(interval)
  }, [])

  // Update URL when filters or page change
  useEffect(() => {
    const params = new URLSearchParams()
    if (filters.name) params.set('name', filters.name)
    if (filters.email) params.set('email', filters.email)
    if (filters.phone) params.set('phone', filters.phone)
    if (filters.verified !== 'all') params.set('verified', filters.verified)
    if (currentPage > 1) params.set('page', currentPage.toString())
    
    const newUrl = params.toString() ? `?${params.toString()}` : '/admin/clients'
    router.replace(newUrl, { scroll: false })
  }, [filters, currentPage, router])

  // Filter and paginate clients
  useEffect(() => {
    let filtered = [...clients]
    
    // Apply filters
    if (filters.name) {
      filtered = filtered.filter(c => 
        c.name?.toLowerCase().includes(filters.name.toLowerCase())
      )
    }
    if (filters.email) {
      filtered = filtered.filter(c => 
        c.email.toLowerCase().includes(filters.email.toLowerCase())
      )
    }
    if (filters.phone) {
      filtered = filtered.filter(c => 
        c.phone?.toLowerCase().includes(filters.phone.toLowerCase())
      )
    }
    if (filters.verified === 'yes') {
      filtered = filtered.filter(c => c.emailVerified)
    } else if (filters.verified === 'no') {
      filtered = filtered.filter(c => !c.emailVerified)
    }
    
    // Calculate pagination
    const total = Math.ceil(filtered.length / itemsPerPage)
    setTotalPages(total)
    
    // Apply pagination
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const paginated = filtered.slice(startIndex, endIndex)
    
    setFilteredClients(paginated)
  }, [clients, filters, currentPage, itemsPerPage])

  const fetchClients = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/clients')
      if (res.ok) {
        const data = await res.json()
        setClients(data.clients || [])
      }
    } catch (error) {
      console.error('Error fetching clients:', error)
    } finally {
      setLoading(false)
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

  const handleExport = async () => {
    try {
      setExporting(true)
      const res = await fetch('/api/admin/clients/export', { cache: 'no-store' })
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `clients_export_${Date.now()}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Export error', e)
      alert('Не удалось выполнить экспорт')
    } finally {
      setExporting(false)
    }
  }

  const handleCreate = async () => {
    try {
      const res = await fetch('/api/admin/clients', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      if (res.ok) {
        await fetchClients()
        setShowCreateDialog(false)
        resetForm()
      } else {
        const data = await res.json()
        alert(data.message || 'Ошибка создания клиента')
      }
    } catch (error) {
      console.error('Error creating client:', error)
      alert('Ошибка создания клиента')
    }
  }

  const handleEdit = async () => {
    if (!selectedClient) return
    
    try {
      const updateData: any = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        emailVerified: formData.emailVerified,
      }
      
      // Добавляем пароль только если он введён
      if (formData.password) {
        updateData.password = formData.password
      }
      
      const res = await fetch(`/api/admin/clients/${selectedClient.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(updateData)
      })
      
      if (res.ok) {
        await fetchClients()
        setShowEditDialog(false)
        resetForm()
        setSelectedClient(null)
      } else {
        const data = await res.json()
        alert(data.message || 'Ошибка обновления клиента')
      }
    } catch (error) {
      console.error('Error updating client:', error)
      alert('Ошибка обновления клиента')
    }
  }

  const handleDelete = async () => {
    if (!selectedClient) return
    
    try {
      const res = await fetch(`/api/admin/clients/${selectedClient.id}`, {
        method: 'DELETE'
      })
      
      if (res.ok) {
        await fetchClients()
        setShowDeleteDialog(false)
        setSelectedClient(null)
      } else {
        const data = await res.json()
        alert(data.message || 'Ошибка удаления клиента')
      }
    } catch (error) {
      console.error('Error deleting client:', error)
      alert('Ошибка удаления клиента')
    }
  }

  const openEditDialog = (client: Client) => {
    setSelectedClient(client)
    setFormData({
      name: client.name || '',
      email: client.email,
      password: '', // Не показываем старый пароль
      phone: client.phone || '',
      emailVerified: !!client.emailVerified
    })
    setShowEditDialog(true)
  }

  const openDeleteDialog = (client: Client) => {
    setSelectedClient(client)
    setShowDeleteDialog(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      phone: '',
      emailVerified: true
    })
  }

  const updateFilter = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setCurrentPage(1) // Reset to first page when filtering
  }

  const clearFilters = () => {
    setFilters({
      name: '',
      email: '',
      phone: '',
      verified: 'all',
    })
    setCurrentPage(1)
  }

  const hasActiveFilters = filters.name || filters.email || filters.phone || filters.verified !== 'all'

  const handleCreateDialogClose = () => {
    setShowCreateDialog(false)
    resetForm()
  }

  const handleEditDialogClose = () => {
    setShowEditDialog(false)
    resetForm()
    setSelectedClient(null)
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === clients.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(clients.map(c => c.id))
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    
    if (!confirm(`Удалить ${selectedIds.length} клиент(ов)?`)) return
    
    try {
      await Promise.all(
        selectedIds.map(id => fetch(`/api/admin/clients/${id}`, { method: 'DELETE' }))
      )
      await fetchClients()
      setSelectedIds([])
    } catch (error) {
      console.error('Error bulk deleting:', error)
      alert('Ошибка при удалении')
    }
  }

  const handleColumnDragStart = (e: React.DragEvent, columnKey: string) => {
    setDraggedColumn(columnKey)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleColumnDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleColumnDrop = (e: React.DragEvent, targetColumn: string) => {
    e.preventDefault()
    if (!draggedColumn || draggedColumn === targetColumn) return
    if (draggedColumn === 'checkbox' || targetColumn === 'checkbox') return // Checkbox всегда первый
    if (draggedColumn === 'actions' || targetColumn === 'actions') return // Actions всегда последний

    const draggedIndex = columnOrder.indexOf(draggedColumn)
    const targetIndex = columnOrder.indexOf(targetColumn)

    const newOrder = [...columnOrder]
    const [removed] = newOrder.splice(draggedIndex, 1)
    newOrder.splice(targetIndex, 0, removed)

    setColumnOrder(newOrder)
    setDraggedColumn(null)
  }

  const columnLabels: Record<string, string> = {
    checkbox: '',
    status: 'Статус',
    name: 'Имя',
    email: 'Email',
    phone: 'Телефон',
    wallets: 'Кошельки',
    accounts: 'Счета',
    balance: 'Баланс',
    verified: 'Верификация',
    active: 'Активность',
    created: 'Создан',
    actions: 'Действия',
  }

  // Функция для определения онлайн статуса (онлайн если был активен менее 2 минут назад)
  const isOnline = (lastSeen: string | null) => {
    if (!lastSeen) return false
    const diff = Date.now() - new Date(lastSeen).getTime()
    return diff < 2 * 60 * 1000 // 2 минуты
  }

  const renderCell = (columnKey: string, client: Client) => {
    switch (columnKey) {
      case 'checkbox':
        return (
          <Checkbox
            checked={selectedIds.includes(client.id)}
            onCheckedChange={() => toggleSelect(client.id)}
          />
        )
      case 'status':
        return (
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${isOnline(client.lastSeen) ? 'bg-green-500' : 'bg-gray-400'}`} />
            <span className="text-xs text-muted-foreground">
              {isOnline(client.lastSeen) ? 'Online' : client.lastSeen ? 'Offline' : '—'}
            </span>
          </div>
        )
      case 'name':
        return <span className="font-medium">{client.name || '—'}</span>
      case 'email':
        return client.email
      case 'phone':
        return client.phone || '—'
      case 'wallets':
        return client.wallets && client.wallets.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {client.wallets.map(w => (
              <Badge key={w.id} variant="outline" className="text-xs">
                {w.type}
              </Badge>
            ))}
          </div>
        ) : '—'
      case 'accounts':
        return (
          <div className="flex gap-1">
            {client._count && (
              <>
                {client._count.tradingAccounts > 0 && (
                  <Badge variant="outline" className="text-xs">
                    T: {client._count.tradingAccounts}
                  </Badge>
                )}
                {client._count.financialAccounts > 0 && (
                  <Badge variant="outline" className="text-xs">
                    F: {client._count.financialAccounts}
                  </Badge>
                )}
              </>
            )}
            {(!client._count || (client._count.tradingAccounts === 0 && client._count.financialAccounts === 0)) && '—'}
          </div>
        )
      case 'balance':
        return client.tradingAccounts && client.tradingAccounts.length > 0 ? (
          <span className="text-sm font-medium">
            ${Number(client.tradingAccounts[0].balance).toFixed(2)}
          </span>
        ) : client.financialAccounts && client.financialAccounts.length > 0 ? (
          <span className="text-sm font-medium">
            ${Number(client.financialAccounts[0].balance).toFixed(2)}
          </span>
        ) : '—'
      case 'verified':
        return client.emailVerified ? (
          <Badge variant="default" className="bg-green-500">Да</Badge>
        ) : (
          <Badge variant="secondary">Нет</Badge>
        )
      case 'active':
        return client.isActive ? (
          <Badge variant="default" className="bg-green-500">Активен</Badge>
        ) : (
          <Badge variant="destructive">Заблокирован</Badge>
        )
      case 'created':
        return new Date(client.createdAt).toLocaleDateString('ru-RU')
      case 'actions':
        return (
          <div className="text-right space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/admin/clients/${client.id}`)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openDeleteDialog(client)}
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Клиенты</h1>
          <p className="text-muted-foreground mt-1">Управление клиентами системы</p>
        </div>
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <Button variant="destructive" onClick={handleBulkDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Удалить ({selectedIds.length})
            </Button>
          )}
          <Button variant="outline" onClick={handleExport} disabled={exporting}>
            {exporting ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Экспорт...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </>
            )}
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Добавить клиента
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Список клиентов</CardTitle>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-2" />
                Сбросить фильтры
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по имени..."
                value={filters.name}
                onChange={(e) => updateFilter('name', e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по email..."
                value={filters.email}
                onChange={(e) => updateFilter('email', e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по телефону..."
                value={filters.phone}
                onChange={(e) => updateFilter('phone', e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filters.verified} onValueChange={(value) => updateFilter('verified', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Верификация" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все</SelectItem>
                <SelectItem value="yes">Верифицированные</SelectItem>
                <SelectItem value="no">Не верифицированные</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Загрузка...</div>
          ) : clients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Нет клиентов</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {columnOrder.map((columnKey) => (
                    <TableHead
                      key={columnKey}
                      draggable={columnKey !== 'checkbox' && columnKey !== 'actions'}
                      onDragStart={(e) => handleColumnDragStart(e, columnKey)}
                      onDragOver={handleColumnDragOver}
                      onDrop={(e) => handleColumnDrop(e, columnKey)}
                      className={`${columnKey === 'checkbox' ? 'w-12' : ''} ${columnKey === 'actions' ? 'text-right' : ''} ${columnKey !== 'checkbox' && columnKey !== 'actions' ? 'cursor-move' : ''} ${draggedColumn === columnKey ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        {columnKey === 'checkbox' ? (
                          <Checkbox
                            checked={selectedIds.length === clients.length && clients.length > 0}
                            onCheckedChange={toggleSelectAll}
                          />
                        ) : (
                          <>
                            {columnKey !== 'actions' && <GripVertical className="h-3 w-3 text-muted-foreground" />}
                            {columnLabels[columnKey]}
                          </>
                        )}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client) => (
                  <TableRow key={client.id}>
                    {columnOrder.map((columnKey) => (
                      <TableCell key={`${client.id}-${columnKey}`}>
                        {renderCell(columnKey, client)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {!loading && clients.length > 0 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Показано {filteredClients.length} из {clients.length} клиентов
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Назад
                </Button>
                <div className="text-sm">
                  Страница {currentPage} из {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Вперед
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Диалог создания клиента */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Создать клиента</DialogTitle>
            <DialogDescription>Добавьте нового клиента в систему</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Имя</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Иван Иванов"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="client@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Пароль *</Label>
              <div className="flex gap-2">
                <Input
                  id="password"
                  type="text"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className="flex-1"
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
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Телефон</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1234567890"
              />
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCreateDialogClose}>
              Отмена
            </Button>
            <Button onClick={handleCreate}>Создать</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалог редактирования клиента */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать клиента</DialogTitle>
            <DialogDescription>Измените данные клиента</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Имя</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Иван Иванов"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email *</Label>
              <Input
                id="edit-email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="client@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-password">Новый пароль (оставьте пустым, чтобы не менять)</Label>
              <div className="flex gap-2">
                <Input
                  id="edit-password"
                  type="text"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className="flex-1"
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
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Телефон</Label>
              <Input
                id="edit-phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1234567890"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-emailVerified"
                checked={formData.emailVerified}
                onCheckedChange={(checked) => setFormData({ ...formData, emailVerified: !!checked })}
              />
              <Label htmlFor="edit-emailVerified" className="cursor-pointer">
                Email верифицирован
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleEditDialogClose}>
              Отмена
            </Button>
            <Button onClick={handleEdit}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалог удаления клиента */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить клиента</DialogTitle>
            <DialogDescription>
              Вы уверены, что хотите удалить клиента <strong>{selectedClient?.email}</strong>?
              Это действие нельзя отменить.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Отмена
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
