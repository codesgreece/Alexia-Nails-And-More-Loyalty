import { FormEvent, useEffect, useMemo, useState } from 'react'
import type { RedemptionListItem, Reward } from '@shared/types'
import { formatDateTime } from '@shared/points'
import { api } from '../lib/api'

const PAGE_SIZE = 5

export function RewardsPage() {
  const [rewards, setRewards] = useState<Reward[]>([])
  const [redemptions, setRedemptions] = useState<RedemptionListItem[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [pointsRequired, setPointsRequired] = useState('50')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [historyPage, setHistoryPage] = useState(1)

  async function load() {
    const list = await api().rewards.list(false)
    if (Array.isArray(list)) setRewards(list)
    const reds = await api().redemptions.list()
    if (Array.isArray(reds)) {
      setRedemptions(reds)
      setHistoryPage(1)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      const result = await api().rewards.create({
        name,
        description,
        pointsRequired: Number(pointsRequired),
        isActive: true
      })
      if (!result.success) {
        setError(result.error || 'Αποτυχία')
        return
      }
      setSuccess('Η ανταμοιβή δημιουργήθηκε')
      setName('')
      setDescription('')
      setPointsRequired('50')
      await load()
    } finally {
      setBusy(false)
    }
  }

  async function toggleActive(reward: Reward) {
    setBusy(true)
    try {
      await api().rewards.update({ id: reward.id, isActive: !reward.isActive })
      await load()
    } finally {
      setBusy(false)
    }
  }

  const activeCount = rewards.filter((r) => r.isActive).length
  const historyPages = Math.max(1, Math.ceil(redemptions.length / PAGE_SIZE))
  const historyItems = useMemo(() => {
    const start = (historyPage - 1) * PAGE_SIZE
    return redemptions.slice(start, start + PAGE_SIZE)
  }, [redemptions, historyPage])

  return (
    <>
      <div className="topbar">
        <div>
          <p className="dash-kicker">Κατάλογος</p>
          <h2 className="page-title">Ανταμοιβές</h2>
          <p className="page-subtitle">Διαχείριση ανταμοιβών και ιστορικό εξαργυρώσεων</p>
        </div>
      </div>

      <div className="content rwd-page">
        {error ? <div className="alert alert-error">{error}</div> : null}
        {success ? <div className="alert alert-success">{success}</div> : null}

        <section className="ref-stats">
          <article className="dash-metric">
            <p className="stat-label">Σύνολο</p>
            <p className="stat-value">{rewards.length}</p>
          </article>
          <article className="dash-metric">
            <p className="stat-label">Ενεργές</p>
            <p className="stat-value">{activeCount}</p>
          </article>
          <article className="dash-metric">
            <p className="stat-label">Ανενεργές</p>
            <p className="stat-value">{rewards.length - activeCount}</p>
          </article>
          <article className="dash-metric">
            <p className="stat-label">Εξαργυρώσεις</p>
            <p className="stat-value">{redemptions.length}</p>
          </article>
        </section>

        <div className="rwd-layout">
          <section className="pts-form-panel">
            <div className="reg-form-head">
              <div>
                <p className="dash-kicker">Δημιουργία</p>
                <h3>Νέα ανταμοιβή</h3>
              </div>
              <span className="reg-form-chip">Πόντοι</span>
            </div>

            <form className="reg-form" onSubmit={onCreate}>
              <div className="form-row">
                <label>Όνομα *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="π.χ. Μανικιούρ"
                />
              </div>
              <div className="form-row">
                <label>Περιγραφή</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Σύντομη περιγραφή υπηρεσίας ή έκπτωσης"
                />
              </div>
              <div className="form-row">
                <label>Απαιτούμενοι πόντοι *</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={pointsRequired}
                  onChange={(e) => setPointsRequired(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary reg-submit" disabled={busy}>
                {busy ? 'Αποθήκευση...' : 'Δημιουργία ανταμοιβής'}
              </button>
            </form>
          </section>

          <aside className="ref-aside">
            <div className="reg-aside-glow" aria-hidden="true" />
            <p className="reg-aside-script">Angel Nails</p>
            <h3>Κατάλογος αξίας</h3>
            <p className="pts-aside-lead">
              Οι ενεργές ανταμοιβές εμφανίζονται στο προφίλ πελάτισσας όταν επαρκούν οι πόντοι.
            </p>
            <ul className="reg-benefits">
              <li>
                <span className="reg-benefit-label">Εξαργύρωση</span>
                <strong>από προφίλ</strong>
              </li>
              <li>
                <span className="reg-benefit-label">Ανενεργή</span>
                <strong>κρυφή</strong>
              </li>
              <li>
                <span className="reg-benefit-label">Έλεγχος</span>
                <strong>ατομικός</strong>
              </li>
            </ul>
          </aside>
        </div>

        <section className="rwd-catalog">
          <div className="dash-panel-head">
            <div>
              <p className="dash-kicker">Διαθέσιμα</p>
              <h3>Κατάλογος ανταμοιβών</h3>
            </div>
          </div>

          {rewards.length === 0 ? (
            <p className="muted">Δεν υπάρχουν ανταμοιβές ακόμη.</p>
          ) : (
            <ul className="rwd-cards">
              {rewards.map((r) => (
                <li key={r.id} className="rwd-card">
                  <div>
                    <div className="rwd-card-top">
                      <strong>{r.name}</strong>
                      <span className={`badge ${r.isActive ? 'badge-green' : 'badge-muted'}`}>
                        {r.isActive ? 'Ενεργή' : 'Ανενεργή'}
                      </span>
                    </div>
                    {r.description ? <p className="muted">{r.description}</p> : null}
                    <span className="points-pill">{r.pointsRequired} πόντοι</span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={busy}
                    onClick={() => void toggleActive(r)}
                  >
                    {r.isActive ? 'Απενεργοποίηση' : 'Ενεργοποίηση'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="pts-history">
          <div className="dash-panel-head">
            <div>
              <p className="dash-kicker">Ιστορικό</p>
              <h3>Εξαργυρώσεις</h3>
            </div>
            <span className="cust-page-meta">{redemptions.length} εγγραφές</span>
          </div>

          {historyItems.length === 0 ? (
            <p className="muted">Δεν υπάρχουν εξαργυρώσεις ακόμη.</p>
          ) : (
            <>
              <ul className="dash-list">
                {historyItems.map((r) => (
                  <li key={r.id}>
                    <div className="dash-list-row">
                      <div className="dash-list-copy">
                        <strong>{r.customerName}</strong>
                        <span>
                          {formatDateTime(r.createdAt)} · {r.rewardName}
                        </span>
                      </div>
                      <span className="dash-points is-minus">−{r.pointsSpent}</span>
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
