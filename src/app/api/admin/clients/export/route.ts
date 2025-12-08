import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function toCsv(rows: Array<Record<string, any>>): string {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  const escape = (v: any) => {
    if (v === null || v === undefined) return ''
    const s = String(v)
    if (s.includes('"') || s.includes(',') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"'
    }
    return s
  }
  const lines = [headers.join(',')]
  for (const row of rows) {
    lines.push(headers.map(h => escape(row[h])).join(','))
  }
  return lines.join('\n')
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const limit = parseInt(url.searchParams.get('limit') || '1000')

    const clients = await prisma.client.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
        accessLevel: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { tradingAccounts: true, financialAccounts: true, transactions: true }
        }
      }
    })

    const rows = clients.map((c) => ({
      id: c.id,
      name: c.name || '',
      email: c.email,
      phone: c.phone || '',
      isActive: c.isActive ? 'active' : 'blocked',
      accessLevel: c.accessLevel,
      tradingAccounts: c._count?.tradingAccounts ?? 0,
      financialAccounts: c._count?.financialAccounts ?? 0,
      transactions: c._count?.transactions ?? 0,
      createdAt: new Date(c.createdAt).toISOString(),
      updatedAt: new Date(c.updatedAt).toISOString(),
    }))

    const csv = toCsv(rows)
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="clients_export_${Date.now()}.csv"`
      }
    })
  } catch (e) {
    console.error('Export clients error:', e)
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}


