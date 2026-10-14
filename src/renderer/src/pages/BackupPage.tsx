import { useState } from 'react'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { api } from '../lib/api'

export function BackupPage() {
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmRestore, setConfirmRestore] = useState(false)
  const [restorePath, setRestorePath] = useState('')

  async function createBackup() {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const pick = await api().backup.pickSave()
      if (!pick.success || !pick.data?.path) {
        if (pick.code !== 'CANCELLED') setError(pick.error || 'Ακύρωση')
        return
      }
      const result = await api().backup.create(pick.data.path)
      if (!result.success) {
        setError(result.message || 'Αποτυχία αντιγράφου')
        return
      }
      setMessage(result.message + (result.path ? ` — ${result.path}` : ''))
    } finally {
      setBusy(false)
    }
  }

  async function pickRestore() {
    setError('')
    setMessage('')
    const pick = await api().backup.pickOpen()
    if (!pick.success || !pick.data?.path) {
      if (pick.code !== 'CANCELLED') setError(pick.error || 'Ακύρωση')
      return
    }
    setRestorePath(pick.data.path)
    setConfirmRestore(true)
  }

  async function doRestore() {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const result = await api().backup.restore(restorePath)
      if (!result.success) {
        setError(result.message || 'Αποτυχία επαναφοράς')
        return
      }
      setMessage(result.message)
      setConfirmRestore(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="topbar">
        <div>
          <p className="dash-kicker">Ασφάλεια</p>
          <h2 className="page-title">Αντίγραφα Ασφαλείας</h2>
          <p className="page-subtitle">Χειροκίνητο αντίγραφο και επαναφορά τοπικής βάσης</p>
        </div>
      </div>

      <div className="content backup-page">
        {error ? <div className="alert alert-error">{error}</div> : null}
        {message ? <div className="alert alert-success">{message}</div> : null}

        <section className="ref-stats">
          <article className="dash-metric">
            <p className="stat-label">Τύπος</p>
            <p className="stat-value backup-stat-sm">SQLite</p>
          </article>
          <article className="dash-metric">
            <p className="stat-label">Τοποθεσία</p>
            <p className="stat-value backup-stat-sm">Τοπική</p>
          </article>
          <article className="dash-metric">
            <p className="stat-label">Πριν επαναφορά</p>
            <p className="stat-value backup-stat-sm">Auto</p>
          </article>
          <article className="dash-metric">
            <p className="stat-label">Cloud</p>
            <p className="stat-value backup-stat-sm">Όχι</p>
          </article>
        </section>

        <div className="backup-layout">
          <section className="pts-form-panel">
            <div className="reg-form-head">
              <div>
                <p className="dash-kicker">Εξαγωγή</p>
                <h3>Δημιουργία αντιγράφου</h3>
              </div>
              <span className="reg-form-chip">Ασφαλές</span>
            </div>
            <p className="backup-lead">
              Δημιουργεί στιγμιότυπο της βάσης: πελάτισσες, αγορές, πόντοι, παραπομπές,
              ανταμοιβές και ρυθμίσεις.
            </p>
            <ul className="backup-checklist">
              <li>Επιλέγετε εσείς τη θέση αποθήκευσης</li>
              <li>Δεν απαιτείται σύνδεση στο internet</li>
              <li>Κατάλληλο πριν ενημερώσεις ή αλλαγές PC</li>
            </ul>
            <button
              type="button"
              className="btn btn-primary reg-submit"
              disabled={busy}
              onClick={() => void createBackup()}
            >
              {busy ? 'Επεξεργασία...' : 'Δημιουργία αντιγράφου...'}
            </button>
          </section>

          <aside className="ref-aside">
            <div className="reg-aside-glow" aria-hidden="true" />
            <p className="reg-aside-script">Angel Nails</p>
            <h3>Τα δεδομένα σας</h3>
            <p className="pts-aside-lead">
              Όλα μένουν στον υπολογιστή του σαλονιού. Το αντίγραφο είναι δικό σας αρχείο.
            </p>
            <ul className="reg-benefits">
              <li>
                <span className="reg-benefit-label">Βάση</span>
                <strong>SQLite</strong>
              </li>
              <li>
                <span className="reg-benefit-label">Έλεγχος</span>
                <strong>χειροκίνητος</strong>
              </li>
              <li>
                <span className="reg-benefit-label">Ιδιωτικότητα</span>
                <strong>100%</strong>
              </li>
            </ul>
          </aside>
        </div>

        <section className="backup-restore">
          <div className="dash-panel-head">
            <div>
              <p className="dash-kicker">Εισαγωγή</p>
              <h3>Επαναφορά</h3>
            </div>
            <span className="badge badge-muted">Προσοχή</span>
          </div>
          <p className="backup-lead">
            Η επαναφορά αντικαθιστά τα τρέχοντα δεδομένα. Πριν την εφαρμογή δημιουργείται
            αυτόματα αντίγραφο ασφαλείας.
          </p>
          <div className="backup-warning">
            <strong>Σημαντικό</strong>
            <span>Χρησιμοποιήστε μόνο αξιόπιστα αρχεία αντιγράφου από αυτό το πρόγραμμα.</span>
          </div>
          <button
            type="button"
            className="btn btn-danger"
            disabled={busy}
            onClick={() => void pickRestore()}
          >
            Επαναφορά από αρχείο...
          </button>
        </section>

        <ConfirmDialog
          open={confirmRestore}
          title="Επιβεβαίωση επαναφοράς"
          message={`Θα αντικατασταθούν τα τρέχοντα δεδομένα με το αρχείο:\n${restorePath}`}
          confirmLabel="Επαναφορά"
          danger
          busy={busy}
          onCancel={() => setConfirmRestore(false)}
          onConfirm={() => void doRestore()}
        />
      </div>
    </>
  )
}
