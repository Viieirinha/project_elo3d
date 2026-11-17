export default function PageHeader({ titulo, subtitulo, acoes }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-3 sm:mb-8">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink-primary sm:text-[28px]">{titulo}</h1>
        {subtitulo && <p className="mt-1 text-sm text-ink-muted">{subtitulo}</p>}
      </div>
      {acoes && <div className="flex flex-wrap items-center gap-2">{acoes}</div>}
    </div>
  )
}
