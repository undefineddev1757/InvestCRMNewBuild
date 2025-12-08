"use client"

import { useLanguage } from '@/contexts/language-context'

export default function AdminTransactionsPage() {
  const { t } = useLanguage()
  
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold tracking-tight mb-4">{t('admin.transactions.title')}</h1>
      <p className="text-muted-foreground">{t('admin.transactions.subtitle')}</p>
      {/* Здесь будет таблица транзакций */}
    </div>
  )
}
