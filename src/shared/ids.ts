/** Unique ID helpers using Web Crypto (available in Node 19+ and browsers) */

function randomBytes(size: number): Uint8Array {
  const bytes = new Uint8Array(size)
  globalThis.crypto.getRandomValues(bytes)
  return bytes
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Unique customer ID: ANC-XXXXXXXX */
export function generateCustomerId(): string {
  const part = toHex(randomBytes(4)).toUpperCase()
  return `ANC-${part}`
}

/** Unique referral code: ANGEL-XXXXXX (unpredictable, large space) */
export function generateReferralCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = randomBytes(6)
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += alphabet[bytes[i]! % alphabet.length]
  }
  return `ANGEL-${code}`
}

export function generateId(prefix: string): string {
  return `${prefix}_${toHex(randomBytes(8))}`
}

export function generateIdempotencyKey(): string {
  return toHex(randomBytes(16))
}
