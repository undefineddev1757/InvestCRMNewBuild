import { NextRequest } from 'next/server'
import { eventBus, adjustmentsChannel } from '@/lib/pubsub'

// SSE stream to push price adjustment events per symbol in near-realtime
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const symbol = (searchParams.get('symbol') || '').toUpperCase()
  if (!symbol) return new Response('symbol is required', { status: 400 })

  let keepAlive: any
  let unsubscribe: (() => void) | null = null

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder()

      const safeEnqueue = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk))
        } catch {
          // controller may be already closed – ignore
        }
      }

      const send = (data: any) => safeEnqueue(`data: ${JSON.stringify(data)}\n\n`)

      // keep-alive ping (guard enqueue)
      keepAlive = setInterval(() => {
        safeEnqueue(`: ping\n\n`)
      }, 15000)

      // initial event
      send({ type: 'ready' })

      // subscribe to bus
      unsubscribe = eventBus.subscribe(adjustmentsChannel(symbol), (payload) => {
        try { send(payload) } catch {}
      })
    },
    cancel() {
      try { clearInterval(keepAlive) } catch {}
      try { unsubscribe?.() } catch {}
      unsubscribe = null
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}


