import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatDate, formatDateTime, formatEuros } from '@shared/points'
import type { CustomerListItem, DashboardStats, PointsTransaction } from '@shared/types'
import { api } from '../lib/api'

const PAGE_SIZE = 4

function defaultFrom(): string {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d.toISOString().slice(0, 10)
}

function Pager({
  page,
  totalPages,
  onChange
}: {
  page: number
  totalPages: number
  onChange: (page: number) => void
}) {
  if (totalPages <= 1) return null

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)

  return (
    <div className="dash-pager" role="navigation" aria-label="Σελιδοποίηση">
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          className={`dash-page-btn${p === page ? ' active' : ''}`}
          onClick={() => onChange(p)}
          aria-current={p === page ? 'page' : undefined}
        >
          {p}
        </button>
      ))}
    </div>
  )
}

export function DashboardPage() {
  const [from, setFrom] = useState(defaultFrom)
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10))
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const [customersPage, setCustomersPage] = useState(1)
  const [customers, setCustomers] = useState<CustomerListItem[]>([])
  const [customersTotal, setCustomersTotal] = useState(0)

  const [txPage, setTxPage] = useState(1)
  const [allTransactions, setAllTransactions] = useState<
    Array<PointsTransaction & { customerName?: string }>
  >([])

  async function loadCustomers(page: number) {
    const list = await api().customers.list({
      page,
      pageSize: PAGE_SIZE,
      sortBy: 'createdAt',
      sortDir: 'desc',
      status: 'active'
    })
    if (list && 'items' in list) {
      setCustomers(list.items)
      setCustomersTotal(list.total)
      setCustomersPage(list.page)
    }
  }

  async function loadTransactions() {
    const txs = await api().points.list()
    if (Array.isArray(txs)) {
      setAllTransactions(txs)
      setTxPage(1)
    }
  }

  async function load() {
    setLoading(true)
    setError('')
    try {
      const result = await api().dashboard.stats({ from, to })
      if (result && typeof result === 'object' && 'success' in result && result.success === false) {
        setError((result as { error?: string }).error || 'Σφάλμα φόρτωσης')
        return
      }
      setStats(result as DashboardStats)
      await Promise.all([loadCustomers(1), loadTransactions()])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Σφάλμα φόρτωσης')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const customersTotalPages = Math.max(1, Math.ceil(customersTotal / PAGE_SIZE))

  const txTotalPages = Math.max(1, Math.ceil(allTransactions.length / PAGE_SIZE))
  const pageTransactions = useMemo(() => {
    const start = (txPage - 1) * PAGE_SIZE
    return allTransactions.slice(start, start + PAGE_SIZE)
  }, [allTransactions, txPage])

  return (
    <>
      <div className="topbar dash-topbar">
        <div>
          <p className="dash-kicker">Angel Nails Club</p>
          <h2 className="page-title">Επισκόπηση</h2>
          <p className="page-subtitle">Ζωντανή εικόνα πιστότητας του σαλονιού</p>
        </div>
        <div className="dash-period">
          <label>
            <span>Από</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label>
            <span>Έως</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          <button type="button" className="btn btn-primary" onClick={() => void load()}>
            Ανανέωση
          </button>
        </div>
      </div>

      <div className="content dash-page">
        {error ? <div className="alert alert-error">{error}</div> : null}
        {loading && !stats ? <div className="muted">Φόρτωση...</div> : null}

        {stats && stats.totalCustomers === 0 ? (
          <div className="dash-empty">
            <p className="dash-kicker">Καλώς ήρθατε</p>
            <h3>Ξεκινήστε το Angel Nails Club</h3>
            <p>Δεν υπάρχουν ακόμη πελάτισσες. Καταχωρήστε την πρώτη για να ζωντανέψει η επισκόπηση.</p>
            <Link className="btn btn-primary" to="/register">
              Νέα Εγγραφή
            </Link>
          </div>
        ) : null}

        {stats && stats.totalCustomers > 0 ? (
          <>
            <section className="dash-hero">
              <div className="dash-hero-main">
                <p className="dash-hero-label">Συνολικές αγορές</p>
                <p className="dash-hero-value">{formatEuros(stats.totalSpendingCents)}</p>
                <p className="dash-hero-note">
                  {stats.totalPurchases} συναλλαγές · {stats.totalCustomers} πελάτισσες
                </p>
              </div>
              <div className="dash-hero-side">
                <div className="dash-hero-metric">
                  <span>Ανεξόφλητοι πόντοι</span>
                  <strong>{stats.totalPointsOutstanding}</strong>
                </div>
                <div className="dash-hero-metric">
                  <span>Νέες εγγραφές περιόδου</span>
                  <strong>{stats.newCustomersInPeriod}</strong>
                </div>
                <div className="dash-hero-metric">
                  <span>Επιτυχημένες παραπομπές</span>
                  <strong>{stats.successfulReferrals}</strong>
                </div>
              </div>
            </section>

            <section className="dash-metrics">
              {[
                { label: 'Πελάτισσες', value: String(stats.totalCustomers) },
                { label: 'Πόντοι που δόθηκαν', value: String(stats.pointsAwardedInPeriod) },
                { label: 'Πόντοι εξαργύρωσης', value: String(stats.pointsRedeemedInPeriod) },
                { label: 'Παραπομπές', value: String(stats.referralRegistrations) }
              ].map((item, index) => (
                <article
                  key={item.label}
                  className="dash-metric"
                  style={{ animationDelay: `${0.05 * index}s` }}
                >
                  <p className="stat-label">{item.label}</p>
                  <p className="stat-value">{item.value}</p>
                </article>
              ))}
            </section>

            <section className="dash-panels">
              <article className="dash-panel">
                <div className="dash-panel-head">
                  <div>
                    <p className="dash-kicker">Μητρώο</p>
                    <h3>Πρόσφατες εγγραφές</h3>
                  </div>
                  <Link to="/customers" className="dash-link">
                    Όλες
                  </Link>
                </div>
                {customers.length === 0 ? (
                  <p className="muted">Δεν υπάρχουν εγγραφές.</p>
                ) : (
                  <>
                    <ul className="dash-list">
                      {customers.map((c) => (
                        <li key={c.id}>
                          <Link to={`/customers/${c.id}`} className="dash-list-row">
                            <div className="dash-avatar" aria-hidden="true">
                              {c.fullName.trim().charAt(0).toUpperCase()}
                            </div>
                            <div className="dash-list-copy">
                              <strong>{c.fullName}</strong>
                              <span>{formatDate(c.createdAt)}</span>
                            </div>
                            <span className="points-pill">{c.pointsBalance}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                    <Pager
                      page={customersPage}
                      totalPages={customersTotalPages}
                      onChange={(page) => void loadCustomers(page)}
                    />
                  </>
                )}
              </article>

              <article className="dash-panel">
                <div className="dash-panel-head">
                  <div>
                    <p className="dash-kicker">Κίνηση</p>
                    <h3>Πρόσφατοι πόντοι</h3>
                  </div>
                  <Link to="/points" className="dash-link">
                    Συναλλαγές
                  </Link>
                </div>
                {pageTransactions.length === 0 ? (
                  <p className="muted">Δεν υπάρχουν συναλλαγές.</p>
                ) : (
                  <>
                    <ul className="dash-list">
                      {pageTransactions.map((t) => (
                        <li key={t.id}>
                          <div className="dash-list-row">
                            <div className="dash-list-copy">
                              <strong>{t.customerName}</strong>
                              <span>{formatDateTime(t.createdAt)}</span>
                            </div>
                            <span
                              className={`dash-points ${t.points >= 0 ? 'is-plus' : 'is-minus'}`}
                            >
                              {t.points > 0 ? '+' : ''}
                              {t.points}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                    <Pager page={txPage} totalPages={txTotalPages} onChange={setTxPage} />
                  </>
                )}
              </article>
            </section>
          </>
        ) : null}
      </div>
    </>
  )
}
