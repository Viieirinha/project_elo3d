import { useMemo, useState } from 'react'
import { formatBRL } from '../utils/format.js'

const GRANULARIDADES = [
  { id: 'dia', label: 'Dia', buckets: 14 },
  { id: 'semana', label: 'Semana', buckets: 8 },
  { id: 'mes', label: 'Mês', buckets: 6 },
]

function inicioDoDia(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function inicioDaSemana(date) {
  const d = inicioDoDia(date)
  const diaSemana = d.getDay()
  d.setDate(d.getDate() - diaSemana)
  return d
}

function inicioDoMes(date) {
  const d = inicioDoDia(date)
  d.setDate(1)
  return d
}

function construirBuckets(vendas, granularidadeId, campo) {
  const config = GRANULARIDADES.find((g) => g.id === granularidadeId)
  const hoje = new Date()
  const buckets = []

  for (let i = config.buckets - 1; i >= 0; i--) {
    let inicio, fim, label
    if (granularidadeId === 'dia') {
      inicio = inicioDoDia(hoje)
      inicio.setDate(inicio.getDate() - i)
      fim = new Date(inicio)
      fim.setDate(fim.getDate() + 1)
      label = inicio.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    } else if (granularidadeId === 'semana') {
      inicio = inicioDaSemana(hoje)
      inicio.setDate(inicio.getDate() - i * 7)
      fim = new Date(inicio)
      fim.setDate(fim.getDate() + 7)
      label = inicio.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    } else {
      inicio = inicioDoMes(hoje)
      inicio.setMonth(inicio.getMonth() - i)
      fim = new Date(inicio)
      fim.setMonth(fim.getMonth() + 1)
      label = inicio.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
    }
    buckets.push({ inicio, fim, label, valor: 0 })
  }

  for (const venda of vendas) {
    const data = new Date(venda.criadoEm)
    const bucket = buckets.find((b) => data >= b.inicio && data < b.fim)
    if (bucket) bucket.valor += venda[campo]
  }

  return buckets
}

export default function SalesChart({ vendas, campo = 'valorTotal', titulo = 'Faturamento por período' }) {
  const [granularidade, setGranularidade] = useState('dia')
  const [hover, setHover] = useState(null)

  const buckets = useMemo(() => construirBuckets(vendas, granularidade, campo), [vendas, granularidade, campo])
  const maxValor = Math.max(1, ...buckets.map((b) => b.valor))
  const total = buckets.length
  const mostrarTodosLabels = total <= 8

  return (
    <section className="rounded-2xl border border-elo-border bg-elo-card/80 p-5 shadow-lg shadow-black/20 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-[15px] font-semibold text-ink-primary">{titulo}</h2>
        <div className="flex items-center gap-1 rounded-full border border-elo-border bg-surface-subtle p-1">
          {GRANULARIDADES.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setGranularidade(g.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                granularidade === g.id ? 'bg-elo-gradient text-white' : 'text-ink-secondary hover:text-ink-primary'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {vendas.length === 0 ? (
        <p className="text-sm text-ink-muted">Sem vendas registradas ainda para exibir no gráfico.</p>
      ) : (
        <div className="relative">
          {hover !== null && (
            <div
              className="pointer-events-none absolute -top-1 z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-elo-border bg-elo-card px-2.5 py-1.5 text-xs shadow-xl"
              style={{ left: `${((hover + 0.5) / total) * 100}%` }}
            >
              <p className="font-semibold text-ink-primary">{formatBRL(buckets[hover].valor)}</p>
              <p className="text-ink-muted">{buckets[hover].label}</p>
            </div>
          )}
          <div className="flex h-40 items-end gap-1.5">
            {buckets.map((b, i) => {
              const alturaPct = (b.valor / maxValor) * 100
              return (
                <div
                  key={i}
                  className="group flex h-full flex-1 flex-col items-center justify-end"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                >
                  <div
                    className={`w-full rounded-t transition-colors ${
                      b.valor > 0 ? 'bg-[#5D5FEF] group-hover:bg-[#7B7DFF]' : 'bg-elo-border'
                    }`}
                    style={{ height: `${b.valor > 0 ? Math.max(alturaPct, 3) : 2}%` }}
                  />
                </div>
              )
            })}
          </div>
          <div className="mt-2 flex gap-1.5 border-t border-elo-border/60 pt-2">
            {buckets.map((b, i) => (
              <div key={i} className="flex-1 text-center text-[10px] text-ink-muted">
                {mostrarTodosLabels || i === 0 || i === total - 1 ? b.label : ''}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
