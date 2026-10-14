import { useEffect, useState } from 'react'
import type { UpdateCheckResult, UpdateStatusPayload } from '@shared/types'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { api } from '../lib/api'

export function SettingsPage() {
  const [version, setVersion] = useState('')
  const [dataPath, setDataPath] = useState('')
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckResult | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [downloadPercent, setDownloadPercent] = useState<number | null>(null)
  const [downloaded, setDownloaded] = useState(false)
  const [confirmInstall, setConfirmInstall] = useState(false)

  useEffect(() => {
    void (async () => {
      setVersion(await api().getVersion())
      setDataPath(await api().getDataPath())
    })()
  }, [])

  useEffect(() => {
    return api().updates.onStatus((payload) => {
      const status = payload as UpdateStatusPayload
      switch (status.type) {
        case 'checking':
          setMessage('Έλεγχος για ενημερώσεις...')
          break
        case 'available':
          setError('')
          setMessage(`Διαθέσιμη ενημέρωση: ${status.version}`)
          setUpdateInfo((prev) =>
            prev
              ? { ...prev, updateAvailable: true, latestVersion: status.version }
              : {
                  updateAvailable: true,
                  currentVersion: version,
                  latestVersion: status.version,
                  message: `Διαθέσιμη ενημέρωση: ${status.version}`
                }
          )
          break
        case 'not-available':
          setError('')
          setMessage('Έχετε την πιο πρόσφατη έκδοση')
          break
        case 'progress':
          setDownloadPercent(Math.round(status.percent))
          setMessage(`Λήψη ενημέρωσης... ${Math.round(status.percent)}%`)
          break
        case 'downloaded':
          setDownloadPercent(100)
          setDownloaded(true)
          setBusy(false)
          setError('')
          setMessage(`Η έκδοση ${status.version} είναι έτοιμη. Επιβεβαιώστε για εγκατάσταση.`)
          break
        case 'error':
          setBusy(false)
          setDownloadPercent(null)
          setError(status.message || 'Σφάλμα ενημέρωσης')
          setMessage('')
          break
        default:
          break
      }
    })
  }, [version])

  async function checkUpdates() {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const result = await api().updates.check()
      setUpdateInfo(result)
      setMessage(result.message)
      if (result.downloaded) setDownloaded(true)
      if (!result.updateAvailable) setDownloaded(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Σφάλμα ελέγχου')
    } finally {
      setBusy(false)
    }
  }

  async function download() {
    setBusy(true)
    setError('')
    setDownloadPercent(0)
    try {
      const result = await api().updates.download()
      if (!result.success) {
        setError(result.message)
        setDownloadPercent(null)
        return
      }
      if (result.alreadyDownloaded) {
        setDownloaded(true)
        setDownloadPercent(100)
      }
      setMessage(result.message)
    } finally {
      setBusy(false)
    }
  }

  async function confirmAndInstall() {
    setBusy(true)
    setError('')
    try {
      const result = await api().updates.install()
      if (!result.success) {
        setError(result.message)
        setConfirmInstall(false)
        return
      }
      setMessage(result.message)
    } finally {
      setBusy(false)
    }
  }

  const showUpdateActions = Boolean(updateInfo?.updateAvailable || downloaded)

  return (
    <>
      <div className="topbar">
        <div>
          <p className="dash-kicker">Σύστημα</p>
          <h2 className="page-title">Ρυθμίσεις</h2>
          <p className="page-subtitle">Εφαρμογή, δεδομένα και ενημερώσεις</p>
        </div>
      </div>

      <div className="content settings-page">
        {error ? <div className="alert alert-error">{error}</div> : null}
        {message ? <div className="alert alert-info">{message}</div> : null}

        <section className="ref-stats">
          <article className="dash-metric">
            <p className="stat-label">Έκδοση</p>
            <p className="stat-value backup-stat-sm">{version || '—'}</p>
          </article>
          <article className="dash-metric">
            <p className="stat-label">Λειτουργία</p>
            <p className="stat-value backup-stat-sm">Offline</p>
          </article>
          <article className="dash-metric">
            <p className="stat-label">Βάση</p>
            <p className="stat-value backup-stat-sm">SQLite</p>
          </article>
          <article className="dash-metric">
            <p className="stat-label">Πόντοι</p>
            <p className="stat-value backup-stat-sm">€1 = 1</p>
          </article>
        </section>

        <div className="settings-layout">
          <section className="pts-form-panel">
            <div className="reg-form-head">
              <div>
                <p className="dash-kicker">Πληροφορίες</p>
                <h3>Εφαρμογή</h3>
              </div>
              <span className="reg-form-chip">Τοπική</span>
            </div>

            <ul className="settings-meta">
              <li>
                <span>Όνομα</span>
                <strong>Angel Nails Club</strong>
              </li>
              <li>
                <span>Επιχείρηση</span>
                <strong>Angel Nails & More</strong>
              </li>
              <li>
                <span>Έκδοση</span>
                <strong>{version || '—'}</strong>
              </li>
              <li>
                <span>Βάση δεδομένων</span>
                <strong className="settings-path">{dataPath || '—'}</strong>
              </li>
            </ul>
          </section>

          <aside className="ref-aside">
            <div className="reg-aside-glow" aria-hidden="true" />
            <p className="reg-aside-script">Angel Nails</p>
            <h3>Club για το σαλόνι</h3>
            <p className="pts-aside-lead">
              Η καθημερινή λειτουργία δεν χρειάζεται internet. Οι ενημερώσεις είναι προαιρετικές.
            </p>
            <ul className="reg-benefits">
              <li>
                <span className="reg-benefit-label">Δεδομένα</span>
                <strong>στον PC</strong>
              </li>
              <li>
                <span className="reg-benefit-label">Ιδιωτικότητα</span>
                <strong>πλήρης</strong>
              </li>
              <li>
                <span className="reg-benefit-label">Ενημερώσεις</span>
                <strong>χειροκίνητες</strong>
              </li>
            </ul>
          </aside>
        </div>

        <section className="settings-panel">
          <div className="dash-panel-head">
            <div>
              <p className="dash-kicker">GitHub</p>
              <h3>Ενημερώσεις</h3>
            </div>
          </div>
          <p className="settings-lead">
            Όταν υπάρχει σύνδεση, ελέγξτε για νεότερη έκδοση από το GitHub Releases. Χωρίς internet
            η εφαρμογή συνεχίζει κανονικά με την εγκατεστημένη έκδοση.
          </p>
          {downloadPercent !== null ? (
            <div className="settings-progress" aria-live="polite">
              <div className="settings-progress-bar" style={{ width: `${downloadPercent}%` }} />
              <span>{downloadPercent}%</span>
            </div>
          ) : null}
          <div className="settings-actions">
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy}
              onClick={() => void checkUpdates()}
            >
              {busy && downloadPercent === null ? 'Έλεγχος...' : 'Έλεγχος ενημερώσεων'}
            </button>
            {showUpdateActions ? (
              <>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={busy || downloaded}
                  onClick={() => void download()}
                >
                  {downloaded ? 'Λήφθηκε' : 'Λήψη'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={busy || !downloaded}
                  onClick={() => setConfirmInstall(true)}
                >
                  Εγκατάσταση
                </button>
              </>
            ) : null}
          </div>
        </section>

        <section className="settings-panel">
          <div className="dash-panel-head">
            <div>
              <p className="dash-kicker">Loyalty</p>
              <h3>Πολιτική πόντων</h3>
            </div>
          </div>
          <div className="settings-policy">
            <div className="settings-policy-item">
              <strong>€1 = 1 πόντος</strong>
              <span>Κάθε ευρώ δαπάνης μετατρέπεται σε έναν πόντο.</span>
            </div>
            <div className="settings-policy-item">
              <strong>Στρογγυλοποίηση προς τα κάτω</strong>
              <span>π.χ. €35,50 → 35 πόντοι.</span>
            </div>
            <div className="settings-policy-item">
              <strong>Αποθήκευση σε λεπτά</strong>
              <span>Τα ποσά κρατιούνται ως ακέραιοι (cents).</span>
            </div>
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={confirmInstall}
        title="Εγκατάσταση ενημέρωσης"
        message={`Θα εγκατασταθεί η έκδοση ${updateInfo?.latestVersion || 'νέα'} και η εφαρμογή θα επανεκκινήσει. Τα δεδομένα πελατισσών παραμένουν ανέπαφα. Συνέχεια;`}
        confirmLabel="Εγκατάσταση και επανεκκίνηση"
        cancelLabel="Ακύρωση"
        busy={busy}
        onCancel={() => setConfirmInstall(false)}
        onConfirm={() => void confirmAndInstall()}
      />
    </>
  )
}
