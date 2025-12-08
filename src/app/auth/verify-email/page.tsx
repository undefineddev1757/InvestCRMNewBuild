"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { LanguageSwitcher } from "@/components/ui/language-switcher"
import { ThemeSwitcher } from "@/components/ui/theme-switcher"
import { useLanguage } from "@/contexts/language-context"
import { CheckCircle, Mail, ArrowLeft, RefreshCw } from "lucide-react"

export default function VerifyEmail() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="text-muted-foreground">Loading...</div></div>}>
      <VerifyEmailContent />
    </Suspense>
  )
}

function VerifyEmailContent() {
  const [isLoading, setIsLoading] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  const [error, setError] = useState("")
  const [email, setEmail] = useState("")
  const searchParams = useSearchParams()
  const router = useRouter()
  const { t } = useLanguage()

  useEffect(() => {
    const emailParam = searchParams.get('email')
    if (emailParam) {
      setEmail(emailParam)
    }
  }, [searchParams])

  const handleResendEmail = async () => {
    if (!email) return
    
    setIsLoading(true)
    setError("")
    
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      if (response.ok) {
        // Показати повідомлення про успішну відправку
        setIsVerified(true)
      } else {
        const data = await response.json()
        setError(data.message || t('auth.verificationError'))
      }
    } catch (error) {
      setError(t('auth.verificationError'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {t('auth.verifyEmail')}
              </h1>
              <p className="text-muted-foreground">
                {t('auth.verifyEmailDescription')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <ThemeSwitcher />
            </div>
          </div>

          <div className="space-y-6">
            {isVerified ? (
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <CheckCircle className="h-16 w-16 text-green-500" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">
                  {t('auth.emailSent')}
                </h2>
                <p className="text-muted-foreground">
                  {t('auth.checkEmailInstructions', { email })}
                </p>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <Mail className="h-16 w-16 text-primary" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">
                  {t('auth.checkYourEmail')}
                </h2>
                <p className="text-muted-foreground">
                  {t('auth.verificationSent', { email })}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('auth.verificationInstructions')}
                </p>
              </div>
            )}

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div className="space-y-3">
              {!isVerified && (
                <Button
                  onClick={handleResendEmail}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      {t('auth.sending')}
                    </>
                  ) : (
                    t('auth.resendEmail')
                  )}
                </Button>
              )}

              <Button
                variant="outline"
                onClick={() => router.push('/auth/signin')}
                className="w-full"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('auth.backToLogin')}
              </Button>
            </div>

            <div className="text-center text-sm text-muted-foreground">
              <p>{t('auth.didntReceiveEmail')}</p>
              <p>{t('auth.checkSpamFolder')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Illustration */}
      <div className="hidden lg:flex flex-1 bg-muted h-screen overflow-hidden">
        <img 
          src="/images/finance.jpg" 
          alt="InvestCRM Email Verification" 
          className="w-full h-full object-cover object-center"
        />
      </div>
    </div>
  )
}
