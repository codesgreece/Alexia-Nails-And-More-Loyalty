/** Simple semver-ish compare: returns true when remote > current. */
export function isNewerVersion(remote: string, current: string): boolean {
  const parse = (v: string) =>
    v
      .replace(/^v/i, '')
      .split(/[.+-]/)
      .map((p) => Number.parseInt(p, 10) || 0)

  const a = parse(remote)
  const b = parse(current)
  const len = Math.max(a.length, b.length)
  for (let i = 0; i < len; i++) {
    const x = a[i] ?? 0
    const y = b[i] ?? 0
    if (x > y) return true
    if (x < y) return false
  }
  return false
}
