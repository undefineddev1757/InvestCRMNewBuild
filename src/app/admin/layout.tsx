"use client"

import { AdminSidebar } from "@/components/admin-sidebar"
import { LanguageSwitcher } from "@/components/ui/language-switcher"
import { ThemeSwitcher } from "@/components/ui/theme-switcher"
import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { User, LogOut, Settings } from "lucide-react"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [adminName, setAdminName] = useState<string | null>(null)
  const [adminEmail, setAdminEmail] = useState<string | null>(null)
  
  // Проверяем, находимся ли мы на странице логина
  const isLoginPage = pathname === '/admin/login'
  
  useEffect(() => {
    // Проверяем авторизацию только если не на странице логина
    if (!isLoginPage) {
      try {
        const authed = localStorage.getItem('admin_authed')
        if (authed !== '1') {
          router.replace('/admin/login')
        } else {
          // Загружаем данные администратора
          const name = localStorage.getItem('admin_name')
          const email = localStorage.getItem('admin_email')
          setAdminName(name)
          setAdminEmail(email)
        }
      } catch {}
    }
  }, [router, isLoginPage])
  
  const handleLogout = () => {
    try {
      localStorage.removeItem('admin_authed')
      localStorage.removeItem('admin_name')
      localStorage.removeItem('admin_email')
      router.push('/admin/login')
    } catch {}
  }
  
  // Если страница логина, показываем только контент без сайдбара и хедера
  if (isLoginPage) {
    return <>{children}</>
  }
  
  return (
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Верхняя панель с переключателями */}
        <header className="h-16 border-b flex items-center justify-end px-6 gap-3">
          <LanguageSwitcher />
          <ThemeSwitcher />
          
          {/* User info */}
          <div className="flex items-center gap-3 border-l pl-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {adminName || adminEmail || 'Admin'}
              </span>
            </div>
            
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/admin/profile')}
                title="Профиль"
              >
                <User className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                title="Выйти"
                className="text-red-600 hover:text-red-700"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>
        
        {/* Основной контент */}
        <main className="flex-1 overflow-y-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  )
}