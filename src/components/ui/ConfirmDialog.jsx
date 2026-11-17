import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import Modal from './Modal.jsx'
import Button from './Button.jsx'

// `onConfirm` pode ser assíncrono: o botão mostra carregando enquanto roda.
export default function ConfirmDialog({ open, title, message, confirmLabel = 'Confirmar', variante = 'danger', onConfirm, onCancel }) {
  const [carregando, setCarregando] = useState(false)

  async function confirmar() {
    setCarregando(true)
    try {
      await onConfirm()
    } finally {
      setCarregando(false)
    }
  }

  return (
    <Modal open={open} onClose={onCancel} titulo={title} icone={AlertTriangle} tamanho="sm">
      <p className="mb-5 text-sm leading-relaxed text-ink-secondary">{message}</p>
      <div className="flex gap-2.5">
        <Button className="flex-1" onClick={onCancel} disabled={carregando} data-autofocus>
          Cancelar
        </Button>
        <Button className="flex-1" variante={variante} carregando={carregando} onClick={confirmar}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}
