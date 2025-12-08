import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

// Simple Server-Sent Events (SSE) stream to push client alerts in near realtime
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const email = searchParams.get('email') || ''
  if (!email) return new Response('email is required', { status: 400 })

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder()

      // Helper: send JSON as SSE message
      const send = (data: any) => {
        const payload = `data: ${JSON.stringify(data)}\n\n`
        controller.enqueue(encoder.encode(payload))
      }

      // Helper: ping to keep connection alive
      const ping = () => controller.enqueue(encoder.encode(`: ping\n\n`))

      // Fetch current state and push immediately
      let lastAmount = 0
      try {
        const client = await prisma.client.findUnique({
          where: { email },
          select: { depositRequiredAmount: true, updatedAt: true },
        })
        const raw = (client as any)?.depositRequiredAmount
        const amount = Number(typeof raw === 'string' ? raw : raw ?? 0)
        lastAmount = Number.isFinite(amount) ? amount : 0
        send({ type: 'deposit_required', amount: lastAmount })
      } catch {
        // ignore
      }

      // Poll DB every 7.5s for changes
      const pollInterval = setInterval(async () => {
        try {
          const client = await prisma.client.findUnique({
            where: { email },
            select: { depositRequiredAmount: true, updatedAt: true },
          })
          const raw = (client as any)?.depositRequiredAmount
          const amount = Number(typeof raw === 'string' ? raw : raw ?? 0)
          const next = Number.isFinite(amount) ? amount : 0
          if (next !== lastAmount) {
            lastAmount = next
            send({ type: 'deposit_required', amount: lastAmount })
          }
        } catch {
          // ignore errors, keep stream
        }
      }, 7500)

      // Keepalive pings every 15s
      const pingInterval = setInterval(ping, 15000)

      // Clean up on close/cancel
      const close = () => {
        clearInterval(pollInterval)
        clearInterval(pingInterval)
        try { controller.close() } catch {}
      }

      // Abort on client disconnect
      const signal = req.signal as AbortSignal
      if (signal.aborted) close()
      signal.addEventListener('abort', close)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Allow browser to keep connection open in Next.js streaming
      'X-Accel-Buffering': 'no',
    },
  })
}


