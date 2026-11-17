import { useMemo, useState } from 'react'
import { formatBRL } from '../utils/format.js'
import Segmented from './ui/Segmented.jsx'

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

const compacto = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 })

export default function SalesChart({ vendas, campo = 'valorTotal', titulo = 'Faturamento por período' }) {
  const [granularidade, setGranularidade] = useState('dia')
  const [ativo, setAtivo] = useState(null)

  const buckets = useMemo(() => construirBuckets(vendas, granularidade, campo), [vendas, granularidade, campo])
  const maxValor = Math.max(1, ...buckets.map((b) => b.valor))
  const totalPeriodo = buckets.reduce((acc, b) => acc + b.valor, 0)
  const total = buckets.length
  const mostrarTodosLabels = total <= 8
  const opcoes = GRANULARIDADES.map((g) => ({ valor: g.id, rotulo: g.label }))

  return (
    <section className="card p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-[15px] font-semibold text-ink-primary">{titulo}</h2>
          <p className="mt-0.5 text-xs text-ink-muted">
            Total no gráfico: <span className="font-semibold tabular-nums text-ink-secondary">{formatBRL(totalPeriodo)}</span>
          </p>
        </div>
        <Segmented rotulo="Agrupar por" tamanho="sm" opcoes={opcoes} valor={granularidade} onChange={setGranularidade} />
      </div>

      {vendas.length === 0 ? (
        <p className="text-sm text-ink-muted">Sem vendas registradas ainda para exibir no gráfico.</p>
      ) : (
        <div className="relative pl-12">
          {/* linhas de grade e valores do eixo */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-44">
            {[1, 0.5, 0].map((f) => (
              <div key={f} className="absolute inset-x-0 flex items-center gap-2" style={{ top: `${(1 - f) * 100}%`, transform: 'translateY(-50%)' }}>
                <span className="w-10 shrink-0 text-right text-[10px] tabular-nums text-ink-muted">{compacto.format(maxValor * f)}</span>
                <span className="h-px flex-1 bg-elo-border" />
              </div>
            ))}
          </div>

          {ativo !== null && (
            <div
              role="status"
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-elo-border bg-elo-raised px-2.5 py-1.5 text-xs shadow-pop"
              style={{ left: `calc(3rem + (100% - 3rem) * ${(ativo + 0.5) / total})`, top: `${(1 - buckets[ativo].valor / maxValor) * 11}rem` }}
            >
              <p className="font-semibold tabular-nums text-ink-primary">{formatBRL(buckets[ativo].valor)}</p>
              <p className="text-ink-muted">{buckets[ativo].label}</p>
            </div>
          )}

          <div className="relative flex h-44 items-end gap-1.5">
            {buckets.map((b, i) => (
              <button
                key={i}
                type="button"
                aria-label={`${b.label}: ${formatBRL(b.valor)}`}
                onMouseEnter={() => setAtivo(i)}
                onMouseLeave={() => setAtivo(null)}
                onFocus={() => setAtivo(i)}
                onBlur={() => setAtivo(null)}
                className="group flex h-full flex-1 flex-col justify-end rounded-md outline-none focus-visible:ring-2 focus-visible:ring-elo-blue"
              >
                <div
                  className={`w-full rounded-t-md transition-all duration-150 ${
                    b.valor > 0 ? 'bg-gradient-to-t from-elo-blue to-elo-violet group-hover:brightness-125 group-focus-visible:brightness-125' : 'bg-elo-border'
                  }`}
                  style={{ height: b.valor > 0 ? `${Math.max((b.valor / maxValor) * 100, 3)}%` : '2px' }}
                />
              </button>
            ))}
          </div>
          <div className="mt-2 flex gap-1.5">
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
