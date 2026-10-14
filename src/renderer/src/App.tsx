import { useCallback, useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import type { AuthStatus } from '@shared/types'
import { Layout } from './components/Layout'
import { AuthSetupPage } from './pages/AuthSetupPage'
import { BackupPage } from './pages/BackupPage'
import { CustomerProfilePage } from './pages/CustomerProfilePage'
import { CustomersPage } from './pages/CustomersPage'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { OffersPage } from './pages/OffersPage'
import { PointsPage } from './pages/PointsPage'
import { ReferralsPage } from './pages/ReferralsPage'
import { RegisterPage } from './pages/RegisterPage'
import { RewardsPage } from './pages/RewardsPage'
import { SettingsPage } from './pages/SettingsPage'
import { StatsPage } from './pages/StatsPage'
import { api } from './lib/api'

export default function App() {
  const [auth, setAuth] = useState<AuthStatus | null>(null)
  const [bootError, setBootError] = useState('')

  const refreshAuth = useCallback(async () => {
    try {
      const status = await api().auth.status()
      if (status && typeof status === 'object' && 'authenticated' in status) {
        setAuth(status as AuthStatus)
        return
      }
      // wrap() error shape
      if (status && typeof status === 'object' && 'error' in status) {
        setBootError(String((status as { error: string }).error))
        return
      }
      setAuth({ authenticated: false, needsSetup: true, user: null })
    } catch (err) {
      setBootError(err instanceof Error ? err.message : 'Σφάλμα εκκίνησης')
    }
  }, [])

  useEffect(() => {
    void refreshAuth()
  }, [refreshAuth])

  if (bootError) {
    return (
      <div className="auth-boot-error">
        <p>{bootError}</p>
      </div>
    )
  }

  if (!auth) {
    return (
      <div className="auth-boot">
        <p>Φόρτωση...</p>
      </div>
    )
  }

  if (!auth.authenticated) {
    if (auth.needsSetup) {
      return <AuthSetupPage onSuccess={() => void refreshAuth()} />
    }
    return <LoginPage onSuccess={() => void refreshAuth()} />
  }

  return (
    <Routes>
      <Route element={<Layout onLogout={() => void refreshAuth()} />}>
        <Route index element={<DashboardPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="customers/:id" element={<CustomerProfilePage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="points" element={<PointsPage />} />
        <Route path="referrals" element={<ReferralsPage />} />
        <Route path="rewards" element={<RewardsPage />} />
        <Route path="offers" element={<OffersPage />} />
        <Route path="stats" element={<StatsPage />} />
        <Route path="backup" element={<BackupPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
