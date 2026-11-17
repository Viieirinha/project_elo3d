import { useMemo, useState } from 'react'
import { formatBRL } from '../utils/format.js'

const CORES = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--chart-6)']
const MAX_FATIAS = 6

function construirFatias(vendas, categoriaPorProduto) {
  const mapa = new Map()
  for (const v of vendas) {
    const categoria = categoriaPorProduto.get(v.produtoId) || 'Sem categoria'
    mapa.set(categoria, (mapa.get(categoria) ?? 0) + v.valorTotal)
  }

  const ordenado = Array.from(mapa.entries())
    .map(([categoria, valor]) => ({ categoria, valor }))
    .sort((a, b) => b.valor - a.valor)

  let fatias = ordenado
  if (ordenado.length > MAX_FATIAS) {
    const principais = ordenado.slice(0, MAX_FATIAS - 1)
    const outros = ordenado.slice(MAX_FATIAS - 1).reduce((acc, f) => acc + f.valor, 0)
    fatias = [...principais, { categoria: 'Outros', valor: outros }]
  }

  const total = fatias.reduce((acc, f) => acc + f.valor, 0)
  return fatias.map((f, i) => ({ ...f, pct: total > 0 ? (f.valor / total) * 100 : 0, cor: CORES[i % CORES.length] }))
}

export default function CategoryDonutChart({ vendas, produtos }) {
  const [hover, setHover] = useState(null)

  const categoriaPorProduto = useMemo(
    () => new Map(produtos.map((p) => [p.id, p.categoria?.trim() || 'Sem categoria'])),
    [produtos]
  )
  const fatias = useMemo(() => construirFatias(vendas, categoriaPorProduto), [vendas, categoriaPorProduto])

  const gradiente = useMemo(() => {
    let acumulado = 0
    const stops = fatias.map((f) => {
      const inicio = acumulado
      acumulado += f.pct
      return `${f.cor} ${inicio * 3.6}deg ${acumulado * 3.6}deg`
    })
    return `conic-gradient(${stops.join(', ')})`
  }, [fatias])

  const totalGeral = fatias.reduce((acc, f) => acc + f.valor, 0)

  return (
    <section className="card p-5 sm:p-6">
      <h2 className="mb-4 font-display text-[15px] font-semibold text-ink-primary">Vendas por categoria</h2>
      {fatias.length === 0 ? (
        <p className="text-sm text-ink-muted">Sem vendas registradas ainda.</p>
      ) : (
        <div className="flex flex-col items-center gap-7 sm:flex-row">
          <div className="relative h-44 w-44 shrink-0" role="img" aria-label={`Vendas por categoria, total ${formatBRL(totalGeral)}`}>
            <div className="h-full w-full rounded-full" style={{ background: gradiente }} />
            <div className="absolute inset-[16%] flex flex-col items-center justify-center rounded-full bg-elo-card text-center">
              {hover !== null ? (
                <>
                  <span className="max-w-[80%] truncate text-[11px] text-ink-muted">{fatias[hover].categoria}</span>
                  <span className="font-display text-lg font-semibold tabular-nums text-ink-primary">{fatias[hover].pct.toFixed(0)}%</span>
                </>
              ) : (
                <>
                  <span className="text-[11px] text-ink-muted">Total</span>
                  <span className="font-display text-sm font-semibold tabular-nums text-ink-primary">{formatBRL(totalGeral)}</span>
                </>
              )}
            </div>
          </div>

          <ul className="flex w-full flex-col gap-1">
            {fatias.map((f, i) => (
              <li
                key={f.categoria}
                tabIndex={0}
                className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-elo-blue"
                style={{ backgroundColor: hover === i ? 'var(--surface-hover)' : 'transparent' }}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: f.cor }} />
                  <span className="truncate font-medium text-ink-primary">{f.categoria}</span>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-xs tabular-nums">
                  <span className="text-ink-muted">{formatBRL(f.valor)}</span>
                  <span className="w-10 text-right font-semibold text-ink-secondary">{f.pct.toFixed(0)}%</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
