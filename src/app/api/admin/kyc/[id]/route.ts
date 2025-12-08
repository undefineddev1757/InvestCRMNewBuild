import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PUT - Обновить статус KYC заявки (одобрить/отклонить)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status, reviewNotes } = body
    
    if (!status) {
      return NextResponse.json({ 
        success: false, 
        error: 'Статус обязателен' 
      }, { status: 400 })
    }

    // Проверяем что заявка существует
    const existingRequest = await prisma.kycRequest.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    if (!existingRequest) {
      return NextResponse.json({ 
        success: false, 
        error: 'Заявка не найдена' 
      }, { status: 404 })
    }

    // Обновляем заявку
    const updatedRequest = await prisma.kycRequest.update({
      where: { id },
      data: {
        status,
        reviewNotes: reviewNotes || null,
        reviewedAt: new Date(),
        reviewedBy: null // TODO: добавить ID админа из сессии
      },
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
      }
    })

    return NextResponse.json({ 
      success: true, 
      data: {
        id: updatedRequest.id,
        clientId: updatedRequest.clientId,
        client: updatedRequest.client,
        documentFront: updatedRequest.documentFront,
        documentBack: updatedRequest.documentBack,
        status: updatedRequest.status,
        submittedAt: updatedRequest.submittedAt?.toISOString() || null,
        reviewedAt: updatedRequest.reviewedAt?.toISOString() || null,
        reviewedBy: updatedRequest.reviewedBy,
        reviewNotes: updatedRequest.reviewNotes,
        createdAt: updatedRequest.createdAt.toISOString(),
        updatedAt: updatedRequest.updatedAt.toISOString()
      }
    })

  } catch (error) {
    console.error('KYC request update error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Ошибка при обновлении заявки' 
    }, { status: 500 })
  }
}

// GET - Получить конкретную KYC заявку
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const kycRequest = await prisma.kycRequest.findUnique({
      where: { id },
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
      }
    })

    if (!kycRequest) {
      return NextResponse.json({ 
        success: false, 
        error: 'Заявка не найдена' 
      }, { status: 404 })
    }

    return NextResponse.json({ 
      success: true, 
      data: {
        id: kycRequest.id,
        clientId: kycRequest.clientId,
        client: kycRequest.client,
        documentFront: kycRequest.documentFront,
        documentBack: kycRequest.documentBack,
        status: kycRequest.status,
        submittedAt: kycRequest.submittedAt?.toISOString() || null,
        reviewedAt: kycRequest.reviewedAt?.toISOString() || null,
        reviewedBy: kycRequest.reviewedBy,
        reviewNotes: kycRequest.reviewNotes,
        createdAt: kycRequest.createdAt.toISOString(),
        updatedAt: kycRequest.updatedAt.toISOString()
      }
    })

  } catch (error) {
    console.error('KYC request fetch error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Ошибка при загрузке заявки' 
    }, { status: 500 })
  }
}
