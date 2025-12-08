"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import { MessageSquare, Send, User, Edit2 } from 'lucide-react'
import { Loader } from '@/components/ui/loader'
import { useLanguage } from '@/contexts/language-context'

export default function AdminTicketsPage() {
  const { addToast } = useToast()
  const { t } = useLanguage()
  const [tickets, setTickets] = useState<any[]>([])
  const [selectedTicket, setSelectedTicket] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [newMessage, setNewMessage] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editingMessageText, setEditingMessageText] = useState<string>('')
  const [savingEdit, setSavingEdit] = useState(false)

  useEffect(() => {
    fetchTickets()
  }, [statusFilter])

  const fetchTickets = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/admin/tickets?status=${statusFilter}`)
      if (res.ok) {
        const data = await res.json()
        setTickets(data.tickets)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTicketDetails = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/tickets/${id}`)
      if (res.ok) {
        const data = await res.json()
        setSelectedTicket(data.ticket)
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleSendReply = async () => {
    if (!selectedTicket || !newMessage.trim()) return

    try {
      const res = await fetch(`/api/admin/tickets/${selectedTicket.id}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: newMessage, adminId: 'admin' })
      })

      if (res.ok) {
        addToast({ type: 'success', title: t('admin.tickets.replySent'), duration: 3000 })
        setNewMessage('')
        fetchTicketDetails(selectedTicket.id)
        fetchTickets()
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleStatusChange = async (status: string) => {
    if (!selectedTicket) return

    try {
      const res = await fetch(`/api/admin/tickets/${selectedTicket.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status })
      })

      if (res.ok) {
        addToast({ type: 'success', title: t('admin.tickets.statusUpdated'), duration: 3000 })
        fetchTicketDetails(selectedTicket.id)
        fetchTickets()
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleStartEdit = (message: any) => {
    setEditingMessageId(message.id)
    setEditingMessageText(message.message)
  }

  const handleCancelEdit = () => {
    setEditingMessageId(null)
    setEditingMessageText('')
  }

  const handleSaveEdit = async () => {
    if (!editingMessageId || !editingMessageText.trim() || !selectedTicket) return

    try {
      setSavingEdit(true)
      const res = await fetch(`/api/admin/tickets/${selectedTicket.id}/messages/${editingMessageId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          message: editingMessageText
        })
      })

      if (res.ok) {
        addToast({ 
          type: 'success', 
          title: t('admin.tickets.messageUpdated'), 
          duration: 3000 
        })
        setEditingMessageId(null)
        setEditingMessageText('')
        fetchTicketDetails(selectedTicket.id)
      } else {
        const error = await res.json()
        addToast({ 
          type: 'error', 
          title: t('admin.tickets.error'), 
          description: error.error || t('admin.tickets.updateError'),
          duration: 5000 
        })
      }
    } catch (error) {
      console.error('Error editing message:', error)
      addToast({ 
        type: 'error', 
        title: t('admin.tickets.error'), 
        description: t('admin.tickets.updateErrorDesc'),
        duration: 5000 
      })
    } finally {
      setSavingEdit(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <Loader size="lg" text={t('admin.tickets.loading')} />
    </div>
  )

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">{t('admin.tickets.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('admin.tickets.subtitle')}</p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t('admin.tickets.status.all')}</SelectItem>
            <SelectItem value="OPEN">{t('admin.tickets.status.open')}</SelectItem>
            <SelectItem value="IN_PROGRESS">{t('admin.tickets.status.inProgress')}</SelectItem>
            <SelectItem value="AWAITING_REPLY">{t('admin.tickets.status.awaitingReply')}</SelectItem>
            <SelectItem value="RESOLVED">{t('admin.tickets.status.resolved')}</SelectItem>
            <SelectItem value="CLOSED">{t('admin.tickets.status.closed')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>{t('admin.tickets.list')} ({tickets.length})</CardTitle></CardHeader>
          <CardContent>
            {tickets.length === 0 ? <p className="text-center py-8 text-muted-foreground text-sm">{t('admin.tickets.noTickets')}</p> : (
              <div className="space-y-2">
                {tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className={`p-3 rounded-lg border cursor-pointer ${selectedTicket?.id === ticket.id ? 'bg-primary/10 border-primary' : 'hover:bg-muted'}`}
                    onClick={() => fetchTicketDetails(ticket.id)}
                  >
                    <div className="font-medium text-sm mb-1 line-clamp-1">{ticket.subject}</div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <User className="w-3 h-3" />
                      <span>{ticket.client.name || ticket.client.email}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">{ticket.status}</Badge>
                      <span className="flex items-center text-xs"><MessageSquare className="w-3 h-3 mr-1" />{ticket._count.messages}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          {selectedTicket ? (
            <>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{selectedTicket.subject}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">Клиент: {selectedTicket.client.name || selectedTicket.client.email}</p>
                  </div>
                  <Select value={selectedTicket.status} onValueChange={handleStatusChange}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OPEN">{t('admin.tickets.status.openSingle')}</SelectItem>
                      <SelectItem value="IN_PROGRESS">{t('admin.tickets.status.inProgressSingle')}</SelectItem>
                      <SelectItem value="AWAITING_REPLY">{t('admin.tickets.status.awaitingReplySingle')}</SelectItem>
                      <SelectItem value="RESOLVED">{t('admin.tickets.status.resolvedSingle')}</SelectItem>
                      <SelectItem value="CLOSED">{t('admin.tickets.status.closedSingle')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 mb-4 max-h-96 overflow-y-auto">
                  {selectedTicket.messages.map((msg: any) => {
                    const isEditing = editingMessageId === msg.id
                    return (
                      <div key={msg.id} className={`p-3 rounded-lg relative group ${msg.senderType === 'ADMIN' ? 'bg-primary/10 ml-12' : 'bg-muted mr-12'}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold">{msg.senderType === 'ADMIN' ? t('admin.tickets.support') : selectedTicket.client.name || t('admin.tickets.client')}</span>
                          <div className="flex items-center gap-2">
                            {msg.senderType === 'ADMIN' && !isEditing && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2"
                                onClick={() => handleStartEdit(msg)}
                                title={t('admin.tickets.editMessage')}
                              >
                                <Edit2 className="w-3 h-3" />
                              </Button>
                            )}
                            <span className="text-xs text-muted-foreground">{new Date(msg.createdAt).toLocaleString()}</span>
                          </div>
                        </div>
                        {isEditing ? (
                          <div className="space-y-2">
                            <Input
                              value={editingMessageText}
                              onChange={(e) => setEditingMessageText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && e.ctrlKey) {
                                  handleSaveEdit()
                                } else if (e.key === 'Escape') {
                                  handleCancelEdit()
                                }
                              }}
                              className="text-sm"
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="default"
                                onClick={handleSaveEdit}
                                disabled={savingEdit || !editingMessageText.trim()}
                              >
                                {savingEdit ? t('admin.tickets.saving') : t('admin.tickets.save')}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancelEdit}
                                disabled={savingEdit}
                              >
                                {t('admin.tickets.cancel')}
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">{t('admin.tickets.saveHint')}</p>
                          </div>
                        ) : (
                          <p className="text-sm">{msg.message}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
                {selectedTicket.status !== 'CLOSED' && (
                  <div className="flex gap-2">
                    <Input placeholder={t('admin.tickets.writeReply')} value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendReply()} />
                    <Button onClick={handleSendReply}><Send className="w-4 h-4" /></Button>
                  </div>
                )}
              </CardContent>
            </>
          ) : (
            <CardContent className="flex items-center justify-center h-96">
              <p className="text-muted-foreground">{t('admin.tickets.selectTicket')}</p>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  )
}
