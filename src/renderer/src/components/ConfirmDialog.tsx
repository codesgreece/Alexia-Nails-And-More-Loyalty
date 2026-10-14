export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Επιβεβαίωση',
  cancelLabel = 'Ακύρωση',
  danger = false,
  busy = false,
  onConfirm,
  onCancel
}: {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  if (!open) return null
  return (
    <div className="dialog-backdrop" role="dialog" aria-modal="true">
      <div className="dialog">
        <h3>{title}</h3>
        <p className="muted">{message}</p>
        <div className="dialog-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? 'Επεξεργασία...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
