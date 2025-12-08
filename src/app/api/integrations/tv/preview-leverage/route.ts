import { NextRequest, NextResponse } from 'next/server'
import { calcAll } from '@/lib/trading'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(()=>({}))
    const { symbol, side, qty, entryPrice, markPrice, leverage, mmr } = body || {}
    if (!symbol || !side || !qty || !entryPrice || !markPrice || !leverage || !mmr) {
      return NextResponse.json({ code: 'VALIDATION_FAILED' }, { status: 400 })
    }

    // Наш локальный расчёт
    const local = calcAll({ side, qty: Number(qty), entryPrice: Number(entryPrice), markPrice: Number(markPrice), leverage: Number(leverage), mmr: Number(mmr) })

    // Вызов TradingView REST previewLeverage
    const apiKey = process.env.TV_API_KEY
    let tv: any = null
    if (apiKey) {
      try {
        const res = await fetch('https://www.tradingview.com/rest-api/previewLeverage', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({ symbol, side, qty, entryPrice, markPrice, leverage, mmr })
        })
        tv = await res.json().catch(()=>null)
      } catch (e) {
        // ignore; оставим только local
      }
    }

    return NextResponse.json({ local, tv })
  } catch (e) {
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}


