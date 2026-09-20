export default function SectionCard({ icon, title, subtitle, children, accent = 'from-elo-blue to-elo-magenta' }) {
  return (
    <section className="rounded-2xl border border-elo-border bg-elo-card/80 backdrop-blur-sm p-5 sm:p-6 shadow-lg shadow-black/20 animate-fade-in">
      <div className="mb-5 flex items-center gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${accent} shadow-md`}>
          {icon}
        </div>
        <div>
          <h2 className="font-display text-[15px] font-semibold tracking-tight text-ink-primary">{title}</h2>
          {subtitle && <p className="text-xs text-ink-muted">{subtitle}</p>}
        </div>
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  )
}
