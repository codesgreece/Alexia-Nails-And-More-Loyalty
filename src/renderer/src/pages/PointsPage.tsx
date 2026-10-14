import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatDateTime } from '@shared/points'
import type { CustomerListItem, PointsTransaction } from '@shared/types'
import { CustomerSearchSelect } from '../components/CustomerSearchSelect'
import { api, generateClientIdempotencyKey } from '../lib/api'

const PAGE_SIZE = 5

export function PointsPage() {
  const [transactions, setTransactions] = useState<
    Array<PointsTransaction & { customerName?: string }>
  >([])
  const [txPage, setTxPage] = useState(1)
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerListItem | null>(null)
  const [amount, setAmount] = useState('')
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function loadTransactions() {
    const txs = await api().points.list()
    if (Array.isArray(txs)) {
      setTransactions(txs)
      setTxPage(1)
    }
  }

  useEffect(() => {
    void loadTransactions()
  }, [])

  const previewPoints = useMemo(() => {
    const euros = Number(amount)
    if (!Number.isFinite(euros) || euros <= 0) return 0
    return Math.floor(euros)
  }, [amount])

  const previewBalance = selectedCustomer
    ? selectedCustomer.pointsBalance + previewPoints
    : null

  const totalPages = Math.max(1, Math.ceil(transactions.length / PAGE_SIZE))
  const pageItems = useMemo(() => {
    const start = (txPage - 1) * PAGE_SIZE
    return transactions.slice(start, start + PAGE_SIZE)
  }, [transactions, txPage])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!selectedCustomer) {
      setError('Επιλέξτε πελάτισσα με αναζήτηση ονόματος ή τηλεφώνου')
      return
    }

    setBusy(true)
    setError('')
    setSuccess('')
    try {
      const result = await api().purchases.record({
        customerId: selectedCustomer.id,
        amountEuros: Number(amount),
        purchaseDate,
        description: description || undefined,
        idempotencyKey: generateClientIdempotencyKey()
      })
      if (!result.success || !result.data) {
        setError(result.error || 'Αποτυχία')
        return
      }

      let msg = `Καταχωρήθηκαν +${result.data.pointsEarned} πόντοι για ${selectedCustomer.fullName}. Υπόλοιπο: ${result.data.balance}`
      if (result.data.referralRewarded) {
        msg += ' · Δόθηκε και ανταμοιβή παραπομπής.'
      }
      setSuccess(msg)
      setAmount('')
      setDescription('')
      setSelectedCustomer({
        ...selectedCustomer,
        pointsBalance: result.data.balance
      })
      await loadTransactions()
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="topbar pts-topbar">
        <div>
          <p className="dash-kicker">Πιστότητα</p>
          <h2 className="page-title">Πόντοι & Συναλλαγές</h2>
          <p className="page-subtitle">Καταγραφή αγορών και ιστορικό πόντων</p>
        </div>
      </div>

      <div className="content pts-page">
        {error ? <div className="alert alert-error">{error}</div> : null}
        {success ? <div className="alert alert-success">{success}</div> : null}

        <div className="pts-layout">
          <section className="pts-form-panel">
            <div className="reg-form-head">
              <div>
                <p className="dash-kicker">Νέα κίνηση</p>
                <h3>Καταγραφή αγοράς</h3>
              </div>
              <span className="reg-form-chip">€1 = 1 πόντος</span>
            </div>

            <form className="reg-form" onSubmit={onSubmit}>
              <div className="form-row">
                <label>Πελάτισσα *</label>
                <CustomerSearchSelect
                  value={selectedCustomer}
                  onChange={setSelectedCustomer}
                  required
                  placeholder="Πληκτρολογήστε όνομα ή τηλέφωνο..."
                />
              </div>

              <div className="reg-form-grid">
                <div className="form-row">
                  <label>Ποσό (€) *</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    placeholder="0.00"
                  />
                </div>
                <div className="form-row">
                  <label>Ημ/νία *</label>
                  <input
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <label>Περιγραφή</label>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="π.χ. Μανικιούρ / Pedicure"
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary reg-submit"
                disabled={busy || !selectedCustomer}
              >
                {busy ? 'Αποθήκευση...' : 'Καταχώρηση αγοράς'}
              </button>
            </form>
          </section>

          <aside className="pts-aside">
            <div className="reg-aside-glow" aria-hidden="true" />
            <p className="reg-aside-script">Angel Nails</p>
            <h3>Προεπισκόπηση πόντων</h3>

            {selectedCustomer ? (
              <div className="pts-selected">
                <div className="dash-avatar" aria-hidden="true">
                  {selectedCustomer.fullName.trim().charAt(0).toUpperCase()}
                </div>
                <div>
                  <strong>{selectedCustomer.fullName}</strong>
                  <span>Τρέχον υπόλοιπο: {selectedCustomer.pointsBalance}</span>
                </div>
              </div>
            ) : (
              <p className="pts-aside-lead">
                Επιλέξτε πελάτισσα και ποσό για να δείτε τους πόντους που θα δοθούν.
              </p>
            )}

            <div className="pts-preview">
              <div>
                <span>Πόντοι αγοράς</span>
                <strong>+{previewPoints}</strong>
              </div>
              <div>
                <span>Νέο υπόλοιπο</span>
                <strong>{previewBalance ?? '—'}</strong>
              </div>
            </div>

            <ul className="reg-benefits">
              <li>
                <span className="reg-benefit-label">Κανόνας</span>
                <strong>€1 → 1</strong>
              </li>
              <li>
                <span className="reg-benefit-label">Κλάσματα</span>
                <strong>προς τα κάτω</strong>
              </li>
              <li>
                <span className="reg-benefit-label">Παραπομπή</span>
                <strong>στην 1η αγορά</strong>
              </li>
            </ul>
          </aside>
        </div>

        <section className="pts-history">
          <div className="dash-panel-head">
            <div>
              <p className="dash-kicker">Κίνηση</p>
              <h3>Πρόσφατες συναλλαγές</h3>
            </div>
            <span className="cust-page-meta">
              {transactions.length} εγγραφές
            </span>
          </div>

          {pageItems.length === 0 ? (
            <p className="muted">Δεν υπάρχουν ακόμη συναλλαγές.</p>
          ) : (
            <>
              <ul className="dash-list">
                {pageItems.map((t) => (
                  <li key={t.id}>
                    <div className="dash-list-row">
                      <div className="dash-list-copy">
                        <strong>
                          <Link to={`/customers/${t.customerId}`}>
                            {t.customerName || t.customerId}
                          </Link>
                        </strong>
                        <span>
                          {formatDateTime(t.createdAt)}
                          {t.description ? ` · ${t.description}` : ''}
                        </span>
                      </div>
                      <div className="pts-tx-side">
                        <span className={`dash-points ${t.points >= 0 ? 'is-plus' : 'is-minus'}`}>
                          {t.points > 0 ? '+' : ''}
                          {t.points}
                        </span>
                        <span className="pts-balance">Υπόλ. {t.balanceAfter}</span>
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
                      className={`dash-page-btn${p === txPage ? ' active' : ''}`}
                      onClick={() => setTxPage(p)}
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
