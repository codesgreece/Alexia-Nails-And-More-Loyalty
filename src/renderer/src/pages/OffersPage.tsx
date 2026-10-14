import { FormEvent, useEffect, useMemo, useState } from 'react'
import type { AppSettings, BirthdayBonusAward, Customer } from '@shared/types'
import { formatDate } from '@shared/points'
import { api } from '../lib/api'

const PAGE_SIZE = 5

export function OffersPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [today, setToday] = useState<Customer[]>([])
  const [upcoming, setUpcoming] = useState<Array<Customer & { nextBirthday: string }>>([])
  const [history, setHistory] = useState<Array<BirthdayBonusAward & { customerName: string }>>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [historyPage, setHistoryPage] = useState(1)

  async function load() {
    const s = await api().settings.get()
    if (s && 'registrationBonusEnabled' in s) setSettings(s as AppSettings)
    const t = await api().birthday.today()
    if (Array.isArray(t)) setToday(t)
    const u = await api().birthday.upcoming(30)
    if (Array.isArray(u)) setUpcoming(u)
    const h = await api().birthday.history()
    if (Array.isArray(h)) {
      setHistory(h)
      setHistoryPage(1)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!settings) return
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      if (
        settings.referralRewardEnabled &&
        (!Number.isInteger(settings.referralRewardPoints) || settings.referralRewardPoints <= 0)
      ) {
        setError('Ορίστε έγκυρο ποσό πόντων παραπομπής πριν την ενεργοποίηση')
        return
      }
      const updated = await api().settings.update({
        registrationBonusEnabled: settings.registrationBonusEnabled,
        registrationBonusPoints: settings.registrationBonusPoints,
        birthdayBonusEnabled: settings.birthdayBonusEnabled,
        birthdayBonusPoints: settings.birthdayBonusPoints,
        referralRewardEnabled: settings.referralRewardEnabled,
        referralRewardPoints: settings.referralRewardPoints
      })
      if (updated && 'registrationBonusEnabled' in updated) {
        setSettings(updated as AppSettings)
        setSuccess('Οι ρυθμίσεις αποθηκεύτηκαν')
      }
    } finally {
      setBusy(false)
    }
  }

  async function processBirthdays() {
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      const result = await api().birthday.process()
      if (!result.success) {
        setError(result.error || 'Αποτυχία')
        return
      }
      setSuccess(`Δόθηκαν ${result.data?.awarded ?? 0} μπόνους γενεθλίων`)
      await load()
    } finally {
      setBusy(false)
    }
  }

  const historyPages = Math.max(1, Math.ceil(history.length / PAGE_SIZE))
  const historyItems = useMemo(() => {
    const start = (historyPage - 1) * PAGE_SIZE
    return history.slice(start, start + PAGE_SIZE)
  }, [history, historyPage])

  const referralShare = settings
    ? {
        referrer: settings.referralRewardPoints - Math.floor((settings.referralRewardPoints * 20) / 100),
        referred: Math.floor((settings.referralRewardPoints * 20) / 100)
      }
    : { referrer: 0, referred: 0 }

  if (!settings) {
    return (
      <>
        <div className="topbar">
          <div>
            <p className="dash-kicker">Πρόγραμμα</p>
            <h2 className="page-title">Προσφορές & Bonus</h2>
          </div>
        </div>
        <div className="content">
          <p className="muted">Φόρτωση...</p>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="topbar">
        <div>
          <p className="dash-kicker">Πρόγραμμα</p>
          <h2 className="page-title">Προσφορές & Bonus</h2>
          <p className="page-subtitle">Μπόνους εγγραφής, γενεθλίων και παραπομπών</p>
        </div>
      </div>

      <div className="content offers-page">
        {error ? <div className="alert alert-error">{error}</div> : null}
        {success ? <div className="alert alert-success">{success}</div> : null}

        <section className="ref-stats">
          <article className="dash-metric">
            <p className="stat-label">Εγγραφή</p>
            <p className="stat-value">
              {settings.registrationBonusEnabled ? settings.registrationBonusPoints : '—'}
            </p>
          </article>
          <article className="dash-metric">
            <p className="stat-label">Γενέθλια</p>
            <p className="stat-value">
              {settings.birthdayBonusEnabled ? settings.birthdayBonusPoints : '—'}
            </p>
          </article>
          <article className="dash-metric">
            <p className="stat-label">Παραπομπή</p>
            <p className="stat-value">
              {settings.referralRewardEnabled ? settings.referralRewardPoints : '—'}
            </p>
          </article>
          <article className="dash-metric">
            <p className="stat-label">Σήμερα</p>
            <p className="stat-value">{today.length}</p>
          </article>
        </section>

        <div className="offers-layout">
          <section className="pts-form-panel">
            <div className="reg-form-head">
              <div>
                <p className="dash-kicker">Ρυθμίσεις</p>
                <h3>Πρόγραμμα πόντων</h3>
              </div>
              <span className="reg-form-chip">Bonus</span>
            </div>

            <form className="reg-form offers-form" onSubmit={save}>
              <div className="offers-toggle-row">
                <label className="offers-toggle">
                  <input
                    type="checkbox"
                    checked={settings.registrationBonusEnabled}
                    onChange={(e) =>
                      setSettings({ ...settings, registrationBonusEnabled: e.target.checked })
                    }
                  />
                  <span>
                    <strong>Μπόνους εγγραφής</strong>
                    <em>Πόντοι κατά την πρώτη εγγραφή</em>
                  </span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={settings.registrationBonusPoints}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      registrationBonusPoints: Number(e.target.value)
                    })
                  }
                />
              </div>

              <div className="offers-toggle-row">
                <label className="offers-toggle">
                  <input
                    type="checkbox"
                    checked={settings.birthdayBonusEnabled}
                    onChange={(e) =>
                      setSettings({ ...settings, birthdayBonusEnabled: e.target.checked })
                    }
                  />
                  <span>
                    <strong>Μπόνους γενεθλίων</strong>
                    <em>Ετήσια ανταμοιβή γενεθλίων</em>
                  </span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={settings.birthdayBonusPoints}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      birthdayBonusPoints: Number(e.target.value)
                    })
                  }
                />
              </div>

              <div className="offers-toggle-row">
                <label className="offers-toggle">
                  <input
                    type="checkbox"
                    checked={settings.referralRewardEnabled}
                    onChange={(e) =>
                      setSettings({ ...settings, referralRewardEnabled: e.target.checked })
                    }
                  />
                  <span>
                    <strong>Ανταμοιβή παραπομπής</strong>
                    <em>80% / 20% στην πρώτη αγορά</em>
                  </span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={settings.referralRewardPoints}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      referralRewardPoints: Number(e.target.value)
                    })
                  }
                />
              </div>

              <p className="offers-hint">
                Κατανομή: {referralShare.referrer} παραπέμπουσα / {referralShare.referred} νέα.
                Δίνονται στην πρώτη αγορά, όχι στην εγγραφή.
              </p>
              {!settings.referralRewardEnabled || settings.referralRewardPoints <= 0 ? (
                <p className="field-error">
                  Χωρίς ενεργή ανταμοιβή και θετικό ποσό, οι κωδικοί παραπομπής δεν δίνουν πόντους.
                </p>
              ) : null}

              <button type="submit" className="btn btn-primary reg-submit" disabled={busy}>
                {busy ? 'Αποθήκευση...' : 'Αποθήκευση ρυθμίσεων'}
              </button>
            </form>
          </section>

          <aside className="ref-aside">
            <div className="reg-aside-glow" aria-hidden="true" />
            <p className="reg-aside-script">Angel Nails</p>
            <h3>Έξυπνα μπόνους</h3>
            <p className="pts-aside-lead">
              Ενεργοποιήστε μόνο όσα ταιριάζουν στο πρόγραμμα του σαλονιού σας.
            </p>
            <ul className="reg-benefits">
              <li>
                <span className="reg-benefit-label">Εγγραφή</span>
                <strong>
                  {settings.registrationBonusEnabled
                    ? `${settings.registrationBonusPoints} π.`
                    : 'Ανενεργό'}
                </strong>
              </li>
              <li>
                <span className="reg-benefit-label">Γενέθλια</span>
                <strong>
                  {settings.birthdayBonusEnabled
                    ? `${settings.birthdayBonusPoints} π.`
                    : 'Ανενεργό'}
                </strong>
              </li>
              <li>
                <span className="reg-benefit-label">Παραπομπή</span>
                <strong>
                  {settings.referralRewardEnabled
                    ? `${settings.referralRewardPoints} π.`
                    : 'Ανενεργό'}
                </strong>
              </li>
            </ul>
          </aside>
        </div>

        <section className="offers-birthdays">
          <div className="dash-panel-head">
            <div>
              <p className="dash-kicker">Ημερολόγιο</p>
              <h3>Γενέθλια</h3>
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={busy}
              onClick={() => void processBirthdays()}
            >
              Επεξεργασία επιλέξιμων
            </button>
          </div>

          <div className="offers-bday-grid">
            <div className="offers-bday-col">
              <p className="offers-bday-label">Σήμερα</p>
              {today.length === 0 ? (
                <p className="muted">Καμία πελάτισσα σήμερα.</p>
              ) : (
                <ul className="offers-bday-list">
                  {today.map((c) => (
                    <li key={c.id}>
                      <strong>{c.fullName}</strong>
                      <span className="badge badge-green">Σήμερα</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="offers-bday-col">
              <p className="offers-bday-label">Επόμενες 30 ημέρες</p>
              {upcoming.length === 0 ? (
                <p className="muted">Καμία επερχόμενη.</p>
              ) : (
                <ul className="offers-bday-list">
                  {upcoming.map((c) => (
                    <li key={c.id}>
                      <strong>{c.fullName}</strong>
                      <span className="cust-code">{formatDate(c.nextBirthday)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        <section className="pts-history">
          <div className="dash-panel-head">
            <div>
              <p className="dash-kicker">Ιστορικό</p>
              <h3>Μπόνους γενεθλίων</h3>
            </div>
            <span className="cust-page-meta">{history.length} εγγραφές</span>
          </div>

          {historyItems.length === 0 ? (
            <p className="muted">Δεν υπάρχουν μπόνους γενεθλίων ακόμη.</p>
          ) : (
            <>
              <ul className="dash-list">
                {historyItems.map((h) => (
                  <li key={h.id}>
                    <div className="dash-list-row">
                      <div className="dash-list-copy">
                        <strong>{h.customerName}</strong>
                        <span>
                          {formatDate(h.awardedAt)} · Έτος {h.calendarYear}
                        </span>
                      </div>
                      <span className="dash-points">+{h.pointsAwarded}</span>
                    </div>
                  </li>
                ))}
              </ul>
              {historyPages > 1 ? (
                <div className="dash-pager">
                  {Array.from({ length: historyPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={`dash-page-btn${p === historyPage ? ' active' : ''}`}
                      onClick={() => setHistoryPage(p)}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              ) : null}
            </>
          )}
        </section>
      </div>
    </>
  )
}
