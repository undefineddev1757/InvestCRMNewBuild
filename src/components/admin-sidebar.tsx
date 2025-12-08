"use client"

import { useRouter, usePathname } from "next/navigation"
import { 
  LayoutDashboard, 
  Users, 
  TrendingUp, 
  FileCheck, 
  MessageSquare, 
  ArrowLeftRight, 
  Wallet, 
  LineChart, 
  UserCog, 
  Settings,
  LogOut,
  ChevronDown,
  ChevronRight
} from "lucide-react"
import { cn } from "@/lib/utils"
import React, { useState } from "react"
import { useLanguage } from '@/contexts/language-context'

export function AdminSidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { t } = useLanguage()
  
  const handleLogout = () => {
    try {
      localStorage.removeItem('admin_authed')
      router.push('/admin/login')
    } catch {}
  }
  
  return (
    <aside className="w-64 h-screen sticky top-0 bg-muted/20 flex flex-col border-r">
      <div className="h-16 flex items-center px-6 border-b">
        <span className="font-semibold text-lg">{t('admin.sidebar.title')}</span>
      </div>
      
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <SidebarItem 
          icon={<LayoutDashboard className="h-4 w-4" />} 
          label={t('admin.sidebar.dashboard')} 
          active={pathname === '/admin'} 
          onClick={() => router.push('/admin')} 
        />
        <SidebarItem 
          icon={<Users className="h-4 w-4" />} 
          label={t('admin.sidebar.clients')} 
          active={pathname.startsWith('/admin/clients')} 
          onClick={() => router.push('/admin/clients')} 
        />
        <SidebarItem 
          icon={<TrendingUp className="h-4 w-4" />} 
          label={t('admin.sidebar.pairs')} 
          active={pathname.startsWith('/admin/pairs')} 
          onClick={() => router.push('/admin/pairs')} 
        />
        <SidebarItem 
          icon={<FileCheck className="h-4 w-4" />} 
          label={t('admin.sidebar.kyc')} 
          active={pathname.startsWith('/admin/kyc')} 
          onClick={() => router.push('/admin/kyc')} 
        />
        <SidebarItem 
          icon={<MessageSquare className="h-4 w-4" />} 
          label={t('admin.sidebar.tickets')} 
          active={pathname.startsWith('/admin/tickets')} 
          onClick={() => router.push('/admin/tickets')} 
        />
        <SidebarItem 
          icon={<ArrowLeftRight className="h-4 w-4" />} 
          label={t('admin.sidebar.transactions')} 
          active={pathname.startsWith('/admin/transactions')} 
          onClick={() => router.push('/admin/transactions')} 
        />
        <SidebarItem 
          icon={<Wallet className="h-4 w-4" />} 
          label={t('admin.sidebar.withdrawals')} 
          active={pathname.startsWith('/admin/withdrawals')} 
          onClick={() => router.push('/admin/withdrawals')} 
        />
        <SidebarItem 
          icon={<LineChart className="h-4 w-4" />} 
          label={t('admin.sidebar.deals')} 
          active={pathname.startsWith('/admin/deals')} 
          onClick={() => router.push('/admin/deals')} 
        />
        <SidebarItem 
          icon={<UserCog className="h-4 w-4" />} 
          label={t('admin.sidebar.admins')} 
          active={pathname.startsWith('/admin/admins')} 
          onClick={() => router.push('/admin/admins')} 
        />
        {/* Settings with submenu */}
        <div>
          <SidebarItem 
            icon={<Settings className="h-4 w-4" />} 
            label={t('admin.sidebar.settings')} 
            active={pathname.startsWith('/admin/settings')} 
            onClick={() => setSettingsOpen(!settingsOpen)}
            rightIcon={settingsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          />
          {settingsOpen && (
            <div className="ml-4 mt-1 space-y-1 border-l-2 border-border pl-4">
              <SidebarSubItem 
                label={t('admin.sidebar.settingsGeneral')} 
                active={pathname === '/admin/settings/general'} 
                onClick={() => router.push('/admin/settings/general')} 
              />
              <SidebarSubItem 
                label={t('admin.sidebar.settingsSecurity')} 
                active={pathname === '/admin/settings/security'} 
                onClick={() => router.push('/admin/settings/security')} 
              />
            </div>
          )}
        </div>
      </nav>
      
      <div className="p-4 border-t">
        <SidebarItem 
          icon={<LogOut className="h-4 w-4 text-red-500" />} 
          label={t('common.logout')} 
          onClick={handleLogout}
          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
        />
      </div>
    </aside>
  )
}

function SidebarItem({ icon, label, onClick, active, className, rightIcon }: { 
  icon: React.ReactNode
  label: string
  onClick?: () => void
  active?: boolean
  className?: string
  rightIcon?: React.ReactNode
}) {
  return (
    <button 
      onClick={onClick} 
      className={cn(
        "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
        active 
          ? "bg-primary text-primary-foreground" 
          : "hover:bg-accent hover:text-accent-foreground",
        className
      )}
    >
      {icon}
      <span className="flex-1 text-left">{label}</span>
      {rightIcon}
    </button>
  )
}

function SidebarSubItem({ label, onClick, active }: { 
  label: string
  onClick?: () => void
  active?: boolean
}) {
  return (
    <button 
      onClick={onClick} 
      className={cn(
        "w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
        active 
          ? "bg-accent text-accent-foreground font-medium" 
          : "hover:bg-accent/50 hover:text-accent-foreground"
      )}
    >
      <span>{label}</span>
    </button>
  )
}
