import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getCurrentUserOrClient } from '@/lib/get-current-user'

export async function GET(req: NextRequest) {
  try {
    const userOrClient = await getCurrentUserOrClient(req)
    
    if (!userOrClient) {
      return NextResponse.json({ success: true, data: {} })
    }
    
    const email = userOrClient.data.email

    // Сначала проверяем User (админы)
    if (userOrClient.type === 'user') {
      const user = await prisma.user.findUnique({
        where: { id: userOrClient.data.id },
        select: { id: true, email: true, name: true, phone: true, image: true }
      })
      if (!user) {
        return NextResponse.json({ success: true, data: {} })
      }
      return NextResponse.json({
        success: true,
        data: {
          firstName: user.name || '',
          lastName: '',
          email: user.email,
          phone: user.phone || '',
          country: '',
          city: '',
          address: '',
          postcode: '',
          gender: '',
          dateOfBirth: '',
          profileImage: user.image || ''
        }
      })
    }

    // Если не User, значит Client
    if (userOrClient.type === 'client') {
      const client = await prisma.client.findUnique({
        where: { id: userOrClient.data.id },
        select: { id: true, email: true, name: true, phone: true, image: true }
      })
      if (!client) {
        return NextResponse.json({ success: true, data: {} })
      }
      return NextResponse.json({
        success: true,
        data: {
          firstName: client.name || '',
          lastName: '',
          email: client.email,
          phone: client.phone || '',
          country: '',
          city: '',
          address: '',
          postcode: '',
          gender: '',
          dateOfBirth: '',
          profileImage: client.image || ''
        }
      })
    }

    return NextResponse.json({ success: true, data: {} })
  } catch (error) {
    console.error('Profile fetch error:', error)
    return NextResponse.json({ success: false, error: 'Failed to load profile' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userOrClient = await getCurrentUserOrClient(request)
    
    if (!userOrClient) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const email = userOrClient.data.email

    // Сначала пробуем обновить User
    if (userOrClient.type === 'user') {
      await prisma.user.update({
        where: { id: userOrClient.data.id },
        data: {
          name: body.firstName ? String(body.firstName) : undefined,
          phone: body.phone ? String(body.phone) : undefined,
          image: body.profileImage !== undefined ? String(body.profileImage) : undefined,
        }
      })
      return NextResponse.json({ success: true })
    }

    // Если не User, обновляем Client
    if (userOrClient.type === 'client') {
      await prisma.client.update({
        where: { id: userOrClient.data.id },
        data: {
          name: body.firstName ? String(body.firstName) : undefined,
          phone: body.phone ? String(body.phone) : undefined,
          image: body.profileImage !== undefined ? String(body.profileImage) : undefined,
        }
      })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json({ success: false, error: 'Failed to save profile' }, { status: 500 })
  }
}


