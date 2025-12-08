"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/toast"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Eye, Clock, CheckCircle, XCircle, RefreshCw } from "lucide-react"

interface KycClient {
  id: string
  name: string | null
  email: string
  phone: string | null
  image: string | null
  createdAt: string
}

interface KycRequest {
  id: string
  clientId: string
  client: KycClient
  documentFront: string | null
  documentBack: string | null
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'RESUBMIT'
  submittedAt: string | null
  reviewedAt: string | null
  reviewedBy: string | null
  reviewNotes: string | null
  createdAt: string
  updatedAt: string
}

const statusConfig = {
  DRAFT: { label: 'Черновик', color: 'bg-gray-500', icon: Clock },
  PENDING: { label: 'На проверке', color: 'bg-yellow-500', icon: Clock },
  APPROVED: { label: 'Одобрено', color: 'bg-green-500', icon: CheckCircle },
  REJECTED: { label: 'Отклонено', color: 'bg-red-500', icon: XCircle },
  RESUBMIT: { label: 'Требуется повтор', color: 'bg-orange-500', icon: RefreshCw }
}

export default function AdminKYCPage() {
  const [requests, setRequests] = useState<KycRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [selectedRequest, setSelectedRequest] = useState<KycRequest | null>(null)
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [reviewStatus, setReviewStatus] = useState<string>('')
  const [reviewNotes, setReviewNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { addToast } = useToast()

  const fetchRequests = async () => {
    try {
      setLoading(true)
      const url = statusFilter === 'ALL' 
        ? '/api/admin/kyc' 
        : `/api/admin/kyc?status=${statusFilter}`
      
      const response = await fetch(url)
      const result = await response.json()

      if (result.success) {
        setRequests(result.data)
      } else {
        addToast({
          type: 'error',
          title: 'Ошибка',
          description: result.error || 'Не удалось загрузить заявки'
        })
      }
    } catch (error) {
      console.error('Error fetching KYC requests:', error)
      addToast({
        type: 'error',
        title: 'Ошибка сети',
        description: 'Не удалось загрузить заявки'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [statusFilter])

  const handleReview = (request: KycRequest) => {
    setSelectedRequest(request)
    setReviewStatus('')
    setReviewNotes(request.reviewNotes || '')
    setReviewDialogOpen(true)
  }

  const handleSubmitReview = async () => {
    if (!selectedRequest || !reviewStatus) {
      addToast({
        type: 'error',
        title: 'Ошибка',
        description: 'Выберите статус для заявки'
      })
      return
    }

    try {
      setSubmitting(true)
      const response = await fetch(`/api/admin/kyc/${selectedRequest.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: reviewStatus,
          reviewNotes
        })
      })

      const result = await response.json()

      if (result.success) {
        addToast({
          type: 'success',
          title: 'Успешно',
          description: 'Заявка обновлена'
        })
        setReviewDialogOpen(false)
        fetchRequests()
      } else {
        addToast({
          type: 'error',
          title: 'Ошибка',
          description: result.error || 'Не удалось обновить заявку'
        })
      }
    } catch (error) {
      console.error('Error reviewing KYC request:', error)
      addToast({
        type: 'error',
        title: 'Ошибка сети',
        description: 'Не удалось обновить заявку'
      })
    } finally {
      setSubmitting(false)
    }
  }

  const getStats = () => {
    const stats = {
      total: requests.length,
      pending: requests.filter(r => r.status === 'PENDING').length,
      approved: requests.filter(r => r.status === 'APPROVED').length,
      rejected: requests.filter(r => r.status === 'REJECTED').length
    }
    return stats
  }

  const stats = getStats()

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight mb-2">KYC Верификация</h1>
        <p className="text-muted-foreground">Управление заявками на верификацию клиентов</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-card rounded-lg border p-4">
          <div className="text-sm text-muted-foreground mb-1">Всего заявок</div>
          <div className="text-2xl font-bold">{stats.total}</div>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <div className="text-sm text-muted-foreground mb-1">На проверке</div>
          <div className="text-2xl font-bold text-yellow-500">{stats.pending}</div>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <div className="text-sm text-muted-foreground mb-1">Одобрено</div>
          <div className="text-2xl font-bold text-green-500">{stats.approved}</div>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <div className="text-sm text-muted-foreground mb-1">Отклонено</div>
          <div className="text-2xl font-bold text-red-500">{stats.rejected}</div>
        </div>
      </div>

      <div className="mb-4 flex gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Все заявки</SelectItem>
            <SelectItem value="PENDING">На проверке</SelectItem>
            <SelectItem value="APPROVED">Одобрено</SelectItem>
            <SelectItem value="REJECTED">Отклонено</SelectItem>
            <SelectItem value="RESUBMIT">Требуется повтор</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Клиент</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Email</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Телефон</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Статус</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Дата отправки</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Действия</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    Загрузка...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    Заявок не найдено
                  </td>
                </tr>
              ) : (
                requests.map((request) => {
                  const StatusIcon = statusConfig[request.status].icon
                  return (
                    <tr key={request.id} className="border-b hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {request.client.image ? (
                            <img 
                              src={request.client.image} 
                              alt={request.client.name || 'Client'} 
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-sm font-medium">
                                {request.client.name?.[0] || request.client.email[0].toUpperCase()}
                              </span>
                            </div>
                          )}
                          <span className="font-medium">{request.client.name || 'Без имени'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">{request.client.email}</td>
                      <td className="px-4 py-3 text-sm">{request.client.phone || '—'}</td>
                      <td className="px-4 py-3">
                        <Badge className={`${statusConfig[request.status].color} text-white`}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusConfig[request.status].label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {request.submittedAt 
                          ? new Date(request.submittedAt).toLocaleDateString('ru-RU', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : '—'
                        }
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReview(request)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Просмотр
                        </Button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Проверка KYC заявки</DialogTitle>
            <DialogDescription>
              Просмотрите документы и примите решение
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-6">
              <div className="border rounded-lg p-4 bg-muted/20">
                <h3 className="font-semibold mb-3">Информация о клиенте</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Имя:</span>
                    <span className="ml-2 font-medium">{selectedRequest.client.name || '—'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email:</span>
                    <span className="ml-2 font-medium">{selectedRequest.client.email}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Телефон:</span>
                    <span className="ml-2 font-medium">{selectedRequest.client.phone || '—'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Дата регистрации:</span>
                    <span className="ml-2 font-medium">
                      {new Date(selectedRequest.client.createdAt).toLocaleDateString('ru-RU')}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Документы</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border rounded-lg p-3 bg-muted/20">
                    <div className="text-sm font-medium mb-2">Лицевая сторона</div>
                    {selectedRequest.documentFront ? (
                      <img 
                        src={selectedRequest.documentFront} 
                        alt="Document Front" 
                        className="w-full h-auto rounded border"
                      />
                    ) : (
                      <div className="w-full h-48 flex items-center justify-center bg-muted rounded text-muted-foreground">
                        Не загружено
                      </div>
                    )}
                  </div>
                  <div className="border rounded-lg p-3 bg-muted/20">
                    <div className="text-sm font-medium mb-2">Обратная сторона</div>
                    {selectedRequest.documentBack ? (
                      <img 
                        src={selectedRequest.documentBack} 
                        alt="Document Back" 
                        className="w-full h-auto rounded border"
                      />
                    ) : (
                      <div className="w-full h-48 flex items-center justify-center bg-muted rounded text-muted-foreground">
                        Не загружено
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>Решение</Label>
                  <Select value={reviewStatus} onValueChange={setReviewStatus}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Выберите решение" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="APPROVED">
                        <div className="flex items-center">
                          <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                          Одобрить
                        </div>
                      </SelectItem>
                      <SelectItem value="REJECTED">
                        <div className="flex items-center">
                          <XCircle className="w-4 h-4 mr-2 text-red-500" />
                          Отклонить
                        </div>
                      </SelectItem>
                      <SelectItem value="RESUBMIT">
                        <div className="flex items-center">
                          <RefreshCw className="w-4 h-4 mr-2 text-orange-500" />
                          Требуется повторная отправка
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Комментарий (необязательно)</Label>
                  <Textarea
                    className="mt-2"
                    rows={4}
                    placeholder="Оставьте комментарий для клиента..."
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReviewDialogOpen(false)}
              disabled={submitting}
            >
              Отмена
            </Button>
            <Button
              onClick={handleSubmitReview}
              disabled={!reviewStatus || submitting}
            >
              {submitting ? 'Сохранение...' : 'Сохранить решение'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
