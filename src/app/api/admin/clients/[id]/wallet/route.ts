import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const wallets = await prisma.wallet.findMany({
      where: {
        clientId: id
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ wallets })
  } catch (error) {
    console.error('GET /api/admin/clients/[id]/wallet error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}













