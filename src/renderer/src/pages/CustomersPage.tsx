import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { formatDate } from '@shared/points'
import type { CustomerListItem } from '@shared/types'
import { api } from '../lib/api'

const PAGE_SIZE = 8

export function CustomersPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<CustomerListItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load(nextPage = page, nextQuery = query) {
    setLoading(true)
    setError('')
    try {
      const result = await api().customers.list({
        query: nextQuery,
        page: nextPage,
        pageSize: PAGE_SIZE,
        sortBy: 'createdAt',
        sortDir: 'desc',
        status: 'active'
      })
      if (result && 'success' in result && result.success === false) {
        setError((result as { error?: string }).error || 'Σφάλμα')
        return
      }
      const data = result as { items: CustomerListItem[]; total: number; page: number }
      setItems(data.items)
      setTotal(data.total)
      setPage(data.page)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Σφάλμα φόρτωσης')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load(1, '')
  }, [])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)

  return (
    <>
      <div className="topbar cust-topbar">
        <div>
          <p className="dash-kicker">Μητρώο</p>
          <h2 className="page-title">Πελάτισσες</h2>
          <p className="page-subtitle">Αναζήτηση και διαχείριση του προγράμματος πιστότητας</p>
        </div>
        <Link className="btn btn-primary" to="/register">
          Νέα Εγγραφή
        </Link>
      </div>

      <div className="content cust-page">
        <div className="cust-search">
          <div className="cust-search-field">
            <span className="cust-search-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Αναζήτηση ονόματος, τηλεφώνου, ID ή κωδικού..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') void load(1, query)
              }}
            />
          </div>
          <button type="button" className="btn btn-primary" onClick={() => void load(1, query)}>
            Αναζήτηση
          </button>
        </div>

        {error ? <div className="alert alert-error">{error}</div> : null}

        <section className="cust-panel">
          <div className="cust-panel-head">
            <div>
              <p className="dash-kicker">Κατάλογος</p>
              <h3>
                {loading ? 'Φόρτωση...' : `${total} πελάτισσες`}
              </h3>
            </div>
            <span className="cust-page-meta">
              Σελίδα {page} / {totalPages}
            </span>
          </div>

          {!loading && items.length === 0 ? (
            <div className="cust-empty">
              <h3>Δεν βρέθηκαν πελάτισσες</h3>
              <p>Δοκιμάστε άλλη αναζήτηση ή καταχωρήστε νέα πελάτισσα.</p>
              <Link className="btn btn-primary" to="/register">
                Νέα Εγγραφή
              </Link>
            </div>
          ) : null}

          {items.length > 0 ? (
            <>
              <ul className="cust-list">
                {items.map((c, index) => (
                  <li key={c.id} style={{ animationDelay: `${0.03 * index}s` }}>
                    <button
                      type="button"
                      className="cust-row"
                      onClick={() => navigate(`/customers/${c.id}`)}
                    >
                      <div className="dash-avatar" aria-hidden="true">
                        {c.fullName.trim().charAt(0).toUpperCase()}
                      </div>

                      <div className="cust-row-main">
                        <div className="cust-row-title">
                          <strong>{c.fullName}</strong>
                          <span className="cust-id">{c.id}</span>
                        </div>
                        <div className="cust-row-meta">
                          <span>{c.phoneDisplay}</span>
                          <span>Γέννηση {formatDate(c.dateOfBirth)}</span>
                          <span>Εγγραφή {formatDate(c.createdAt)}</span>
                        </div>
                      </div>

                      <div className="cust-row-side">
                        <span className="points-pill">{c.pointsBalance} πόντοι</span>
                        <span className="cust-code">{c.referralCode}</span>
                        <span className="cust-refs">
                          {c.successfulReferrals} παραπομπές
                        </span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>

              {totalPages > 1 ? (
                <div className="dash-pager">
                  <button
                    type="button"
                    className="dash-page-btn"
                    disabled={page <= 1}
                    onClick={() => void load(page - 1, query)}
                  >
                    ‹
                  </button>
                  {pages.map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={`dash-page-btn${p === page ? ' active' : ''}`}
                      onClick={() => void load(p, query)}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="dash-page-btn"
                    disabled={page >= totalPages}
                    onClick={() => void load(page + 1, query)}
                  >
                    ›
                  </button>
                </div>
              ) : null}
            </>
          ) : null}
        </section>
      </div>
    </>
  )
}
