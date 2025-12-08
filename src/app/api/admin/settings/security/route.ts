import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - получить настройки безопасности
export async function GET(req: NextRequest) {
  try {
    const settings = await prisma.settings.findFirst({
      where: { key: 'security' }
    })

    if (!settings) {
      return NextResponse.json({
        ipWhitelist: [],
      })
    }

    const data = JSON.parse(settings.value)
    return NextResponse.json(data)
  } catch (error) {
    console.error('GET /api/admin/settings/security error:', error)
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}

// POST - сохранить настройки безопасности
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { ipWhitelist } = body

    const settingsData = {
      ipWhitelist: Array.isArray(ipWhitelist) ? ipWhitelist : [],
    }

    // Upsert settings
    await prisma.settings.upsert({
      where: { key: 'security' },
      update: {
        value: JSON.stringify(settingsData),
        updatedAt: new Date(),
      },
      create: {
        key: 'security',
        value: JSON.stringify(settingsData),
      }
    })

    return NextResponse.json({ success: true, settings: settingsData })
  } catch (error) {
    console.error('POST /api/admin/settings/security error:', error)
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}
