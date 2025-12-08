// Simple in-memory pub/sub bus that survives hot-reloads via globalThis
// Not for multi-instance clustering, but perfect for a single Next.js server process

type Subscriber<T = any> = (payload: T) => void

interface EventBus {
  channels: Map<string, Set<Subscriber>>
  subscribe: (channel: string, handler: Subscriber) => () => void
  publish: (channel: string, payload: any) => void
}

function createBus(): EventBus {
  const channels = new Map<string, Set<Subscriber>>()

  const subscribe = (channel: string, handler: Subscriber) => {
    let set = channels.get(channel)
    if (!set) {
      set = new Set()
      channels.set(channel, set)
    }
    set.add(handler)
    return () => {
      try {
        const s = channels.get(channel)
        if (s) {
          s.delete(handler)
          if (s.size === 0) channels.delete(channel)
        }
      } catch {}
    }
  }

  const publish = (channel: string, payload: any) => {
    const set = channels.get(channel)
    if (!set || set.size === 0) return
    for (const handler of Array.from(set)) {
      try { handler(payload) } catch {}
    }
  }

  return { channels, subscribe, publish }
}

const g = globalThis as any
if (!g.__EVENT_BUS__) {
  g.__EVENT_BUS__ = createBus()
}

export const eventBus: EventBus = g.__EVENT_BUS__ as EventBus

// Helper channel name builder for adjustments
export const adjustmentsChannel = (symbol: string) => `adjustments:${symbol.toUpperCase()}`


