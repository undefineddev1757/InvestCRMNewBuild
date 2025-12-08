"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { LanguageSwitcher } from "@/components/ui/language-switcher"
import { ThemeSwitcher } from "@/components/ui/theme-switcher"
import { useLanguage } from "@/contexts/language-context"
import { CheckCircle, XCircle, ArrowLeft } from "lucide-react"

export default function ConfirmEmail() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="text-muted-foreground">Loading...</div></div>}>
      <ConfirmEmailContent />
    </Suspense>
  )
}

function ConfirmEmailContent() {
  const [isLoading, setIsLoading] = useState(true)
  const [isVerified, setIsVerified] = useState(false)
  const [error, setError] = useState("")
  const searchParams = useSearchParams()
  const router = useRouter()
  const { t } = useLanguage()

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token')
      const email = searchParams.get('email')

      if (!token || !email) {
        setError('Invalid verification link')
        setIsLoading(false)
        return
      }

      try {
        const response = await fetch(`/api/auth/verify-email?token=${token}&email=${email}`)
        
        if (response.ok) {
          setIsVerified(true)
        } else {
          const data = await response.json()
          setError(data.message || 'Verification failed')
        }
      } catch (error) {
        setError('Verification failed')
      } finally {
        setIsLoading(false)
      }
    }

    verifyEmail()
  }, [searchParams])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verifying email...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {isVerified ? t('auth.emailVerified') : t('auth.verificationFailed')}
              </h1>
              <p className="text-muted-foreground">
                {isVerified ? t('auth.emailVerifiedDescription') : t('auth.verificationFailedDescription')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <ThemeSwitcher />
            </div>
          </div>

          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                {isVerified ? (
                  <CheckCircle className="h-16 w-16 text-green-500" />
                ) : (
                  <XCircle className="h-16 w-16 text-red-500" />
                )}
              </div>
              <h2 className="text-xl font-semibold text-foreground">
                {isVerified ? t('auth.verificationSuccess') : t('auth.verificationError')}
              </h2>
              <p className="text-muted-foreground">
                {isVerified ? t('auth.canNowLogin') : t('auth.verificationErrorDescription')}
              </p>
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div className="space-y-3">
              {isVerified ? (
                <Button
                  onClick={() => router.push('/auth/signin')}
                  className="w-full"
                >
                  {t('auth.signIn')}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => router.push('/auth/signup')}
                  className="w-full"
                >
                  {t('auth.signUp')}
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
