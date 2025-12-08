import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Получить все KYC заявки (для админа)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    
    // Формируем фильтр
    const where: any = {}
    if (status && status !== 'ALL') {
      where.status = status
    }

    // Получаем все заявки с информацией о клиентах
    const requests = await prisma.kycRequest.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            image: true,
            createdAt: true
          }
        }
      },
      orderBy: [
        { status: 'asc' }, // Сначала PENDING
        { submittedAt: 'desc' } // Потом по дате отправки
      ]
    })

    return NextResponse.json({ 
      success: true, 
      data: requests.map(req => ({
        id: req.id,
        clientId: req.clientId,
        client: req.client,
        documentFront: req.documentFront,
        documentBack: req.documentBack,
        status: req.status,
        submittedAt: req.submittedAt?.toISOString() || null,
        reviewedAt: req.reviewedAt?.toISOString() || null,
        reviewedBy: req.reviewedBy,
        reviewNotes: req.reviewNotes,
        createdAt: req.createdAt.toISOString(),
        updatedAt: req.updatedAt.toISOString()
      }))
    })

  } catch (error) {
    console.error('KYC requests fetch error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Ошибка при загрузке заявок' 
    }, { status: 500 })
  }
}
