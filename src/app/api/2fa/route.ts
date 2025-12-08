import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUserOrClient } from '@/lib/get-current-user'
import { generateSecret, buildOtpAuthURL, verifyTotpToken } from '@/lib/totp'

export async function GET(req: NextRequest) {
  try {
    const userOrClient = await getCurrentUserOrClient(req)
    if (!userOrClient) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const email = userOrClient.data.email
    const record = await prisma.twoFactor.findUnique({ where: { email } })
    return NextResponse.json({ success: true, enabled: !!record?.enabled })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const action: 'setup' | 'verify' | 'disable' = body.action
    const userOrClient = await getCurrentUserOrClient(req)
    if (!userOrClient) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const email = userOrClient.data.email

    if (action === 'setup') {
      const secret = generateSecret()
      const otpauth = buildOtpAuthURL({ secret, accountName: email, issuer: 'InvestCRM' })
      await prisma.twoFactor.upsert({
        where: { email },
        update: { secret, enabled: false },
        create: { email, secret, enabled: false },
      })
      return NextResponse.json({ success: true, secret, otpauth })
    }

    if (action === 'verify') {
      const token: string = String(body.token || '')
      const record = await prisma.twoFactor.findUnique({ where: { email } })
      if (!record?.secret) return NextResponse.json({ success: false, error: 'Setup required' }, { status: 400 })
      const ok = verifyTotpToken(token, record.secret)
      if (!ok) return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 400 })
      await prisma.twoFactor.update({ where: { email }, data: { enabled: true } })
      return NextResponse.json({ success: true })
    }

    if (action === 'disable') {
      await prisma.twoFactor.update({ where: { email }, data: { enabled: false } })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
