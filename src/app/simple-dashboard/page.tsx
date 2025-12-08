"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface User {
  id: string
  name: string
  email: string
}

export default function SimpleDashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Перевіряємо, чи є користувач в localStorage
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      setUser(JSON.parse(savedUser))
    } else {
      router.push('/test-login')
    }
    setIsLoading(false)
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('user')
    router.push('/test-login')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">InvestCRM</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Привіт, {user.name}!
              </span>
              <Button
                variant="outline"
                onClick={handleLogout}
              >
                Вийти
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Клієнтський кабінет
            </h2>
            <p className="text-gray-600">
              Ласкаво просимо в систему управління інвестиціями
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Портфель</CardTitle>
                <CardDescription>
                  Управління вашими інвестиціями
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">₴0.00</p>
                <p className="text-sm text-gray-500">Загальна вартість</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Транзакції</CardTitle>
                <CardDescription>
                  Історія ваших операцій
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-blue-600">0</p>
                <p className="text-sm text-gray-500">Всього операцій</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Аналітика</CardTitle>
                <CardDescription>
                  Статистика та звіти
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-purple-600">0%</p>
                <p className="text-sm text-gray-500">Прибутковість</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Профіль</CardTitle>
                <CardDescription>
                  Ваші особисті дані
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm"><strong>Ім'я:</strong> {user.name}</p>
                  <p className="text-sm"><strong>Email:</strong> {user.email}</p>
                  <p className="text-sm"><strong>ID:</strong> {user.id}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Інвестиції</CardTitle>
                <CardDescription>
                  Активні інвестиційні програми
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-orange-600">0</p>
                <p className="text-sm text-gray-500">Активних програм</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Підтримка</CardTitle>
                <CardDescription>
                  Допомога та консультації
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">
                  Зв'язатися з підтримкою
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
