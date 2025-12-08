"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/contexts/user-context'

export default function Home() {
  const { user } = useUser()
  const router = useRouter()

  useEffect(() => {
    router.replace(user ? '/dashboard' : '/auth/signin')
  }, [user, router])

  return null
}
