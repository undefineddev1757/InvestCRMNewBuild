import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthSessionProvider } from '@/components/providers/session-provider'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { LanguageProvider } from '@/contexts/language-context'
import { UserProvider } from '@/contexts/user-context'
import { PriceProvider } from '@/contexts/price-context'
import { ToastProvider } from '@/components/ui/toast'
import { PlatformSettingsProvider } from '@/components/providers/platform-settings-provider'
import { PageLoadingProvider } from '@/components/providers/page-loading-provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'InvestCRM',
  description: 'Система управления инвестициями',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
        <html lang="ru" suppressHydrationWarning>
      <head>
        <link
          rel="preload"
          href="https://unpkg.com/@klinecharts/pro/dist/klinecharts-pro.css"
          as="style"
        />
        <link
          rel="stylesheet"
          href="https://unpkg.com/@klinecharts/pro/dist/klinecharts-pro.css"
        />
      </head>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <PlatformSettingsProvider>
            <PageLoadingProvider>
              <LanguageProvider>
                <UserProvider>
                  <PriceProvider>
                    <ToastProvider>
                      <AuthSessionProvider>
                        {children}
                      </AuthSessionProvider>
                    </ToastProvider>
                  </PriceProvider>
                </UserProvider>
              </LanguageProvider>
            </PageLoadingProvider>
          </PlatformSettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
