import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: any) {
  try {
    const session = await getServerSession(authOptions)
    const email = session?.user?.email
    if (!email) return NextResponse.json({ position: null })

    const position = await prisma.position.findUnique({ where: { id: params.id } })
    if (!position) return NextResponse.json({ position: null })

    const account = await prisma.tradingAccount.findUnique({ where: { id: position.tradingAccountId } })
    if (!account) return NextResponse.json({ position: null })
    const user = await prisma.user.findUnique({ where: { id: account.userId || '' } })
    if (!user || (user.email || undefined) !== email) return NextResponse.json({ position: null })

    return NextResponse.json({ position })
  } catch (error) {
    console.error('GET /api/v1/positions/{id} error:', error)
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}


