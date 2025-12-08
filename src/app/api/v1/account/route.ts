import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserOrClient, getTradingAccount } from '@/lib/get-current-user'

export async function GET(req: NextRequest) {
  try {
    const userOrClient = await getCurrentUserOrClient(req)
    if (!userOrClient) return NextResponse.json({ account: null })

    const trading = await getTradingAccount(userOrClient)
    if (!trading) return NextResponse.json({ account: null })

    // На данном этапе equity и свободная маржа простые поля; позднее добавим суммарный PnL/fees
    const balance = trading.balance?.toString?.() ?? '0'
    const marginUsed = trading.margin?.toString?.() ?? '0'
    const profit = trading.profit?.toString?.() ?? '0'

    const equity = (Number(balance) + Number(profit)).toFixed(8)
    const freeMargin = (Number(equity) - Number(marginUsed)).toFixed(8)

    return NextResponse.json({
      account: {
        id: trading.id,
        number: trading.number,
        currency: trading.currency,
        balance,
        equity,
        margin_used: marginUsed,
        free_margin: freeMargin,
        updated_at: trading.updatedAt,
      }
    })
  } catch (error) {
    console.error('GET /api/v1/account error:', error)
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}


