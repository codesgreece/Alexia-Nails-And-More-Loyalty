import { ReactNode, useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { api } from '../lib/api'

function NavGlyph({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="nav-glyph">
      {children}
    </svg>
  )
}

const icons = {
  home: (
    <NavGlyph>
      <path
        className="nav-glyph-soft"
        d="M4.5 10.8 12 4.4l7.5 6.4V19a1.6 1.6 0 0 1-1.6 1.6h-4.2v-5.2h-3.4V20.6H6.1A1.6 1.6 0 0 1 4.5 19v-8.2Z"
      />
      <path
        className="nav-glyph-hard"
        d="M9.4 20.6V14.8a1.2 1.2 0 0 1 1.2-1.2h2.8a1.2 1.2 0 0 1 1.2 1.2v5.8"
        fill="none"
      />
      <path className="nav-glyph-hard" d="M4.5 10.8 12 4.4l7.5 6.4" fill="none" />
    </NavGlyph>
  ),
  customers: (
    <NavGlyph>
      <circle className="nav-glyph-soft" cx="12" cy="8" r="3.6" />
      <path className="nav-glyph-soft" d="M5.2 19.2a6.8 6.8 0 0 1 13.6 0v.4H5.2v-.4Z" />
      <circle className="nav-glyph-hard" cx="12" cy="8" r="3.6" fill="none" />
      <path className="nav-glyph-hard" d="M5.8 19.4a6.4 6.4 0 0 1 12.4 0" fill="none" />
    </NavGlyph>
  ),
  register: (
    <NavGlyph>
      <rect className="nav-glyph-soft" x="4.2" y="3.8" width="15.6" height="16.4" rx="3.2" />
      <path className="nav-glyph-hard" d="M8.2 8.2h7.6M8.2 12h7.6M8.2 15.8h4.4" fill="none" />
      <circle className="nav-glyph-accent" cx="17.2" cy="17.2" r="3.4" />
      <path className="nav-glyph-on-accent" d="M17.2 15.6v3.2M15.6 17.2h3.2" fill="none" />
    </NavGlyph>
  ),
  points: (
    <NavGlyph>
      <circle className="nav-glyph-soft" cx="12" cy="12" r="8.2" />
      <circle className="nav-glyph-hard" cx="12" cy="12" r="8.2" fill="none" />
      <circle className="nav-glyph-hard" cx="12" cy="12" r="6.1" fill="none" />
      <path
        className="nav-glyph-hard"
        d="M12 8.2v7.6M10 10.2h2.4a1.5 1.5 0 0 1 0 3H10m0 0h2.6a1.5 1.5 0 1 1 0 3H10"
        fill="none"
      />
    </NavGlyph>
  ),
  referrals: (
    <NavGlyph>
      <circle className="nav-glyph-soft" cx="9" cy="8.2" r="3.1" />
      <circle className="nav-glyph-soft" cx="16.4" cy="9.2" r="2.5" />
      <path className="nav-glyph-soft" d="M3.8 18.8a5.4 5.4 0 0 1 10.4 0v.4H3.8v-.4Z" />
      <path className="nav-glyph-soft" d="M14.2 18.8a4.2 4.2 0 0 1 6 0v.4h-6v-.4Z" />
      <circle className="nav-glyph-hard" cx="9" cy="8.2" r="3.1" fill="none" />
      <circle className="nav-glyph-hard" cx="16.4" cy="9.2" r="2.5" fill="none" />
      <path className="nav-glyph-accent" d="M18.8 4.4v3.4M17.1 6.1h3.4" fill="none" />
    </NavGlyph>
  ),
  rewards: (
    <NavGlyph>
      <path
        className="nav-glyph-soft"
        d="m12 3.4 2.35 4.76 5.25.76-3.8 3.7.9 5.24L12 15.5l-4.7 2.36.9-5.24-3.8-3.7 5.25-.76L12 3.4Z"
      />
      <path
        className="nav-glyph-hard"
        d="m12 3.4 2.35 4.76 5.25.76-3.8 3.7.9 5.24L12 15.5l-4.7 2.36.9-5.24-3.8-3.7 5.25-.76L12 3.4Z"
        fill="none"
      />
      <circle className="nav-glyph-accent" cx="12" cy="11.2" r="1.5" />
    </NavGlyph>
  ),
  offers: (
    <NavGlyph>
      <path
        className="nav-glyph-soft"
        d="M4.4 10.2 10.2 4.4a2 2 0 0 1 1.4-.6h5.8A2.2 2.2 0 0 1 19.6 6v5.8a2 2 0 0 1-.6 1.4l-5.8 5.8a2 2 0 0 1-2.8 0L4.4 13a2 2 0 0 1 0-2.8Z"
      />
      <path
        className="nav-glyph-hard"
        d="M4.4 10.2 10.2 4.4a2 2 0 0 1 1.4-.6h5.8A2.2 2.2 0 0 1 19.6 6v5.8a2 2 0 0 1-.6 1.4l-5.8 5.8a2 2 0 0 1-2.8 0L4.4 13a2 2 0 0 1 0-2.8Z"
        fill="none"
      />
      <circle className="nav-glyph-accent" cx="15.4" cy="8.4" r="1.35" />
    </NavGlyph>
  ),
  stats: (
    <NavGlyph>
      <rect className="nav-glyph-soft" x="3.6" y="4" width="16.8" height="16" rx="3" />
      <path className="nav-glyph-hard" d="M7.2 16.4V12M12 16.4V8.4M16.8 16.4v-3.2" fill="none" />
      <path className="nav-glyph-accent" d="M6.4 18.2h11.2" fill="none" />
    </NavGlyph>
  ),
  backup: (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="util-glyph">
      <path d="M7 18h10a4 4 0 0 0 .2-8 5.5 5.5 0 0 0-10.7 1.2A3.5 3.5 0 0 0 7 18Z" />
      <path d="M12 11v5.2" />
      <path d="m9.8 14.2 2.2 2.2 2.2-2.2" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="util-glyph">
      <path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z" />
      <path d="M19.4 12.9v-1.8l1.5-1.2-1.5-2.6-1.9.4a6.8 6.8 0 0 0-1.5-.9l-.4-1.9h-3l-.4 1.9a6.8 6.8 0 0 0-1.5.9l-1.9-.4-1.5 2.6 1.5 1.2v1.8l-1.5 1.2 1.5 2.6 1.9-.4c.46.36.96.65 1.5.9l.4 1.9h3l.4-1.9c.54-.25 1.04-.54 1.5-.9l1.9.4 1.5-2.6-1.5-1.2Z" />
    </svg>
  )
}

const navItems = [
  { to: '/', label: 'Επισκόπηση', icon: icons.home },
  { to: '/customers', label: 'Πελάτισσες', icon: icons.customers },
  { to: '/register', label: 'Νέα Εγγραφή', icon: icons.register },
  { to: '/points', label: 'Πόντοι & Συναλλαγές', icon: icons.points },
  { to: '/referrals', label: 'Σύστησε μια Φίλη', icon: icons.referrals },
  { to: '/rewards', label: 'Ανταμοιβές', icon: icons.rewards },
  { to: '/offers', label: 'Προσφορές & Bonus', icon: icons.offers },
  { to: '/stats', label: 'Στατιστικά', icon: icons.stats }
]

const utilityItems = [
  { to: '/backup', label: 'Αντίγραφα Ασφαλείας', icon: icons.backup },
  { to: '/settings', label: 'Ρυθμίσεις', icon: icons.settings }
]

export function Layout() {
  const [version, setVersion] = useState('')

  useEffect(() => {
    void api()
      .getVersion()
      .then(setVersion)
      .catch(() => setVersion(''))
  }, [])

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <h1 className="brand-name">Angel Nails Club</h1>
          <p className="brand-sub">Angel Nails & More</p>
        </div>

        <nav className="nav" aria-label="Κύρια πλοήγηση">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-utils" role="navigation" aria-label="Εργαλεία">
            {utilityItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                title={item.label}
                aria-label={item.label}
                className={({ isActive }) => `nav-util${isActive ? ' active' : ''}`}
              >
                {item.icon}
              </NavLink>
            ))}
          </div>

          <div className="sidebar-credit" aria-label="Created by NexusDevStudio Greece">
            <div className="sidebar-credit-glow" aria-hidden="true" />
            <span className="sidebar-credit-kicker">Created by</span>
            <svg className="sidebar-credit-mark" viewBox="0 0 64 48" aria-hidden="true">
              <path
                d="M10 40 V10 L30 32 V10"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M34 10 H46 C54 10 58 16 58 24 C58 32 54 38 46 38 H34 V10 Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <strong className="sidebar-credit-name">NexusDevStudio</strong>
            <span className="sidebar-credit-place">Greece</span>
            <span className="sidebar-credit-rule" aria-hidden="true" />
            <span className="sidebar-credit-version">Έκδοση {version || '—'}</span>
          </div>
        </div>
      </aside>

      <div className="main">
        <div className="main-glow" aria-hidden="true" />
        <Outlet />
      </div>
    </div>
  )
}
