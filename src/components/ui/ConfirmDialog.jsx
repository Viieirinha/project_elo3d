import { AlertTriangle, X } from 'lucide-react'

export default function ConfirmDialog({ open, title, message, confirmLabel = 'Confirmar', onConfirm, onCancel }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-sm rounded-2xl border border-elo-border bg-elo-card p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-400">
              <AlertTriangle size={17} />
            </div>
            <h2 className="font-display text-base font-bold text-ink-primary">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full p-1.5 text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink-primary"
          >
            <X size={16} />
          </button>
        </div>

        <p className="mb-5 text-sm text-ink-secondary">{message}</p>

        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-elo-border bg-surface-subtle px-4 py-2.5 text-sm font-medium text-ink-secondary transition-colors hover:border-elo-border-strong hover:text-ink-primary"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-opacity hover:opacity-90"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
