export default function StatCard({ rotulo, icone: Icone, valor, detalhe, destaque = false }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-ink-secondary">{rotulo}</span>
        {Icone && (
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-elo-blue/10 text-elo-blue">
            <Icone size={16} />
          </span>
        )}
      </div>
      <p className={`mt-3 font-display text-[28px] font-semibold leading-none tracking-tight tabular-nums ${destaque ? 'gradient-text' : 'text-ink-primary'}`}>
        {valor}
      </p>
      {detalhe && <p className="mt-2 text-xs text-ink-muted">{detalhe}</p>}
    </div>
  )
}
