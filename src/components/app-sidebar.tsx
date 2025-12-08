"use client"

import { useRouter, usePathname } from "next/navigation"
import { PieChart, Wallet, DollarSign, Building, User, LogOut, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"
import { useUser } from "@/contexts/user-context"
import React, { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/contexts/language-context"

export function AppSidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const { logout } = useUser()
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  const { t } = useLanguage()
  
  const handleLogoutClick = () => {
    setShowLogoutDialog(true)
  }
  
  const handleLogoutConfirm = () => {
    setShowLogoutDialog(false)
    logout()
  }
  
  const handleLogoutCancel = () => {
    setShowLogoutDialog(false)
  }
  
  return (
    <aside className="w-56 min-h-[100dvh] bg-muted/20 hidden md:flex md:flex-col flex-shrink-0 relative after:content-[''] after:absolute after:top-0 after:bottom-0 after:right-0 after:w-px after:bg-border">
      <div className="h-14 flex items-center px-4 relative after:content-[''] after:absolute after:left-0 after:right-0 after:bottom-0 after:h-px after:bg-border">
        <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">I</div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        <SidebarItem icon={<PieChart className="h-4 w-4" />} label={t('nav.assets')} active={pathname === '/dashboard'} onClick={()=>router.push('/dashboard')} />
        <SidebarItem icon={<Wallet className="h-4 w-4" />} label={t('nav.accounts')} active={pathname.startsWith('/accounts')} onClick={()=>router.push('/accounts')} />
        <SidebarItem icon={<DollarSign className="h-4 w-4" />} label={t('portfolio.title')} active={pathname.startsWith('/portfolio')} onClick={()=>router.push('/portfolio')} />
        <SidebarItem icon={<MessageSquare className="h-4 w-4" />} label={t('nav.support')} active={pathname.startsWith('/messages')} onClick={()=>router.push('/messages')} />
        <SidebarItem icon={<User className="h-4 w-4" />} label={t('nav.profile')} active={pathname.startsWith('/profile')} onClick={()=>router.push('/profile')} />
      </nav>
      
      {/* Logout button at the very bottom of sidebar */}
      <div className="p-3 pt-0">
        <SidebarItem 
          icon={<LogOut className="h-4 w-4 text-red-500" />} 
          label={t('header.logout')} 
          onClick={handleLogoutClick}
          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
        />
      </div>
      
      {/* Logout Confirmation Dialog */}
      <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('common.confirmLogout')}</DialogTitle>
            <DialogDescription>
              {t('common.logoutConfirmMessage')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleLogoutCancel}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleLogoutConfirm}>
              {t('common.logout')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  )
}

function SidebarItem({ icon, label, onClick, badge, active, className }: { icon: React.ReactNode; label: string; onClick?: ()=>void; badge?: string; active?: boolean; className?: string }){
  return (
    <button onClick={onClick} className={cn("w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm",
      active ? "bg-accent text-accent-foreground" : "hover:bg-accent hover:text-accent-foreground",
      className
    )}>
      <span className="relative">
        {icon}
        {badge && (
          <span className="absolute -top-2 -right-2 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] leading-4 text-center">{badge}</span>
        )}
      </span>
      <span>{label}</span>
    </button>
  )
}


