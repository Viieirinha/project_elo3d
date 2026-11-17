import { Loader2 } from 'lucide-react'

const VARIANTES = {
  primary: 'bg-elo-brand text-white shadow-brand hover:brightness-110 active:brightness-95',
  secondary:
    'border border-elo-border bg-elo-card text-ink-primary hover:border-elo-border-strong hover:bg-surface-hover',
  soft: 'bg-elo-blue/10 text-elo-blue hover:bg-elo-blue/15',
  ghost: 'text-ink-secondary hover:bg-surface-hover hover:text-ink-primary',
  danger: 'bg-red-500 text-white hover:bg-red-600',
  success: 'bg-gradient-to-r from-elo-green to-elo-blue text-white hover:brightness-110',
}

const TAMANHOS = {
  sm: 'h-8 gap-1.5 rounded-lg px-3 text-xs',
  md: 'h-10 gap-2 rounded-xl px-4 text-sm',
  lg: 'h-12 gap-2 rounded-xl px-5 text-sm',
}

export default function Button({
  variante = 'secondary',
  tamanho = 'md',
  icone: Icone,
  carregando = false,
  bloco = false,
  className = '',
  children,
  type = 'button',
  disabled,
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || carregando}
      className={`inline-flex shrink-0 select-none items-center justify-center font-semibold transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-45 ${
        VARIANTES[variante]
      } ${TAMANHOS[tamanho]} ${bloco ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {carregando ? <Loader2 size={16} className="animate-spin" /> : Icone && <Icone size={tamanho === 'sm' ? 14 : 16} />}
      {children}
    </button>
  )
}

// Botão só com ícone. `rotulo` é obrigatório: vira o aria-label e a dica ao passar o mouse.
export function IconButton({ icone: Icone, rotulo, tamanho = 'md', variante = 'ghost', className = '', ...props }) {
  const dim = tamanho === 'sm' ? 'h-8 w-8' : 'h-10 w-10'
  return (
    <button
      type="button"
      aria-label={rotulo}
      title={rotulo}
      className={`inline-flex shrink-0 items-center justify-center rounded-xl transition-colors disabled:opacity-45 ${dim} ${
        variante === 'danger'
          ? 'text-ink-muted hover:bg-red-500/10 hover:text-red-400'
          : 'text-ink-secondary hover:bg-surface-hover hover:text-ink-primary'
      } ${className}`}
      {...props}
    >
      <Icone size={tamanho === 'sm' ? 15 : 18} />
    </button>
  )
}
