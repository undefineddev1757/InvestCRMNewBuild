import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - получить общие настройки
export async function GET(req: NextRequest) {
  try {
    const settings = await prisma.settings.findFirst({
      where: { key: 'general' }
    })

    if (!settings) {
      return NextResponse.json({
        platformName: 'InvestCRM',
        primaryColor: '#3b82f6',
        logoUrl: null,
      })
    }

    const data = JSON.parse(settings.value)
    return NextResponse.json(data)
  } catch (error) {
    console.error('GET /api/admin/settings/general error:', error)
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}

// POST - сохранить общие настройки
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { platformName, primaryColor, logoUrl } = body

    const settingsData = {
      platformName: platformName || 'InvestCRM',
      primaryColor: primaryColor || '#3b82f6',
      logoUrl: logoUrl || null,
    }

    // Upsert settings
    await prisma.settings.upsert({
      where: { key: 'general' },
      update: {
        value: JSON.stringify(settingsData),
        updatedAt: new Date(),
      },
      create: {
        key: 'general',
        value: JSON.stringify(settingsData),
      }
    })

    return NextResponse.json({ success: true, settings: settingsData })
  } catch (error) {
    console.error('POST /api/admin/settings/general error:', error)
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}
