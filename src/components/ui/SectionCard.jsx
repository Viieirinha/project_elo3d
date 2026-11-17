// Cartão de seção do formulário: ícone discreto, título e conteúdo em coluna.
export default function SectionCard({ icon, title, subtitle, children, acao }) {
  return (
    <section className="card animate-fade-in p-5 sm:p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-elo-blue/10 text-elo-blue [&>svg]:text-current">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-[15px] font-semibold tracking-tight text-ink-primary">{title}</h2>
          {subtitle && <p className="text-xs text-ink-muted">{subtitle}</p>}
        </div>
        {acao}
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  )
}
