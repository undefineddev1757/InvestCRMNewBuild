"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/contexts/user-context'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from 'next/link'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useLanguage } from '@/contexts/language-context'

export default function ClientSignInPage() {
  const router = useRouter()
  const { login } = useUser()
  const { language, setLanguage, t } = useLanguage()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      setLoading(true)
      console.log('Отправка запроса на вход...', { email })
      
      const res = await fetch('/api/auth/client-login', { 
        method: 'POST', 
        headers: { 'content-type': 'application/json' }, 
        body: JSON.stringify({ email, password }) 
      })
      
      console.log('Ответ сервера:', res.status)
      const data = await res.json()
      console.log('Данные ответа:', data)
      
      if (!res.ok) {
        const code = (data?.code || '').toString().toUpperCase()
        if (res.status === 401 || code === 'INVALID_CREDENTIALS') {
          setError(t('validation.invalidCredentials'))
        } else if (code) {
          setError(t('validation.loginError'))
        } else {
          setError(t('validation.loginError'))
        }
        return
      }
      
      // Сохраняем данные клиента через UserContext с JWT токеном
      console.log('Сохранение пользователя через UserContext')
      if (!data.token) {
        setError('Токен не получен от сервера')
        return
      }
      login({
        id: data.client.id,
        email: data.client.email,
        name: data.client.name || '',
        emailVerified: true
      }, data.token)
      
      console.log('Редирект на /dashboard')
      router.push('/dashboard')
    } catch (e: any) {
      console.error('Ошибка входа:', e)
      setError(t('validation.loginError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">
            <form onSubmit={onSubmit} className="flex flex-col gap-6">
              <div className="flex flex-col gap-2 text-center">
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <h1 className="text-2xl font-bold">{t('auth.login')}</h1>
                    <p className="text-sm text-muted-foreground">
                      {t('auth.loginDescription')}
                    </p>
                  </div>
                  <div className="w-[140px]">
                    <Select value={language} onValueChange={(v)=>setLanguage(v as any)}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ru">Русский</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="de">Deutsch</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              
              {error && (
                <div className="rounded-lg bg-red-50 dark:bg-red-950 p-3 text-sm text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}
              
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                  <Label htmlFor="password">{t('auth.password')}</Label>
                    <Link 
                      href="/auth/forgot-password" 
                      className="text-sm text-muted-foreground hover:text-primary"
                    >
                      {t('auth.forgotPassword')}
                    </Link>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? t('common.signingIn') : t('auth.signIn')}
                </Button>
              </div>
              
              
            </form>
          </div>
        </div>
      </div>
      <div className="bg-muted relative hidden lg:block">
        <img
          src="/images/finance.jpg"
          alt="Trading Background"
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  )
}