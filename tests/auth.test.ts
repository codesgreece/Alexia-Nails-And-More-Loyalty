import './setup'
import { describe, expect, it } from 'vitest'
import {
  getAuthStatus,
  loginLocalUser,
  logoutLocalUser,
  registerLocalUser
} from '../src/main/services/authService'

describe('local auth', () => {
  it('requires setup when no users exist', () => {
    const status = getAuthStatus()
    expect(status.authenticated).toBe(false)
    expect(status.needsSetup).toBe(true)
  })

  it('registers first local user and logs in', () => {
    const created = registerLocalUser({
      username: 'salonadmin',
      password: 'secret12',
      dateOfBirth: '1990-05-15'
    })
    expect(created.success).toBe(true)
    expect(getAuthStatus().authenticated).toBe(true)

    logoutLocalUser()
    expect(getAuthStatus().authenticated).toBe(false)
    expect(getAuthStatus().needsSetup).toBe(false)

    const bad = loginLocalUser({ username: 'salonadmin', password: 'wrongpass' })
    expect(bad.success).toBe(false)

    const ok = loginLocalUser({ username: 'salonadmin', password: 'secret12' })
    expect(ok.success).toBe(true)
    expect(ok.data?.username).toBe('salonadmin')
  })

  it('blocks a second local account on the same machine', () => {
    registerLocalUser({
      username: 'firstuser',
      password: 'secret12',
      dateOfBirth: '1991-01-01'
    })
    const second = registerLocalUser({
      username: 'seconduser',
      password: 'secret34',
      dateOfBirth: '1992-02-02'
    })
    expect(second.success).toBe(false)
    expect(second.code).toBe('SETUP_DONE')
  })
})
