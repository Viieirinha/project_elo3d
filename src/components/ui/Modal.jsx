import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { IconButton } from './Button.jsx'

const LARGURAS = { sm: 'sm:max-w-sm', md: 'sm:max-w-md', lg: 'sm:max-w-lg' }
const FOCAVEIS =
  'a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

/**
 * Janela de diálogo acessível: foco preso dentro dela, Esc e clique fora fecham, a rolagem da página
 * fica travada e o foco volta ao botão que a abriu. No celular vira uma "bottom sheet".
 */
export default function Modal({ open, onClose, titulo, icone: Icone, tamanho = 'md', children, rodape }) {
  const idTitulo = useId()
  const caixa = useRef(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    const anterior = document.activeElement
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // foco inicial: campo marcado com autofocus, senão o primeiro item focável do conteúdo
    const t = setTimeout(() => {
      const alvo = caixa.current?.querySelector('[data-autofocus]') ?? caixa.current?.querySelector('form ' + FOCAVEIS)
      ;(alvo ?? caixa.current)?.focus()
    }, 30)

    function aoTeclar(e) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCloseRef.current?.()
      } else if (e.key === 'Tab' && caixa.current) {
        const itens = [...caixa.current.querySelectorAll(FOCAVEIS)].filter((el) => el.offsetParent !== null)
        if (itens.length === 0) return
        const primeiro = itens[0]
        const ultimo = itens[itens.length - 1]
        if (e.shiftKey && document.activeElement === primeiro) {
          e.preventDefault()
          ultimo.focus()
        } else if (!e.shiftKey && document.activeElement === ultimo) {
          e.preventDefault()
          primeiro.focus()
        }
      }
    }
    document.addEventListener('keydown', aoTeclar)
    return () => {
      clearTimeout(t)
      document.removeEventListener('keydown', aoTeclar)
      document.body.style.overflow = overflow
      anterior?.focus?.()
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div
      className="animate-overlay-in fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-[3px] sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div
        ref={caixa}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        tabIndex={-1}
        className={`animate-sheet-in flex max-h-[92dvh] w-full flex-col rounded-t-3xl border border-elo-border bg-elo-card shadow-pop outline-none sm:rounded-2xl ${LARGURAS[tamanho]}`}
      >
        <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-5 sm:px-6">
          <h2 id={idTitulo} className="flex items-center gap-2.5 font-display text-lg font-semibold tracking-tight text-ink-primary">
            {Icone && (
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-elo-blue/10 text-elo-blue">
                <Icone size={17} />
              </span>
            )}
            {titulo}
          </h2>
          <IconButton icone={X} rotulo="Fechar" tamanho="sm" onClick={onClose} />
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-5 sm:px-6 sm:pb-6">{children}</div>
        {rodape && <div className="border-t border-elo-border px-5 py-4 sm:px-6">{rodape}</div>}
      </div>
    </div>,
    document.body
  )
}
