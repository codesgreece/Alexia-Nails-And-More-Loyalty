export function api() {
  if (!window.angelNails) {
    throw new Error('Η σύνδεση με την εφαρμογή δεν είναι διαθέσιμη')
  }
  return window.angelNails
}

export function generateClientIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}
