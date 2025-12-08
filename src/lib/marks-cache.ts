// Simple in-memory marks cache (per server instance)
const marks = new Map<string, { price: number; ts: number }>()

export function setMark(symbol: string, price: number) {
  const key = normalize(symbol)
  if (!Number.isFinite(price) || price <= 0) return
  marks.set(key, { price, ts: Date.now() })
}

export function getMark(symbol: string, maxAgeMs = 15000): { price: number; ts: number } | null {
  const key = normalize(symbol)
  const rec = marks.get(key)
  if (!rec) return null
  if (Date.now() - rec.ts > maxAgeMs) return null
  return rec
}

export function normalize(s: string) {
  return (s || '').replace('C:', '').replace('/', '').toUpperCase()
}


