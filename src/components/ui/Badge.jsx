const TONS = {
  neutro: 'bg-surface-hover text-ink-secondary',
  marca: 'bg-elo-blue/12 text-elo-blue',
  sucesso: 'bg-elo-green/12 text-elo-green',
  alerta: 'bg-elo-yellow/15 text-elo-yellow',
  perigo: 'bg-red-500/12 text-red-400',
}

export default function Badge({ tom = 'neutro', icone: Icone, children, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${TONS[tom]} ${className}`}>
      {Icone && <Icone size={11} />}
      {children}
    </span>
  )
}
