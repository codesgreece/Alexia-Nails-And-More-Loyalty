import { describe, expect, it } from 'vitest'
import { isNewerVersion } from '../src/shared/version'

describe('isNewerVersion', () => {
  it('detects newer patch/minor/major', () => {
    expect(isNewerVersion('1.0.1', '1.0.0')).toBe(true)
    expect(isNewerVersion('1.1.0', '1.0.9')).toBe(true)
    expect(isNewerVersion('2.0.0', '1.9.9')).toBe(true)
  })

  it('rejects equal or older versions', () => {
    expect(isNewerVersion('1.0.0', '1.0.0')).toBe(false)
    expect(isNewerVersion('1.0.0', '1.0.1')).toBe(false)
    expect(isNewerVersion('v1.0.0', '1.0.0')).toBe(false)
  })
})
