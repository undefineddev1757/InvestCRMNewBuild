"use client"

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/contexts/user-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import { MessageSquare, Plus, Send } from 'lucide-react'
import { AppSidebar } from '@/components/app-sidebar'
import { AppHeader } from '@/components/app-header'
import { Loader } from '@/components/ui/loader'
import { useLanguage } from '@/contexts/language-context'

export default function MessagesPage() {
  const { user } = useUser()
  const router = useRouter()
  const { addToast } = useToast()
  const { t } = useLanguage()

  const [tickets, setTickets] = useState<any[]>([])
  const [selectedTicket, setSelectedTicket] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [showNewTicket, setShowNewTicket] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [newTicketForm, setNewTicketForm] = useState({
    subject: '',
    message: '',
    priority: 'MEDIUM'
  })

  useEffect(() => {
    if (!user) {
      router.push('/auth/signin')
    } else {
      fetchTickets()
    }
  }, [user])

  const fetchTickets = async () => {
    if (!user?.email) {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const res = await fetch(`/api/tickets?email=${encodeURIComponent(user.email)}`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setTickets(data.tickets || [])
      } else {
        console.error('Failed to fetch tickets:', res.status)
      }
    } catch (error) {
      console.error('Error fetching tickets:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTicketDetails = async (ticketId: string) => {
    if (!user?.email) return
    try {
      setLoadingDetails(true)
      const res = await fetch(`/api/tickets/${ticketId}?email=${encodeURIComponent(user.email)}`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setSelectedTicket(data.ticket)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoadingDetails(false)
    }
  }

  const handleCreateTicket = async () => {
    if (!user?.email) return
    if (!newTicketForm.subject || !newTicketForm.message) {
      addToast({ type: 'error', title: 'Ошибка', description: 'Заполните все поля', duration: 3000 })
      return
    }

    try {
      const res = await fetch(`/api/tickets?email=${encodeURIComponent(user.email)}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(newTicketForm),
        credentials: 'include'
      })

      if (res.ok) {
        addToast({ type: 'success', title: 'Тикет создан', description: 'Мы ответим вам в ближайшее время', duration: 3000 })
        setShowNewTicket(false)
        setNewTicketForm({ subject: '', message: '', priority: 'MEDIUM' })
        fetchTickets()
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleSendMessage = async () => {
    if (!user?.email || !selectedTicket || !newMessage.trim()) return

    try {
      const res = await fetch(`/api/tickets/${selectedTicket.id}?email=${encodeURIComponent(user.email)}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: newMessage }),
        credentials: 'include'
      })

      if (res.ok) {
        setNewMessage('')
        fetchTicketDetails(selectedTicket.id)
        fetchTickets()
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  if (loading && tickets.length === 0) {
    return (
      <div className="min-h-screen bg-background flex">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <AppHeader />
          <div className="flex-1 flex items-center justify-center">
            <Loader size="lg" text={t('messages.loadingTickets')} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="text-muted-foreground">Loading...</div></div>}>
    <div className="min-h-screen bg-background flex">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader />
        <div className="flex-1 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">{t('messages.support')}</h1>
              <p className="text-muted-foreground mt-1">{t('messages.yourTickets')}</p>
            </div>
            <Button onClick={() => setShowNewTicket(true)}>
              <Plus className="w-4 h-4 mr-2" />{t('messages.new')}
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1">
              <CardHeader><CardTitle>{t('messages.yourTickets')}</CardTitle></CardHeader>
              <CardContent>
                {tickets.length === 0 ? <p className="text-center py-8 text-muted-foreground text-sm">{t('messages.noTickets')}</p> : (
                  <div className="space-y-2">
                    {tickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedTicket?.id === ticket.id ? 'bg-primary/10 border-primary' : 'hover:bg-muted'}`}
                        onClick={() => fetchTicketDetails(ticket.id)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <span className="font-medium text-sm line-clamp-1">{ticket.subject}</span>
                          <Badge>{ticket.status}</Badge>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{ticket.priority}</span>
                          <span className="flex items-center"><MessageSquare className="w-3 h-3 mr-1" />{ticket._count.messages}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              {showNewTicket ? (
                <>
                  <CardHeader><CardTitle>{t('messages.new')}</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>{t('messages.subject')}</Label>
                      <Input placeholder={t('messages.subjectPlaceholder')} value={newTicketForm.subject} onChange={(e) => setNewTicketForm({...newTicketForm, subject: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('messages.priority')}</Label>
                      <Select value={newTicketForm.priority} onValueChange={(value) => setNewTicketForm({...newTicketForm, priority: value})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LOW">{t('messages.low')}</SelectItem>
                          <SelectItem value="MEDIUM">{t('messages.medium')}</SelectItem>
                          <SelectItem value="HIGH">{t('messages.high')}</SelectItem>
                          <SelectItem value="URGENT">{t('messages.urgent')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{t('messages.message')}</Label>
                      <Textarea placeholder={t('messages.messagePlaceholder')} rows={6} value={newTicketForm.message} onChange={(e) => setNewTicketForm({...newTicketForm, message: e.target.value})} />
                    </div>
                    <div className="flex gap-3">
                      <Button onClick={handleCreateTicket}>{t('messages.create')}</Button>
                      <Button variant="outline" onClick={() => setShowNewTicket(false)}>{t('messages.cancel')}</Button>
                    </div>
                  </CardContent>
                </>
              ) : loadingDetails ? (
                <CardContent className="flex items-center justify-center h-96">
                  <Loader size="md" text={t('messages.loadingDetails')} />
                </CardContent>
              ) : selectedTicket ? (
                <>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{selectedTicket.subject}</CardTitle>
                      <Badge>{selectedTicket.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4 mb-4 max-h-96 overflow-y-auto">
                      {selectedTicket.messages.map((msg: any) => (
                        <div key={msg.id} className={`p-3 rounded-lg ${msg.senderType === 'CLIENT' ? 'bg-primary/10 ml-12' : 'bg-muted mr-12'}`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold">{msg.senderType === 'CLIENT' ? 'Вы' : 'Поддержка'}</span>
                            <span className="text-xs text-muted-foreground">{new Date(msg.createdAt).toLocaleString('ru-RU')}</span>
                          </div>
                          <p className="text-sm">{msg.message}</p>
                        </div>
                      ))}
                    </div>
                    {selectedTicket.status !== 'CLOSED' && selectedTicket.status !== 'RESOLVED' && (
                      <div className="flex gap-2">
                        <Input placeholder={t('messages.writeMessage')} value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} />
                        <Button onClick={handleSendMessage}><Send className="w-4 h-4" /></Button>
                      </div>
                    )}
                  </CardContent>
                </>
              ) : (
                <CardContent className="flex items-center justify-center h-96">
                  <p className="text-muted-foreground">{t('messages.selectOrCreate')}</p>
                </CardContent>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
    </Suspense>
  )
}
