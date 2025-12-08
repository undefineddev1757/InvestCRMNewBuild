import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// GET - получить клиента по ID
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const client = await prisma.client.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        image: true,
        emailVerified: true,
        isActive: true,
        accessLevel: true,
        depositRequiredAmount: true,
        depositRequiredAt: true,
        canCreateDeals: true,
        canCreateWithdrawals: true,
        canCreateTickets: true,
        createdAt: true,
        updatedAt: true,
        tradingAccounts: {
          select: {
            id: true,
            number: true,
            type: true,
            balance: true,
            availableBalance: true,
            margin: true,
            profit: true,
            currency: true,
          }
        },
        financialAccounts: {
          select: {
            id: true,
            number: true,
            balance: true,
            availableBalance: true,
            currency: true,
          }
        },
        kycRequest: {
          select: {
            id: true,
            documentFront: true,
            documentBack: true,
            status: true,
            submittedAt: true,
            reviewedAt: true,
            reviewedBy: true,
            reviewNotes: true,
            createdAt: true,
            updatedAt: true,
          }
        },
        wallets: {
          select: {
            id: true,
            address: true,
            type: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' }
        },
      }
    })

    if (!client) {
      return NextResponse.json({ message: 'Client not found' }, { status: 404 })
    }

    return NextResponse.json({ client })
  } catch (error) {
    console.error('GET /api/admin/clients/[id] error:', error)
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}

// PATCH - обновить клиента
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { name, email, password, phone, emailVerified, isActive, accessLevel, depositRequiredAmount, canCreateDeals, canCreateWithdrawals, canCreateTickets } = body

    // Проверяем существование клиента
    const existing = await prisma.client.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ message: 'Client not found' }, { status: 404 })
    }

    // Если меняется email, проверяем уникальность
    if (email && email !== existing.email) {
      const emailTaken = await prisma.client.findUnique({ where: { email } })
      if (emailTaken) {
        return NextResponse.json({ message: 'Email already in use' }, { status: 409 })
      }
    }

    // Подготавливаем данные для обновления
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (email !== undefined) updateData.email = email
    if (phone !== undefined) updateData.phone = phone
    if (emailVerified !== undefined) updateData.emailVerified = emailVerified ? new Date() : null
    if (isActive !== undefined) updateData.isActive = isActive
    if (accessLevel !== undefined) updateData.accessLevel = accessLevel
    if (depositRequiredAmount !== undefined) {
      const amountNum = Number(depositRequiredAmount)
      updateData.depositRequiredAmount = isFinite(amountNum) && amountNum > 0 ? amountNum.toString() : '0'
      updateData.depositRequiredAt = isFinite(amountNum) && amountNum > 0 ? new Date() : null
    }
    
    // Права доступа
    if (canCreateDeals !== undefined) updateData.canCreateDeals = canCreateDeals
    if (canCreateWithdrawals !== undefined) updateData.canCreateWithdrawals = canCreateWithdrawals
    if (canCreateTickets !== undefined) updateData.canCreateTickets = canCreateTickets
    
    // Если передан новый пароль, хешируем его
    if (password) {
      updateData.password = await bcrypt.hash(password, 10)
    }

    const client = await prisma.client.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        image: true,
        emailVerified: true,
        isActive: true,
        accessLevel: true,
        depositRequiredAmount: true,
        depositRequiredAt: true,
        canCreateDeals: true,
        canCreateWithdrawals: true,
        canCreateTickets: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    return NextResponse.json({ client })
  } catch (error) {
    console.error('PATCH /api/admin/clients/[id] error:', error)
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}

// DELETE - удалить клиента
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Проверяем существование клиента
    const existing = await prisma.client.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ message: 'Client not found' }, { status: 404 })
    }

    await prisma.client.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/admin/clients/[id] error:', error)
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}
