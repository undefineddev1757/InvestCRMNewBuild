import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUserOrClient } from '@/lib/get-current-user'

// GET - Получить данные верификации клиента
export async function GET(request: NextRequest) {
  try {
    // Получаем клиента через JWT токен
    const userOrClient = await getCurrentUserOrClient(request)
    
    if (!userOrClient || userOrClient.type !== 'client') {
      return NextResponse.json({ 
        success: false, 
        error: 'Не авторизован. Пожалуйста, войдите в систему.' 
      }, { status: 401 })
    }
    
    if (!userOrClient.data.isActive) {
      return NextResponse.json({ 
        success: false, 
        error: 'Аккаунт деактивирован' 
      }, { status: 403 })
    }
    
    console.log('[KYC GET] Client ID:', userOrClient.data.id)

    const clientId = userOrClient.data.id

    // Ищем KYC заявку для этого клиента
    let kycRequest = await prisma.kycRequest.findUnique({
      where: { clientId }
    })

    // Если заявки нет, создаем новую в статусе DRAFT
    if (!kycRequest) {
      kycRequest = await prisma.kycRequest.create({
        data: {
          clientId,
          status: 'DRAFT'
        }
      })
    }

    return NextResponse.json({ 
      success: true, 
      data: {
        id: kycRequest.id,
        documentFront: kycRequest.documentFront || '',
        documentBack: kycRequest.documentBack || '',
        status: kycRequest.status,
        submittedAt: kycRequest.submittedAt?.toISOString() || '',
        reviewedAt: kycRequest.reviewedAt?.toISOString() || '',
        reviewNotes: kycRequest.reviewNotes || ''
      }
    })

  } catch (error) {
    console.error('Verification fetch error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Ошибка при загрузке данных верификации' 
    }, { status: 500 })
  }
}

// PUT - Обновить документы верификации
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Получаем клиента через JWT токен
    const userOrClient = await getCurrentUserOrClient(request)
    
    if (!userOrClient || userOrClient.type !== 'client') {
      return NextResponse.json({ 
        success: false, 
        error: 'Не авторизован. Пожалуйста, войдите в систему.' 
      }, { status: 401 })
    }
    
    if (!userOrClient.data.isActive) {
      return NextResponse.json({ 
        success: false, 
        error: 'Аккаунт деактивирован' 
      }, { status: 403 })
    }
    
    console.log('[KYC PUT] Client ID:', userOrClient.data.id)

    const clientId = userOrClient.data.id
    
    // Находим или создаем KYC заявку
    let kycRequest = await prisma.kycRequest.findUnique({
      where: { clientId }
    })

    if (!kycRequest) {
      kycRequest = await prisma.kycRequest.create({
        data: {
          clientId,
          status: 'DRAFT'
        }
      })
    }

    // Подготавливаем данные для обновления
    const updateData: any = {}
    
    if (body.documentFront !== undefined) {
      updateData.documentFront = body.documentFront
    }
    if (body.documentBack !== undefined) {
      updateData.documentBack = body.documentBack
    }

    // Если статус изменился на pending, добавляем время отправки
    if (body.status === 'PENDING') {
      updateData.status = 'PENDING'
      updateData.submittedAt = new Date()
    }

    // Обновляем заявку
    const updatedRequest = await prisma.kycRequest.update({
      where: { id: kycRequest.id },
      data: updateData
    })

    return NextResponse.json({ 
      success: true, 
      data: {
        id: updatedRequest.id,
        documentFront: updatedRequest.documentFront || '',
        documentBack: updatedRequest.documentBack || '',
        status: updatedRequest.status,
        submittedAt: updatedRequest.submittedAt?.toISOString() || '',
        reviewedAt: updatedRequest.reviewedAt?.toISOString() || '',
        reviewNotes: updatedRequest.reviewNotes || ''
      }
    })

  } catch (error) {
    console.error('Verification update error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Ошибка при обновлении данных верификации' 
    }, { status: 500 })
  }
}