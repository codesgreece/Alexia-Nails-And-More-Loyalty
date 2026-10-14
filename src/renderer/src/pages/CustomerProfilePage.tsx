import { FormEvent, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { formatDate, formatDateTime, formatEuros } from '@shared/points'
import type { CustomerProfile } from '@shared/types'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { PageHeader } from '../components/PageHeader'
import { api, generateClientIdempotencyKey } from '../lib/api'

export function CustomerProfilePage() {
  const { id } = useParams()
  const [profile, setProfile] = useState<CustomerProfile | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editing, setEditing] = useState(false)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [dob, setDob] = useState('')
  const [busy, setBusy] = useState(false)

  const [amount, setAmount] = useState('')
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [description, setDescription] = useState('')
  const [selectedReward, setSelectedReward] = useState('')
  const [confirmRedeem, setConfirmRedeem] = useState(false)

  async function load() {
    if (!id) return
    setError('')
    try {
      const result = await api().customers.profile(id)
      if (!result.success || !result.data) {
        setError(result.error || 'Δεν βρέθηκε')
        setProfile(null)
        return
      }
      setProfile(result.data)
      setFullName(result.data.customer.fullName)
      setPhone(result.data.customer.phoneDisplay)
      setDob(result.data.customer.dateOfBirth)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Σφάλμα')
    }
  }

  useEffect(() => {
    void load()
  }, [id])

  async function saveEdit(e: FormEvent) {
    e.preventDefault()
    if (!id) return
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      const result = await api().customers.update({ id, fullName, phone, dateOfBirth: dob })
      if (!result.success) {
        setError(result.error || 'Αποτυχία ενημέρωσης')
        return
      }
      setSuccess('Τα στοιχεία ενημερώθηκαν')
      setEditing(false)
      await load()
    } finally {
      setBusy(false)
    }
  }

  async function recordPurchase(e: FormEvent) {
    e.preventDefault()
    if (!id) return
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      const result = await api().purchases.record({
        customerId: id,
        amountEuros: Number(amount),
        purchaseDate,
        description: description || undefined,
        idempotencyKey: generateClientIdempotencyKey()
      })
      if (!result.success || !result.data) {
        setError(result.error || 'Αποτυχία καταγραφής αγοράς')
        return
      }
      setSuccess(
        `Αγορά καταχωρήθηκε. +${result.data.pointsEarned} πόντοι. Νέο υπόλοιπο: ${result.data.balance}` +
          (result.data.referralRewarded ? ' (ανταμοιβή παραπομπής δόθηκε)' : '')
      )
      setAmount('')
      setDescription('')
      await load()
    } finally {
      setBusy(false)
    }
  }

  async function doRedeem() {
    if (!id || !selectedReward) return
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      const result = await api().rewards.redeem({
        customerId: id,
        rewardId: selectedReward,
        idempotencyKey: generateClientIdempotencyKey()
      })
      if (!result.success || !result.data) {
        setError(result.error || 'Αποτυχία εξαργύρωσης')
        return
      }
      setSuccess(`Εξαργύρωση επιτυχής. Υπόλοιπο: ${result.data.balance} πόντοι`)
      setSelectedReward('')
      setConfirmRedeem(false)
      await load()
    } finally {
      setBusy(false)
    }
  }

  if (!profile) {
    return (
      <>
        <PageHeader title="Προφίλ πελάτισσας" />
        <div className="content">
          {error ? <div className="alert alert-error">{error}</div> : <p className="muted">Φόρτωση...</p>}
          <Link to="/customers">← Πίσω</Link>
        </div>
      </>
    )
  }

  const c = profile.customer
  const reward = profile.redeemableRewards.find((r) => r.id === selectedReward)

  return (
    <>
      <PageHeader
        title={c.fullName}
        subtitle={`${c.id} · ${c.phoneDisplay}`}
        actions={<span className="points-pill">{c.pointsBalance} πόντοι</span>}
      />
      <div className="content">
        {error ? <div className="alert alert-error">{error}</div> : null}
        {success ? <div className="alert alert-success">{success}</div> : null}

        <div className="grid grid-2">
          <div className="card">
            <div className="toolbar">
              <h3 className="section-title" style={{ margin: 0 }}>
                Στοιχεία
              </h3>
              <div className="spacer" />
              <button type="button" className="btn btn-secondary" onClick={() => setEditing(!editing)}>
                {editing ? 'Ακύρωση' : 'Επεξεργασία'}
              </button>
            </div>
            {!editing ? (
              <div className="stack-sm">
                <div>
                  <strong>Γέννηση:</strong> {formatDate(c.dateOfBirth)}
                </div>
                <div>
                  <strong>Εγγραφή:</strong> {formatDate(c.createdAt)}
                </div>
                <div>
                  <strong>Κωδικός παραπομπής:</strong> {c.referralCode}
                </div>
                <div>
                  <strong>Μπόνους εγγραφής:</strong>{' '}
                  {c.registrationBonusAwarded ? 'Ναι' : 'Όχι'}
                </div>
                {profile.referredBy ? (
                  <div>
                    <strong>Παραπέμφθηκε από:</strong>{' '}
                    <Link to={`/customers/${profile.referredBy.id}`}>
                      {profile.referredBy.fullName}
                    </Link>
                  </div>
                ) : null}
              </div>
            ) : (
              <form className="form-grid" onSubmit={saveEdit}>
                <div className="form-row">
                  <label>Ονοματεπώνυμο</label>
                  <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                </div>
                <div className="form-row">
                  <label>Τηλέφωνο</label>
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} required />
                </div>
                <div className="form-row">
                  <label>Ημ/νία γέννησης</label>
                  <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} required />
                </div>
                <button type="submit" className="btn btn-primary" disabled={busy}>
                  Αποθήκευση
                </button>
              </form>
            )}
          </div>

          <div className="card">
            <h3 className="section-title">Καταγραφή αγοράς</h3>
            <p className="muted">Κάθε €1 = 1 πόντος (ακέραια ευρώ).</p>
            <form className="form-grid" onSubmit={recordPurchase}>
              <div className="form-row">
                <label>Ποσό (€)</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
              <div className="form-row">
                <label>Ημ/νία</label>
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  required
                />
              </div>
              <div className="form-row">
                <label>Περιγραφή</label>
                <input value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                Καταχώρηση αγοράς
              </button>
            </form>
          </div>
        </div>

        <div className="card">
          <h3 className="section-title">Εξαργύρωση ανταμοιβής</h3>
          {profile.redeemableRewards.length === 0 ? (
            <p className="muted">Δεν υπάρχουν διαθέσιμες ανταμοιβές για το τρέχον υπόλοιπο.</p>
          ) : (
            <div className="toolbar">
              <select value={selectedReward} onChange={(e) => setSelectedReward(e.target.value)}>
                <option value="">Επιλέξτε ανταμοιβή...</option>
                {profile.redeemableRewards.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.pointsRequired} πόντοι)
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!selectedReward || busy}
                onClick={() => setConfirmRedeem(true)}
              >
                Εξαργύρωση
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-2">
          <div className="card">
            <h3 className="section-title">Αγορές</h3>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Ημ/νία</th>
                    <th>Ποσό</th>
                    <th>Πόντοι</th>
                  </tr>
                </thead>
                <tbody>
                  {profile.purchases.map((p) => (
                    <tr key={p.id}>
                      <td>{formatDate(p.purchaseDate)}</td>
                      <td>{formatEuros(p.amountCents)}</td>
                      <td>+{p.pointsEarned}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="card">
            <h3 className="section-title">Ιστορικό πόντων</h3>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Ημ/νία</th>
                    <th>Τύπος</th>
                    <th>Πόντοι</th>
                    <th>Υπόλοιπο</th>
                  </tr>
                </thead>
                <tbody>
                  {profile.transactions.map((t) => (
                    <tr key={t.id}>
                      <td>{formatDateTime(t.createdAt)}</td>
                      <td>{t.description}</td>
                      <td>
                        {t.points > 0 ? '+' : ''}
                        {t.points}
                      </td>
                      <td>{t.balanceAfter}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <ConfirmDialog
          open={confirmRedeem}
          title="Επιβεβαίωση εξαργύρωσης"
          message={
            reward
              ? `${c.fullName} · ${reward.name} · ${reward.pointsRequired} πόντοι. Υπόλοιπο μετά: ${c.pointsBalance - reward.pointsRequired}`
              : ''
          }
          confirmLabel="Εξαργύρωση"
          busy={busy}
          onCancel={() => setConfirmRedeem(false)}
          onConfirm={() => void doRedeem()}
        />
      </div>
    </>
  )
}
