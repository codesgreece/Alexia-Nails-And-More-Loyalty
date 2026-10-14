import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { BackupPage } from './pages/BackupPage'
import { CustomerProfilePage } from './pages/CustomerProfilePage'
import { CustomersPage } from './pages/CustomersPage'
import { DashboardPage } from './pages/DashboardPage'
import { OffersPage } from './pages/OffersPage'
import { PointsPage } from './pages/PointsPage'
import { ReferralsPage } from './pages/ReferralsPage'
import { RegisterPage } from './pages/RegisterPage'
import { RewardsPage } from './pages/RewardsPage'
import { SettingsPage } from './pages/SettingsPage'
import { StatsPage } from './pages/StatsPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
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
