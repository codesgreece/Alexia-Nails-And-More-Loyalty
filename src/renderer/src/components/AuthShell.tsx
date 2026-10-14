import { ReactNode } from 'react'
import authBg from '../assets/auth-bg.jpg'

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="auth-screen" style={{ backgroundImage: `url(${authBg})` }}>
      <div className="auth-veil" aria-hidden="true" />
      <div className="auth-layout">
        <aside className="auth-brand">
          <div className="auth-crown" aria-hidden="true">
            <svg viewBox="0 0 120 88" className="auth-crown-svg">
              <path
                d="M10 72 L20 28 L40 52 L60 12 L80 52 L100 28 L110 72 Z"
                fill="url(#crownGrad)"
                stroke="#c9a06a"
                strokeWidth="2"
              />
              <circle cx="20" cy="28" r="5" fill="#f4d7a0" />
              <circle cx="60" cy="12" r="6" fill="#f7e2b5" />
              <circle cx="100" cy="28" r="5" fill="#f4d7a0" />
              <path
                d="M52 48 C52 40, 68 40, 68 48 C68 58, 60 64, 60 64 C60 64, 52 58, 52 48 Z"
                fill="#ff6b9d"
              />
              <defs>
                <linearGradient id="crownGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#f8e7c4" />
                  <stop offset="55%" stopColor="#d4a574" />
                  <stop offset="100%" stopColor="#b8864e" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h1 className="auth-brand-title">Angel Nails Club</h1>
          <p className="auth-brand-line">
            <span />
            NAILS & MORE
            <span />
          </p>
          <span className="auth-brand-heart" aria-hidden="true">
            ♥
          </span>
        </aside>

        <section className="auth-card">{children}</section>
      </div>
    </div>
  )
}
