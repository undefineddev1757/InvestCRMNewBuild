import crypto from 'crypto'

// Base32 alphabet (RFC 4648, no padding in storage)
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function generateSecret(byteLength: number = 20): string {
  const random = crypto.randomBytes(byteLength)
  return toBase32(random)
}

export function buildOtpAuthURL(params: {
  secret: string
  accountName: string
  issuer?: string
  digits?: number
  period?: number
}): string {
  const issuer = params.issuer || 'InvestCRM'
  const digits = params.digits ?? 6
  const period = params.period ?? 30
  const label = encodeURIComponent(`${issuer}:${params.accountName}`)
  const query = new URLSearchParams({
    secret: params.secret,
    issuer,
    digits: String(digits),
    period: String(period),
    algorithm: 'SHA1',
  })
  return `otpauth://totp/${label}?${query.toString()}`
}

export function verifyTotpToken(token: string, secret: string, options?: { window?: number; time?: number; step?: number; digits?: number }): boolean {
  const step = options?.step ?? 30
  const digits = options?.digits ?? 6
  const timeMs = options?.time ?? Date.now()
  const window = options?.window ?? 1
  const counter = Math.floor(timeMs / 1000 / step)

  for (let errorWindow = -window; errorWindow <= window; errorWindow++) {
    const expected = generateTotp(secret, counter + errorWindow, digits)
    if (timingSafeEqual(token, expected)) return true
  }
  return false
}

export function generateTotp(secret: string, counter: number, digits: number = 6): string {
  const key = fromBase32(secret)
  const counterBuffer = Buffer.alloc(8)
  counterBuffer.writeBigUInt64BE(BigInt(counter))

  const hmac = crypto.createHmac('sha1', key).update(counterBuffer).digest()
  const offset = hmac[hmac.length - 1] & 0x0f
  const code = ((hmac[offset] & 0x7f) << 24) | ((hmac[offset + 1] & 0xff) << 16) | ((hmac[offset + 2] & 0xff) << 8) | (hmac[offset + 3] & 0xff)
  const token = (code % 10 ** digits).toString().padStart(digits, '0')
  return token
}

function timingSafeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return crypto.timingSafeEqual(ab, bb)
}

function toBase32(buffer: Buffer): string {
  let bits = 0
  let value = 0
  let output = ''
  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i]
    bits += 8
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31]
  }
  return output
}

function fromBase32(base32: string): Buffer {
  let bits = 0
  let value = 0
  const output: number[] = []
  for (let i = 0; i < base32.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(base32[i].toUpperCase())
    if (idx === -1) continue
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return Buffer.from(output)
}


