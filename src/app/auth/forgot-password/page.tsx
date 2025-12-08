"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useLanguage } from "@/contexts/language-context"

export default function ForgotPassword() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const router = useRouter()
  const { t } = useLanguage()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setMessage("")

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      if (response.ok) {
        setMessage(t('validation.passwordResetSent'))
      } else {
        const data = await response.json()
        setError(data.message || t('validation.registrationError'))
      }
    } catch (error) {
      setError(t('validation.registrationError'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">{t('auth.passwordRecovery')}</h1>
                  <p className="text-muted-foreground">{t('auth.forgotPasswordDescription')}</p>
            </div>
            
          </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Input
              type="email"
              placeholder={t('auth.email')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-12 text-base"
            />
          </div>

          {error && (
            <div className="text-destructive text-sm text-center">
              {error}
            </div>
          )}

          {message && (
            <div className="text-green-600 text-sm text-center">
              {message}
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-12 text-base font-medium"
            disabled={isLoading}
          >
            {isLoading ? t('common.sending') : t('auth.continue')}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/auth/signin"
            className="text-sm text-primary hover:underline"
          >
            {t('auth.backToLogin')}
          </Link>
        </div>
        </div>
      </div>

      {/* Right side - Illustration */}
      <div className="hidden lg:flex flex-1 bg-muted h-screen overflow-hidden">
        <img 
          src="/images/finance.jpg" 
          alt="InvestCRM Security" 
          className="w-full h-full object-cover object-center"
        />
      </div>
    </div>
  )
}
