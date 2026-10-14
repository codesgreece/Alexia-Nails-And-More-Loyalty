import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatDateTime } from '@shared/points'
import type { AppSettings, ReferralListItem } from '@shared/types'
import { api } from '../lib/api'

const PAGE_SIZE = 5

const statusLabel: Record<string, string> = {
  pending: 'Σε αναμονή',
  qualified: 'Επιλέξιμη',
  rewarded: 'Ανταμειφθείσα'
}

export function ReferralsPage() {
  const [items, setItems] = useState<ReferralListItem[]>([])
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    void (async () => {
      try {
        const [result, s] = await Promise.all([api().referrals.list(), api().settings.get()])
        if (Array.isArray(result)) setItems(result)
        if (s && 'referralRewardEnabled' in s) setSettings(s as AppSettings)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Σφάλμα')
      }
    })()
  }, [])

  const pending = items.filter((r) => r.status === 'pending').length
  const qualified = items.filter((r) => r.status === 'qualified').length
  const rewarded = items.filter((r) => r.status === 'rewarded').length

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE))
  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return items.slice(start, start + PAGE_SIZE)
  }, [items, page])

  const rewardReady =
    settings?.referralRewardEnabled && (settings.referralRewardPoints ?? 0) > 0
  const rewardPoints = settings?.referralRewardPoints ?? 0
  const referrerShare = rewardPoints - Math.floor((rewardPoints * 20) / 100)
  const referredShare = Math.floor((rewardPoints * 20) / 100)

  return (
    <>
      <div className="topbar">
        <div>
          <p className="dash-kicker">Πρόγραμμα</p>
          <h2 className="page-title">Σύστησε μια Φίλη</h2>
          <p className="page-subtitle">
            Παραπομπές και ανταμοιβές 80% / 20% στην πρώτη επιλέξιμη αγορά
          </p>
        </div>
      </div>

      <div className="content ref-page">
        {error ? <div className="alert alert-error">{error}</div> : null}

        <section className="ref-stats">
          <article className="dash-metric">
            <p className="stat-label">Σύνολο</p>
            <p className="stat-value">{items.length}</p>
          </article>
          <article className="dash-metric">
            <p className="stat-label">Σε αναμονή</p>
            <p className="stat-value">{pending}</p>
          </article>
          <article className="dash-metric">
            <p className="stat-label">Επιλέξιμες</p>
            <p className="stat-value">{qualified}</p>
          </article>
          <article className="dash-metric">
            <p className="stat-label">Ανταμειφθείσες</p>
            <p className="stat-value">{rewarded}</p>
          </article>
        </section>

        <div className="ref-layout">
          <section className="ref-list-panel">
            <div className="dash-panel-head">
              <div>
                <p className="dash-kicker">Μητρώο</p>
                <h3>Παραπομπές</h3>
              </div>
              <Link to="/register" className="dash-link">
                Νέα εγγραφή
              </Link>
            </div>

            {items.length === 0 ? (
              <div className="cust-empty">
                <h3>Δεν υπάρχουν παραπομπές</h3>
                <p>Κατά την εγγραφή εισάγετε τον κωδικό παραπομπής υπάρχουσας πελάτισσας.</p>
              </div>
            ) : (
              <>
                <ul className="ref-list">
                  {pageItems.map((r) => (
                    <li key={r.id}>
                      <div className="ref-row">
                        <div className="ref-row-main">
                          <div className="ref-pair">
                            <Link to={`/customers/${r.referrerCustomerId}`}>{r.referrerName}</Link>
                            <span className="ref-arrow" aria-hidden="true">
                              →
                            </span>
                            <Link to={`/customers/${r.referredCustomerId}`}>{r.referredName}</Link>
                          </div>
                          <div className="ref-meta">
                            <span>{formatDateTime(r.createdAt)}</span>
                            <span className="cust-code">{r.referrerCode}</span>
                          </div>
                        </div>
                        <div className="ref-row-side">
                          <span
                            className={`badge ${
                              r.status === 'rewarded'
                                ? 'badge-green'
                                : r.status === 'qualified'
                                  ? 'badge-amber'
                                  : 'badge-muted'
                            }`}
                          >
                            {statusLabel[r.status] ?? r.status}
                          </span>
                          <strong className="ref-points">
                            {r.status === 'rewarded'
                              ? `${r.referrerPoints} / ${r.referredPoints}`
                              : '—'}
                          </strong>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>

                {totalPages > 1 ? (
                  <div className="dash-pager">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        type="button"
                        className={`dash-page-btn${p === page ? ' active' : ''}`}
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                ) : null}
              </>
            )}
          </section>

          <aside className="ref-aside">
            <div className="reg-aside-glow" aria-hidden="true" />
            <p className="reg-aside-script">Angel Nails</p>
            <h3>Πώς λειτουργεί</h3>
            <p className="pts-aside-lead">
              Η ανταμοιβή δίνεται στην πρώτη επιλέξιμη αγορά της νέας πελάτισσας — όχι στην
              εγγραφή.
            </p>

            <ol className="ref-steps">
              <li>Εγγραφή με κωδικό παραπομπής</li>
              <li>Κατάσταση: σε αναμονή</li>
              <li>Πρώτη αγορά → 80% / 20%</li>
            </ol>

            <div className="pts-preview">
              <div>
                <span>Παραπέμπουσα</span>
                <strong>{rewardReady ? referrerShare : '—'}</strong>
              </div>
              <div>
                <span>Νέα πελάτισσα</span>
                <strong>{rewardReady ? referredShare : '—'}</strong>
              </div>
            </div>

            {rewardReady ? (
              <div className="reg-split">
                <p className="dash-kicker">Κατανομή {rewardPoints} πόντων</p>
                <div className="reg-split-bar" aria-hidden="true">
                  <span style={{ flex: 8 }} />
                  <span style={{ flex: 2 }} />
                </div>
                <div className="reg-split-labels">
                  <span>80%</span>
                  <span>20%</span>
                </div>
              </div>
            ) : (
              <div className="reg-tip" style={{ color: 'rgba(255,255,255,0.92)', background: 'rgba(255,255,255,0.14)', borderColor: 'rgba(255,255,255,0.22)' }}>
                Ρυθμίστε ποσό ανταμοιβής στις{' '}
                <Link to="/offers" style={{ color: '#fff', textDecoration: 'underline' }}>
                  Προσφορές & Bonus
                </Link>
                .
              </div>
            )}
          </aside>
        </div>
      </div>
    </>
  )
}
