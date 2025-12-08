"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function TestLogin() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [user, setUser] = useState(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/simple-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (data.success) {
        setUser(data.user)
        // Зберігаємо користувача в localStorage для демонстрації
        localStorage.setItem('user', JSON.stringify(data.user))
        router.push("/simple-dashboard")
      } else {
        setError(data.error || "Помилка входу")
      }
    } catch (error) {
      setError("Помилка підключення")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Тестовий вхід</CardTitle>
          <CardDescription>
            Використовуйте тестові дані для входу
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div>
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="text-destructive text-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "Входимо..." : "Увійти"}
            </Button>
          </form>

          <div className="mt-6 space-y-2">
            <p className="text-sm font-medium">Тестові акаунти:</p>
            <div className="text-xs space-y-1 text-muted-foreground">
              <div>client@test.com / client123</div>
              <div>elena@test.com / elena123</div>
              <div>mikhail@test.com / mikhail123</div>
              <div>anna@test.com / anna123</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
