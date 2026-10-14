/**
 * Phone normalization for Greece.
 * Stores digits only with country code preference (30...).
 */

export function normalizePhone(raw: string): string {
  let digits = raw.replace(/\D/g, '')
  if (digits.startsWith('00')) {
    digits = digits.slice(2)
  }
  if (digits.startsWith('30') && digits.length >= 12) {
    return digits
  }
  if (digits.startsWith('0') && digits.length === 10) {
    return `30${digits.slice(1)}`
  }
  if (digits.length === 10 && (digits.startsWith('69') || digits.startsWith('2'))) {
    return `30${digits}`
  }
  return digits
}

export function formatPhoneDisplay(normalized: string): string {
  if (normalized.startsWith('30') && normalized.length === 12) {
    const local = normalized.slice(2)
    return `+30 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`
  }
  return normalized
}

export function isValidGreekPhone(normalized: string): boolean {
  // Greek mobile: 3069xxxxxxxx (12 digits) or landline 302xxxxxxxx
  return /^30(69\d{8}|2\d{8,9})$/.test(normalized) || /^69\d{8}$/.test(normalized)
}
