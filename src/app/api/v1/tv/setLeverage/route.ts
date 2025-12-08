import { NextRequest, NextResponse } from 'next/server'

// TradingView Broker API compat: https://www.tradingview.com/rest-api-spec/#operation/previewLeverage
// Проксируем на внутренний маршрут изменения плеча позиции при наличии positionId
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { positionId, leverage } = body || {}
    if (!positionId || !Number.isInteger(leverage) || leverage <= 0) {
      return NextResponse.json({ code: 'VALIDATION_FAILED' }, { status: 422 })
    }

    const url = new URL(req.url)
    const origin = url.origin
    const res = await fetch(`${origin}/api/v1/positions/${encodeURIComponent(positionId)}/set-leverage`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-correlation-id': req.headers.get('x-correlation-id') || '',
      },
      body: JSON.stringify({ leverage }),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    console.error('POST /api/v1/tv/setLeverage error:', error)
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}


