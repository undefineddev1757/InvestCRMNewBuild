"use client"

import { useEffect, useState, useMemo, Suspense } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useUser } from "@/contexts/user-context"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User, Mail, Camera } from "lucide-react"
import { LanguageSwitcher } from "@/components/ui/language-switcher"
import { ThemeSwitcher } from "@/components/ui/theme-switcher"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useLanguage } from "@/contexts/language-context"
import { AppSidebar } from "@/components/app-sidebar"
import { AppHeader } from "@/components/app-header"
import { ImageUpload } from "@/components/ui/image-upload"
import { DocumentUpload } from "@/components/ui/document-upload"
import { authenticatedFetch } from "@/lib/api-client"
import { useToast } from "@/components/ui/toast"

type TabKey = "info" | "verification" | "2fa" | "password"

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>}>
      <ProfilePageContent />
    </Suspense>
  )
}

function ProfilePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const { user, logout } = useUser()
  const validTabs: TabKey[] = ["info", "verification", "2fa", "password"]
  const { t } = useLanguage()
  const getActiveFromParams = (): TabKey => {
    const t = (searchParams.get("tab") || "").toLowerCase()
    return (validTabs.includes(t as TabKey) ? (t as TabKey) : "info")
  }
  const active = getActiveFromParams()
  const [moscowTime, setMoscowTime] = useState<string>("")
  const [mounted, setMounted] = useState(false)
  const [messages] = useState<Array<{ id: string; title: string; preview?: string }>>([])

  useEffect(() => {
    const lang = (typeof window !== 'undefined' ? window.localStorage.getItem('language') : 'en') || 'en'
    const update = () => {
      const now = new Date()
      const fmt = new Intl.DateTimeFormat(lang === 'ru' ? 'ru-RU' : lang === 'de' ? 'de-DE' : 'en-US', { timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit' })
      setMoscowTime(fmt.format(now))
    }
    update()
    const t = setInterval(update, 60 * 1000)
    return () => clearInterval(t)
  }, [searchParams])

  useEffect(() => { setMounted(true) }, [])

  const switchTab = (tab: TabKey) => {
    const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
    params.set("tab", tab)
    router.replace(`?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="min-h-screen bg-background flex">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader />

      {/* Tabs nav */}
      <div className="border-b bg-background/95 w-full">
        <div className="container mx-auto px-4">
          {/* Mobile: Select switcher */}
          <div className="sm:hidden py-3">
            <Select value={active} onValueChange={(v)=>switchTab(v as TabKey)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="info">{t('profile.tabs.mobile.info')}</SelectItem>
                <SelectItem value="verification">{t('profile.tabs.mobile.verification')}</SelectItem>
                <SelectItem value="2fa">{t('profile.tabs.mobile.2fa')}</SelectItem>
                <SelectItem value="password">{t('profile.tabs.mobile.password')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Desktop: Tab buttons */}
          <div className="hidden sm:flex items-center space-x-2 py-4 overflow-x-auto">
            <nav className="flex items-center space-x-2">
              <TabButton label={t('profile.tabs.info')} active={active === "info"} onClick={() => switchTab("info")} />
              <TabButton label={t('profile.tabs.verification')} active={active === "verification"} onClick={() => switchTab("verification")} />
              <TabButton label={t('profile.tabs.twofa')} active={active === "2fa"} onClick={() => switchTab("2fa")} />
              <TabButton label={t('profile.tabs.password')} active={active === "password"} onClick={() => switchTab("password")} />
            </nav>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto p-6 pt-8 relative z-20">
        {active === "info" && <InfoTab />}
        {active === "verification" && <VerificationTab />}
        {active === "2fa" && <TwoFATab />}
        {active === "password" && <PasswordTab />}
      </div>
      </div>
    </div>
  )
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <Button variant={active ? "default" : "ghost"} className="px-4" onClick={onClick}>
      {label}
    </Button>
  )
}

function SidebarItem() { return null }

function InfoTab() {
  const { addToast } = useToast()
  const { user } = useUser()
  const { t } = useLanguage()
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    country: '',
    city: '',
    address: '',
    postcode: '',
    gender: '',
    dateOfBirth: '',
    profileImage: ''
  })
  const [wallets, setWallets] = useState<Array<{
    id: string
    address: string
    type: string
    createdAt: string
  }>>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadingWallet, setLoadingWallet] = useState(true)

  // Загружаем данные профиля при загрузке компонента
  useEffect(() => {
    if (user?.email) {
      loadProfile()
      loadWallet()
    }
  }, [user?.email])

  const loadWallet = async () => {
    try {
      setLoadingWallet(true)
      const response = await fetch('/api/client/wallet')
      const result = await response.json()
      
      if (response.ok && result.wallets) {
        setWallets(result.wallets)
      }
    } catch (error) {
      console.error('Error loading wallet:', error)
    } finally {
      setLoadingWallet(false)
    }
  }

  const loadProfile = async () => {
    try {
      const response = await authenticatedFetch(`/api/profile`)
      const result = await response.json()
      
      if (result.success) {
        setProfileData({
          firstName: result.data.firstName || '',
          lastName: result.data.lastName || '',
          email: result.data.email || '',
          phone: result.data.phone || '',
          country: result.data.country || '',
          city: result.data.city || '',
          address: result.data.address || '',
          postcode: result.data.postcode || '',
          gender: result.data.gender || '',
          dateOfBirth: result.data.dateOfBirth || '',
          profileImage: result.data.profileImage || ''
        })
      }
    } catch (error) {
      console.error('Error loading profile:', error)
      addToast({
        type: 'error',
        title: t('profile.loadError.title'),
        description: t('profile.loadError.desc')
      })
    } finally {
      setLoading(false)
    }
  }

  const handleImageChange = async (imagePath: string | null) => {
    setProfileData(prev => ({ ...prev, profileImage: imagePath || '' }))
    
    // Автоматически сохраняем изменение фото
    try {
      const response = await authenticatedFetch(`/api/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileImage: imagePath || '' })
      })
      
      if (!response.ok) {
        addToast({
          type: 'error',
          title: t('profile.imageSaveError.title'),
          description: t('profile.imageSaveError.desc')
        })
      } else {
        if (imagePath) {
          addToast({
            type: 'success',
            title: t('profile.photoUpdated.title'),
            description: t('profile.photoUpdated.desc')
          })
        } else {
          addToast({
            type: 'success',
            title: t('profile.photoRemoved.title'),
            description: t('profile.photoRemoved.desc')
          })
        }
        
        // Отправляем событие обновления профиля для обновления аватара в хедере
        const updatedProfile = { ...profileData, profileImage: imagePath || '' }
        window.dispatchEvent(new CustomEvent('profileUpdated', { detail: updatedProfile }))
      }
    } catch (error) {
      console.error('Error saving profile image:', error)
      addToast({
        type: 'error',
        title: t('profile.networkError.title'),
        description: t('profile.networkError.desc')
      })
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await authenticatedFetch(`/api/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData)
      })
      
      if (response.ok) {
        addToast({
          type: 'success',
          title: t('profile.saveSuccess.title'),
          description: t('profile.saveSuccess.desc')
        })
      } else {
        addToast({
          type: 'error',
          title: t('profile.saveFailed.title'),
          description: t('profile.saveFailed.desc')
        })
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      addToast({
        type: 'error',
        title: t('profile.networkError.title'),
        description: t('profile.networkError.desc')
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center p-8">{t('profile.loading')}</div>
  }

  return (
    <div className="space-y-6">
      {/* Wallet Section */}
      {!loadingWallet && wallets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Крипто кошелек</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {wallets.map((wallet) => (
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
                <p className="text-xs text-muted-foreground">
                  ID: {wallet.id}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="col-span-full">
          <div className="w-full flex justify-center mb-6">
            <ImageUpload
              currentImage={profileData.profileImage}
              onImageChange={handleImageChange}
            />
          </div>
        </div>
      <div className="space-y-2">
        <Label>{t('profile.name')}:</Label>
        <Input 
          placeholder="Name" 
          value={profileData.firstName}
          onChange={(e) => handleInputChange('firstName', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>{t('profile.surname')}:</Label>
        <Input 
          placeholder="Surname" 
          value={profileData.lastName}
          onChange={(e) => handleInputChange('lastName', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>{t('profile.gender')}:</Label>
        <Select value={profileData.gender} onValueChange={(value) => handleInputChange('gender', value)}>
          <SelectTrigger>
            <SelectValue placeholder={t('profile.gender')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="male">{t('profile.gender.male')}</SelectItem>
            <SelectItem value="female">{t('profile.gender.female')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>{t('profile.dob')}:</Label>
        <Input 
          type="date" 
          placeholder="Date of Birth" 
          value={profileData.dateOfBirth}
          onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>{t('profile.country')}:</Label>
        <Select value={profileData.country} onValueChange={(value) => handleInputChange('country', value)}>
          <SelectTrigger>
            <SelectValue placeholder={t('profile.country')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ru">Россия</SelectItem>
            <SelectItem value="pl">Poland</SelectItem>
            <SelectItem value="de">Germany</SelectItem>
            <SelectItem value="us">United States</SelectItem>
            <SelectItem value="gb">United Kingdom</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>{t('profile.city')}:</Label>
        <Input 
          placeholder="City" 
          value={profileData.city}
          onChange={(e) => handleInputChange('city', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>{t('profile.address')}:</Label>
        <Input 
          placeholder="Address" 
          value={profileData.address}
          onChange={(e) => handleInputChange('address', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>{t('profile.postcode')}:</Label>
        <Input 
          placeholder="Postcode" 
          value={profileData.postcode}
          onChange={(e) => handleInputChange('postcode', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>{t('profile.email')}:</Label>
        <Input 
          type="email" 
          placeholder="Email" 
          value={profileData.email}
          onChange={(e) => handleInputChange('email', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>{t('profile.phone')}:</Label>
        <Input 
          placeholder="+380..." 
          value={profileData.phone}
          onChange={(e) => handleInputChange('phone', e.target.value)}
        />
      </div>
      <div className="col-span-full flex gap-4 pt-2">
        <Button variant="secondary" className="w-40" onClick={() => loadProfile()}>
          {t('common.cancel')}
        </Button>
        <Button className="w-40" onClick={handleSave} disabled={saving}>
          {saving ? t('common.sending') : t('common.save')}
        </Button>
      </div>
      </div>
    </div>
  )
}

function VerificationTab() {
  const { addToast } = useToast()
  const { t } = useLanguage()
  const { user } = useUser()
  const [verificationData, setVerificationData] = useState({
    documentFront: '',
    documentBack: '',
    status: 'not_verified', // not_verified, pending, approved, rejected
    submittedAt: ''
  })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const loadVerificationData = async () => {
    try {
      console.log('[Profile] User email:', user?.email)
      const url = user?.email ? `/api/verification?email=${encodeURIComponent(user.email)}` : '/api/verification'
      console.log('[Profile] Fetching verification from:', url)
      const response = await fetch(url)
      const result = await response.json()
      console.log('[Profile] Verification result:', result)
      
      if (result.success) {
        setVerificationData({
          documentFront: result.data.documentFront || '',
          documentBack: result.data.documentBack || '',
          status: result.data.status || 'not_verified',
          submittedAt: result.data.submittedAt || ''
        })
      }
    } catch (error) {
      console.error('Error loading verification data:', error)
      addToast({
        type: 'error',
        title: t('profile.loadError.title'),
        description: t('profile.loadError.desc')
      })
    } finally {
      setLoading(false)
    }
  }

  // Загружаем данные верификации когда user загрузится
  useEffect(() => {
    if (user?.email) {
      console.log('[Profile] User loaded, fetching verification data')
      loadVerificationData()
    } else {
      console.log('[Profile] No user email yet, skipping verification load')
      setLoading(false)
    }
  }, [user?.email])

  const handleImageChange = async (field: 'documentFront' | 'documentBack', imagePath: string | null) => {
    // Проверяем, заблокированы ли документы (для PENDING и APPROVED)
    const isLocked = verificationData.status === 'PENDING' || verificationData.status === 'pending' ||
                     verificationData.status === 'APPROVED' || verificationData.status === 'approved'
    
    if (isLocked) {
      const isPending = verificationData.status === 'PENDING' || verificationData.status === 'pending'
      addToast({
        type: 'error',
        title: isPending ? 'Документы на проверке' : 'Документы защищены',
        description: isPending 
          ? 'Невозможно изменить документы во время проверки'
          : 'Невозможно изменить верифицированные документы'
      })
      return
    }
    
    setVerificationData(prev => ({ ...prev, [field]: imagePath || '' }))
    
    if (!user?.email) {
      console.log('[Profile] No user email, cannot save document')
      addToast({
        type: 'error',
        title: 'Not authorized',
        description: 'Please log in to upload documents'
      })
      return
    }
    
    // Автоматически сохраняем изменение
    try {
      console.log('[Profile] Saving document:', field, 'for user:', user.email)
      const response = await fetch('/api/verification', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          [field]: imagePath || '',
          email: user.email
        })
      })
      
      if (!response.ok) {
        addToast({
          type: 'error',
          title: 'Failed to save document',
          description: 'Please try again later'
        })
      } else {
        addToast({
          type: 'success',
          title: 'Document saved!',
          description: `Document ${field === 'documentFront' ? 'front' : 'back'} has been ${imagePath ? 'uploaded' : 'removed'} successfully`
        })
      }
    } catch (error) {
      console.error('Error saving document:', error)
      addToast({
        type: 'error',
        title: 'Network error',
        description: 'Unable to save document. Please try again.'
      })
    }
  }

  const handleSubmitForReview = async () => {
    if (!user?.email) {
      addToast({
        type: 'error',
        title: 'Not authorized',
        description: 'Please log in to submit documents'
      })
      return
    }

    if (!verificationData.documentFront || !verificationData.documentBack) {
      addToast({
        type: 'warning',
        title: 'Documents required',
        description: 'Please upload both front and back document photos before submitting'
      })
      return
    }

    setSubmitting(true)
    try {
      console.log('[Profile] Submitting for review for user:', user.email)
      const response = await fetch('/api/verification', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'PENDING',
          submittedAt: new Date().toISOString(),
          email: user.email
        })
      })
      
      if (response.ok) {
        setVerificationData(prev => ({ 
          ...prev, 
          status: 'PENDING',
          submittedAt: new Date().toISOString()
        }))
        addToast({
          type: 'success',
          title: 'Submitted for review!',
          description: 'Your documents have been submitted for verification. We will review them within 24-48 hours.'
        })
      } else {
        addToast({
          type: 'error',
          title: 'Submission failed',
          description: 'Unable to submit documents for review. Please try again.'
        })
      }
    } catch (error) {
      console.error('Error submitting for review:', error)
      addToast({
        type: 'error',
        title: 'Network error',
        description: 'Unable to submit documents. Please try again.'
      })
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusInfo = () => {
    switch (verificationData.status) {
      case 'PENDING':
      case 'pending':
        return { text: "● Pending review", cls: "text-yellow-500" }
      case 'APPROVED':
      case 'approved':
        return { text: "● Verified", cls: "text-green-500" }
      case 'REJECTED':
      case 'rejected':
        return { text: "● Rejected", cls: "text-red-500" }
      case 'RESUBMIT':
        return { text: "● Resubmit required", cls: "text-orange-500" }
      case 'DRAFT':
      default:
        return { text: "● Not verified", cls: "text-gray-500" }
    }
  }

  if (loading) {
    return <div className="flex justify-center p-8">{t('profile.verif.loading')}</div>
  }

  const status = getStatusInfo()
  const normalizedStatus = (verificationData.status || '').toString().toUpperCase()
  const isPendingStatus = normalizedStatus === 'PENDING'
  const isApprovedStatus = normalizedStatus === 'APPROVED'
  const isLocked = isPendingStatus || isApprovedStatus
  const hasBothDocuments = !!verificationData.documentFront && !!verificationData.documentBack
  const canSubmit = hasBothDocuments && !isPendingStatus && !isApprovedStatus

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">
        {t('profile.verif.status')} <span className={status.cls}>{status.text}</span>
      </h2>
      
      {isApprovedStatus && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
          {t('profile.verif.approvedNote')}
        </div>
      )}
      
      {normalizedStatus === 'REJECTED' && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {t('profile.verif.rejected')}
        </div>
      )}
      
      {isPendingStatus && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
          {t('profile.verif.pendingNote')}
        </div>
      )}

      {!isLocked && (
        <div className="rounded-lg border p-6 bg-muted/20">
          <p className="mb-6 text-sm text-muted-foreground">
            {t('profile.verif.instructions')}
          </p>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <DocumentUpload
              title={t('profile.verif.frontTitle')}
              description={t('profile.verif.frontDesc')}
              currentImage={verificationData.documentFront}
              onImageChange={(imagePath) => handleImageChange('documentFront', imagePath)}
              className="w-full"
            />
            
            <DocumentUpload
              title={t('profile.verif.backTitle')}
              description={t('profile.verif.backDesc')}
              currentImage={verificationData.documentBack}
              onImageChange={(imagePath) => handleImageChange('documentBack', imagePath)}
              className="w-full"
            />
          </div>
          
          <div className="pt-6 flex gap-3">
            <Button 
              disabled={!canSubmit || submitting} 
              onClick={handleSubmitForReview}
              className="min-w-[150px]"
            >
              {submitting ? t('profile.verif.submitting') : t('profile.verif.submit')}
            </Button>
            
            {verificationData.submittedAt && (
              <div className="flex items-center text-sm text-muted-foreground">
                {t('profile.verif.lastSubmitted')} {new Date(verificationData.submittedAt).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function TwoFATab() {
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [settingUp, setSettingUp] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [disabling, setDisabling] = useState(false)
  const [secret, setSecret] = useState<string>('')
  const [otpauth, setOtpauth] = useState<string>('')
  const [token, setToken] = useState('')
  const { user } = useUser()
  useEffect(() => {
    const loadStatus = async () => {
      try {
        const res = await authenticatedFetch(`/api/2fa`)
        const json = await res.json()
        setEnabled(!!json.enabled)
      } finally {
        setLoading(false)
      }
    }
    loadStatus()
  }, [])

  const setup2fa = async () => {
    setSettingUp(true)
    try {
      const res = await authenticatedFetch(`/api/2fa`, {
        method: 'POST',
        body: JSON.stringify({ action: 'setup' })
      })
      const json = await res.json()
      if (json.success) {
        setSecret(json.secret)
        setOtpauth(json.otpauth)
        setEnabled(false)
      }
    } finally {
      setSettingUp(false)
    }
  }

  const verify2fa = async () => {
    if (!token) return
    setVerifying(true)
    try {
      const res = await authenticatedFetch(`/api/2fa`, {
        method: 'POST',
        body: JSON.stringify({ action: 'verify', token })
      })
      const json = await res.json()
      if (json.success) {
        setEnabled(true)
        setToken('')
      }
    } finally {
      setVerifying(false)
    }
  }

  const disable2fa = async () => {
    setDisabling(true)
    try {
      const res = await authenticatedFetch(`/api/2fa`, {
        method: 'POST',
        body: JSON.stringify({ action: 'disable' })
      })
      const json = await res.json()
      if (json.success) {
        setEnabled(false)
        setSecret('')
        setOtpauth('')
        setToken('')
      }
    } finally {
      setDisabling(false)
    }
  }

  const { t } = useLanguage()
  if (loading) {
    return <div className="flex justify-center p-8">{t('profile.2fa.loading')}</div>
  }

  return (
    <div className="space-y-6">
      <div className="rounded-md bg-muted/30 p-4 text-sm">{t('profile.2fa.recommend')}</div>

      {/* Status */}
      <div className="flex items-center gap-3">
        <span className={enabled ? 'text-green-600' : 'text-red-600'}>
          {enabled ? t('profile.2fa.enabled') : t('profile.2fa.disabled')}
        </span>
        {!enabled ? (
          <Button className="w-40" onClick={setup2fa} disabled={settingUp}>
            {settingUp ? t('profile.2fa.preparing') : t('profile.2fa.setup')}
          </Button>
        ) : (
          <Button variant="secondary" className="w-40" onClick={disable2fa} disabled={disabling}>
            {disabling ? t('profile.2fa.disabling') : t('profile.2fa.disable')}
          </Button>
        )}
      </div>

      {/* Setup details */}
      {!enabled && !!secret && (
        <div className="rounded-lg border p-6 space-y-4">
          <div className="text-sm text-muted-foreground">{t('profile.2fa.scanQr')}</div>
          {otpauth && (
            <div className="flex flex-col items-center gap-2">
              <img
                alt="2FA QR"
                className="w-40 h-40"
                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(otpauth)}`}
              />
              <a href={otpauth} className="text-xs text-blue-600 underline" target="_blank" rel="noreferrer">{t('profile.2fa.openOtpauth')}</a>
            </div>
          )}
          <div>
            <div className="text-sm font-medium">{t('profile.2fa.secret')}</div>
            <div className="mt-1 select-all break-all text-sm p-2 rounded bg-muted/40">{secret}</div>
          </div>
          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-2">
              <label className="text-sm">{t('profile.2fa.enterCode')}</label>
              <Input placeholder="000000" value={token} onChange={(e)=>setToken(e.target.value)} />
            </div>
            <Button className="w-40" onClick={verify2fa} disabled={verifying || token.length < 6}>
              {verifying ? t('profile.2fa.verifying') : t('profile.2fa.verify')}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function PasswordTab() {
  const { t } = useLanguage()
  return (
    <div className="max-w-2xl space-y-6">
      <div className="space-y-2">
        <Label>{t('profile.password.old')}</Label>
        <Input type="password" placeholder={t('profile.password.old')} />
      </div>
      <div className="space-y-2">
        <Label>{t('profile.password.new')}</Label>
        <Input type="password" placeholder={t('profile.password.new')} />
      </div>
      <div className="space-y-2">
        <Label>{t('profile.password.repeat')}</Label>
        <Input type="password" placeholder={t('profile.password.repeat')} />
      </div>
      <div className="rounded-md bg-muted/30 p-4 text-sm">
        {t('profile.password.help')}
      </div>
      <Button className="w-40">{t('profile.password.change')}</Button>
    </div>
  )
}


