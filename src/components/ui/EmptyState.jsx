import { AlertCircle, RotateCw } from 'lucide-react'
import Button from './Button.jsx'

export default function EmptyState({ icone: Icone, titulo, texto, acao }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-elo-border-strong/60 bg-surface-subtle px-6 py-14 text-center">
      {Icone && (
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-elo-blue/10 text-elo-blue">
          <Icone size={22} />
        </span>
      )}
      {titulo && <p className="font-display text-base font-semibold text-ink-primary">{titulo}</p>}
      {texto && <p className="max-w-sm text-sm text-ink-muted">{texto}</p>}
      {acao}
    </div>
  )
}

// Mostrado quando uma lista não carrega (rede fora, servidor reiniciando, sessão expirada...).
export function ErroCarregamento({ erro, onTentar }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-2xl border border-red-500/25 bg-red-500/5 px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">
        <AlertCircle size={22} />
      </span>
      <p className="font-display text-base font-semibold text-ink-primary">Não foi possível carregar</p>
      <p className="max-w-sm text-sm text-ink-muted">{erro || 'Verifique sua conexão e tente novamente.'}</p>
      {onTentar && (
        <Button icone={RotateCw} onClick={onTentar}>
          Tentar novamente
        </Button>
      )}
    </div>
  )
}
