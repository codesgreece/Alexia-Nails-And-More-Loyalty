import { FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { AppSettings, Customer } from '@shared/types'
import { api } from '../lib/api'

export function RegisterPage() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [referralCode, setReferralCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [existing, setExisting] = useState<Customer | null>(null)
  const [success, setSuccess] = useState('')
  const [settings, setSettings] = useState<AppSettings | null>(null)

  useEffect(() => {
    void (async () => {
      const s = await api().settings.get()
      if (s && 'referralRewardEnabled' in s) setSettings(s as AppSettings)
    })()
  }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setExisting(null)
    setSuccess('')
    try {
      const result = await api().customers.register({
        fullName,
        phone,
        dateOfBirth,
        referralCode: referralCode.trim() || undefined
      })

      if (!result.success) {
        setError(result.error || 'Αποτυχία εγγραφής')
        if (result.code === 'DUPLICATE_PHONE' && result.data?.existing) {
          setExisting(result.data.existing)
        }
        return
      }

      const customer = result.data!.customer
      let msg = `Η πελάτισσα ${customer.fullName} καταχωρήθηκε επιτυχώς.`

      if (result.data?.referralPending) {
        const points = result.data.referralRewardPoints ?? 0
        const enabled = result.data.referralRewardEnabled
        if (enabled && points > 0) {
          const referrerShare = points - Math.floor((points * 20) / 100)
          const referredShare = Math.floor((points * 20) / 100)
          msg += ` Η ανταμοιβή παραπομπής (${points} πόντοι: ${referrerShare}/${referredShare}) θα δοθεί αυτόματα στην πρώτη αγορά της νέας πελάτισσας.`
        } else {
          msg +=
            ' Η παραπομπή καταχωρήθηκε, αλλά η ανταμοιβή δεν είναι ενεργή. Ενεργοποιήστε την στις «Προσφορές & Bonus» και καταχωρήστε την πρώτη αγορά.'
        }
      }

      setSuccess(msg)
      setFullName('')
      setPhone('')
      setDateOfBirth('')
      setReferralCode('')
      setTimeout(() => navigate(`/customers/${customer.id}`), 1800)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Αποτυχία εγγραφής')
    } finally {
      setBusy(false)
    }
  }

  const referralReady =
    settings?.referralRewardEnabled && (settings.referralRewardPoints ?? 0) > 0
  const regBonus =
    settings?.registrationBonusEnabled && (settings.registrationBonusPoints ?? 0) > 0
      ? settings.registrationBonusPoints
      : 0
  const referralPoints = settings?.referralRewardPoints ?? 0
  const referrerShare = referralPoints - Math.floor((referralPoints * 20) / 100)
  const referredShare = Math.floor((referralPoints * 20) / 100)

  return (
    <>
      <div className="topbar reg-topbar">
        <div>
          <p className="dash-kicker">Μητρώο</p>
          <h2 className="page-title">Νέα Εγγραφή</h2>
          <p className="page-subtitle">Καταχώρηση νέας πελάτισσας στο πρόγραμμα πιστότητας</p>
        </div>
      </div>

      <div className="content reg-page">
        <div className="reg-layout">
          <section className="reg-form-panel">
            <div className="reg-form-head">
              <div>
                <p className="dash-kicker">Βήμα 1</p>
                <h3>Στοιχεία πελάτισσας</h3>
              </div>
              <span className="reg-form-chip">Υποχρεωτικά *</span>
            </div>

            {error ? <div className="alert alert-error">{error}</div> : null}
            {existing ? (
              <div className="alert alert-info">
                Υπάρχουσα πελάτισσα: <strong>{existing.fullName}</strong> —{' '}
                <Link to={`/customers/${existing.id}`}>Άνοιγμα προφίλ</Link>
              </div>
            ) : null}
            {success ? <div className="alert alert-success">{success}</div> : null}

            {settings ? (
              <div className={`reg-banner ${referralReady ? 'is-ready' : 'is-warn'}`}>
                <span className="reg-banner-dot" aria-hidden="true" />
                <div>
                  {referralReady ? (
                    <>
                      <strong>Ανταμοιβή παραπομπής ενεργή</strong>
                      <span>
                        {settings.referralRewardPoints} πόντοι · 80% / 20% · δίνονται στην πρώτη αγορά
                      </span>
                    </>
                  ) : (
                    <>
                      <strong>Ανταμοιβή παραπομπής ανενεργή</strong>
                      <span>
                        Ρυθμίστε την στις <Link to="/offers">Προσφορές & Bonus</Link>
                      </span>
                    </>
                  )}
                </div>
              </div>
            ) : null}

            <form className="reg-form" onSubmit={onSubmit}>
              <div className="form-row">
                <label htmlFor="fullName">Ονοματεπώνυμο *</label>
                <input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="π.χ. Μαρία Παπαδοπούλου"
                />
              </div>

              <div className="reg-form-grid">
                <div className="form-row">
                  <label htmlFor="phone">Τηλέφωνο *</label>
                  <input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    placeholder="69xxxxxxxx"
                  />
                </div>
                <div className="form-row">
                  <label htmlFor="dob">Ημερομηνία γέννησης *</label>
                  <input
                    id="dob"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="reg-divider">
                <span>Παραπομπή</span>
              </div>

              <div className="form-row">
                <label htmlFor="ref">Κωδικός παραπομπής</label>
                <input
                  id="ref"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  placeholder="ANGEL-XXXXXX"
                />
              </div>

              <div className="reg-tip">
                Μετά την εγγραφή, καταχωρήστε αγορά στην πελάτισσα για να δοθούν οι πόντοι
                παραπομπής.
              </div>

              <button type="submit" className="btn btn-primary reg-submit" disabled={busy}>
                {busy ? 'Αποθήκευση...' : 'Καταχώρηση πελάτισσας'}
              </button>
            </form>
          </section>

          <aside className="reg-aside">
            <div className="reg-aside-glow" aria-hidden="true" />
            <p className="reg-aside-script">Angel Nails</p>
            <h3>Καλωσορίστε τη νέα πελάτισσα</h3>
            <p className="reg-aside-lead">
              Κάθε εγγραφή δημιουργεί μοναδικό κωδικό πιστότητας και κωδικό παραπομπής.
            </p>

            <ul className="reg-benefits">
              <li>
                <span className="reg-benefit-label">Μπόνους εγγραφής</span>
                <strong>{regBonus > 0 ? `${regBonus} πόντοι` : 'Ανενεργό'}</strong>
              </li>
              <li>
                <span className="reg-benefit-label">Αγορές</span>
                <strong>€1 = 1 πόντος</strong>
              </li>
              <li>
                <span className="reg-benefit-label">Παραπομπή</span>
                <strong>
                  {referralReady
                    ? `${referrerShare} / ${referredShare} πόντοι`
                    : 'Προς ρύθμιση'}
                </strong>
              </li>
            </ul>

            {referralReady ? (
              <div className="reg-split">
                <p className="dash-kicker">Κατανομή παραπομπής</p>
                <div className="reg-split-bar" aria-hidden="true">
                  <span style={{ flex: 8 }} />
                  <span style={{ flex: 2 }} />
                </div>
                <div className="reg-split-labels">
                  <span>Παραπέμπουσα 80%</span>
                  <span>Νέα 20%</span>
                </div>
              </div>
            ) : null}

            <div className="reg-aside-foot">
              <p>Μετά την καταχώρηση ανοίγει αυτόματα το προφίλ της πελάτισσας.</p>
            </div>
          </aside>
        </div>
      </div>
    </>
  )
}
