// Alternância de opções (abas curtas, períodos, unidades). Visual neutro; o item ativo "sobe".
export default function Segmented({ opcoes, valor, onChange, rotulo, tamanho = 'md', className = '' }) {
  return (
    <div
      role="group"
      aria-label={rotulo}
      className={`inline-flex max-w-full gap-0.5 overflow-x-auto rounded-xl border border-elo-border bg-surface-subtle p-1 ${className}`}
    >
      {opcoes.map((o) => {
        const ativo = o.valor === valor
        const Icone = o.icone
        return (
          <button
            key={String(o.valor)}
            type="button"
            aria-pressed={ativo}
            onClick={() => onChange(o.valor)}
            className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg font-semibold transition-all duration-150 ${
              tamanho === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-[13px]'
            } ${
              ativo
                ? 'bg-elo-card text-ink-primary shadow-card ring-1 ring-elo-border-strong/60'
                : 'text-ink-secondary hover:text-ink-primary'
            }`}
          >
            {Icone && <Icone size={14} />}
            {o.rotulo}
          </button>
        )
      })}
    </div>
  )
}
