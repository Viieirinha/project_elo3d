import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

const ToastContext = createContext(null)

const ESTILOS = {
  sucesso: { icone: CheckCircle2, cor: 'text-elo-green' },
  erro: { icone: AlertCircle, cor: 'text-red-400' },
  info: { icone: Info, cor: 'text-elo-blue' },
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const contador = useRef(0)

  const remover = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), [])

  const mostrar = useCallback(
    (tipo, mensagem, duracao = 4200) => {
      const id = ++contador.current
      setToasts((t) => [...t.slice(-3), { id, tipo, mensagem }])
      setTimeout(() => remover(id), tipo === 'erro' ? duracao + 2500 : duracao)
    },
    [remover]
  )

  const api = useRef({
    sucesso: (m) => mostrar('sucesso', m),
    erro: (m) => mostrar('erro', m),
    info: (m) => mostrar('info', m),
  }).current

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* acima da barra inferior no celular */}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6">
        {toasts.map((t) => {
          const { icone: Icone, cor } = ESTILOS[t.tipo]
          return (
            <div
              key={t.id}
              role={t.tipo === 'erro' ? 'alert' : 'status'}
              className="animate-toast-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-elo-border bg-elo-raised px-4 py-3 shadow-pop"
            >
              <Icone size={18} className={`mt-0.5 shrink-0 ${cor}`} />
              <p className="flex-1 text-sm font-medium text-ink-primary">{t.mensagem}</p>
              <button
                type="button"
                aria-label="Dispensar aviso"
                onClick={() => remover(t.id)}
                className="shrink-0 text-ink-muted transition-colors hover:text-ink-primary"
              >
                <X size={15} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
