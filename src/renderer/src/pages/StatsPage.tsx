import { useEffect, useState } from 'react'
import { formatEuros } from '@shared/points'
import type { StatisticsReport } from '@shared/types'
import { api } from '../lib/api'

function defaultFrom(): string {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d.toISOString().slice(0, 10)
}

export function StatsPage() {
  const [from, setFrom] = useState(defaultFrom)
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10))
  const [report, setReport] = useState<StatisticsReport | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    setBusy(true)
    setError('')
    try {
      const result = await api().stats.report({ from, to })
      if (result && 'totalCustomers' in result) setReport(result as StatisticsReport)
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function exportCsv() {
    setMessage('')
    setError('')
    const result = await api().stats.exportCsv({ from, to })
    if (!result.success) {
      if (result.code !== 'CANCELLED') setError(result.error || 'Αποτυχία εξαγωγής')
      return
    }
    setMessage(`Εξήχθη: ${result.data?.path}`)
  }

  return (
    <>
      <div className="topbar">
        <div>
          <p className="dash-kicker">Αναφορές</p>
          <h2 className="page-title">Στατιστικά</h2>
          <p className="page-subtitle">Πραγματικά τοπικά δεδομένα περιόδου</p>
        </div>
      </div>

      <div className="content stats-page">
        {error ? <div className="alert alert-error">{error}</div> : null}
        {message ? <div className="alert alert-success">{message}</div> : null}

        <section className="stats-filters">
          <div className="reg-form-head">
            <div>
              <p className="dash-kicker">Περίοδος</p>
              <h3>Φίλτρο ημερομηνιών</h3>
            </div>
            <span className="reg-form-chip">CSV</span>
          </div>
          <div className="stats-filter-row">
            <div className="form-row">
              <label>Από</label>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="form-row">
              <label>Έως</label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div className="stats-filter-actions">
              <button
                type="button"
                className="btn btn-secondary"
                disabled={busy}
                onClick={() => void load()}
              >
                {busy ? 'Φόρτωση...' : 'Ανανέωση'}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy}
                onClick={() => void exportCsv()}
              >
                Εξαγωγή CSV
              </button>
            </div>
          </div>
        </section>

        {!report ? (
          <p className="muted">Φόρτωση...</p>
        ) : (
          <>
            <section className="ref-stats">
              <article className="dash-metric">
                <p className="stat-label">Πελάτισσες</p>
                <p className="stat-value">{report.totalCustomers}</p>
              </article>
              <article className="dash-metric">
                <p className="stat-label">Εγγραφές</p>
                <p className="stat-value">{report.registrationsInPeriod}</p>
              </article>
              <article className="dash-metric">
                <p className="stat-label">Αξία αγορών</p>
                <p className="stat-value">{formatEuros(report.totalPurchaseValueCents)}</p>
              </article>
              <article className="dash-metric">
                <p className="stat-label">Μέση αγορά</p>
                <p className="stat-value">{formatEuros(report.averagePurchaseValueCents)}</p>
              </article>
            </section>

            <section className="ref-stats">
              <article className="dash-metric">
                <p className="stat-label">Πόντοι δοθέντες</p>
                <p className="stat-value">{report.totalPointsAwarded}</p>
              </article>
              <article className="dash-metric">
                <p className="stat-label">Εξαργυρώσεις</p>
                <p className="stat-value">{report.totalPointsRedeemed}</p>
              </article>
              <article className="dash-metric">
                <p className="stat-label">Ανεξόφλητοι</p>
                <p className="stat-value">{report.outstandingPoints}</p>
              </article>
              <article className="dash-metric">
                <p className="stat-label">Παραπομπές</p>
                <p className="stat-value">{report.completedReferralRewards}</p>
              </article>
            </section>

            <div className="stats-layout">
              <section className="stats-panel">
                <div className="dash-panel-head">
                  <div>
                    <p className="dash-kicker">Κατάταξη</p>
                    <h3>Συχνότερες εξαργυρώσεις</h3>
                  </div>
                </div>
                <p className="stats-note">Οι πόντοι δεν είναι ευρώ και δεν εμφανίζονται ως έσοδα.</p>

                {report.topRedeemedRewards.length === 0 ? (
                  <p className="muted">Δεν υπάρχουν εξαργυρώσεις στην περίοδο.</p>
                ) : (
                  <ul className="stats-rank">
                    {report.topRedeemedRewards.map((r, i) => (
                      <li key={r.rewardId}>
                        <span className="stats-rank-num">{i + 1}</span>
                        <div className="stats-rank-copy">
                          <strong>{r.rewardName}</strong>
                          <span>{r.count} φορές</span>
                        </div>
                        <span className="points-pill">{r.count}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <aside className="ref-aside">
                <div className="reg-aside-glow" aria-hidden="true" />
                <p className="reg-aside-script">Angel Nails</p>
                <h3>Τοπική ανάλυση</h3>
                <p className="pts-aside-lead">
                  Όλα τα νούμερα προέρχονται από τη βάση του υπολογιστή σας — χωρίς cloud.
                </p>
                <ul className="reg-benefits">
                  <li>
                    <span className="reg-benefit-label">Περίοδος</span>
                    <strong>προσαρμόσιμη</strong>
                  </li>
                  <li>
                    <span className="reg-benefit-label">Εξαγωγή</span>
                    <strong>CSV</strong>
                  </li>
                  <li>
                    <span className="reg-benefit-label">Πόντοι</span>
                    <strong>≠ έσοδα</strong>
                  </li>
                </ul>
              </aside>
            </div>
          </>
        )}
      </div>
    </>
  )
}
