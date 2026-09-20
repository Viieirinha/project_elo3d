import { useEffect, useMemo, useState } from 'react'
import { BarChart3, Trophy, PieChart, DollarSign, TrendingUp, Package, Filter } from 'lucide-react'
import { formatBRL } from '../utils/format.js'
import { getProdutos } from '../utils/estoque.js'
import { getVendas } from '../utils/vendas.js'
import { getCategorias } from '../utils/categorias.js'
import SalesChart from './SalesChart.jsx'
import CategoryDonutChart from './CategoryDonutChart.jsx'

const PERIODOS = [
  { id: 'tudo', label: 'Tudo' },
  { id: 'hoje', label: 'Hoje' },
  { id: '7d', label: '7 dias' },
  { id: '30d', label: '30 dias' },
  { id: 'mes', label: 'Este mês' },
]

function dentroDoPeriodo(dataISO, periodo) {
  if (periodo === 'tudo') return true
  const data = new Date(dataISO)
  const agora = new Date()
  const inicioHoje = new Date(agora)
  inicioHoje.setHours(0, 0, 0, 0)

  if (periodo === 'hoje') return data >= inicioHoje
  if (periodo === '7d') {
    const limite = new Date(inicioHoje)
    limite.setDate(limite.getDate() - 6)
    return data >= limite
  }
  if (periodo === '30d') {
    const limite = new Date(inicioHoje)
    limite.setDate(limite.getDate() - 29)
    return data >= limite
  }
  if (periodo === 'mes') {
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1)
    return data >= inicioMes
  }
  return true
}

export default function DashboardView() {
  const [produtos, setProdutos] = useState([])
  const [vendas, setVendas] = useState([])
  const [categorias, setCategorias] = useState([])
  const [periodo, setPeriodo] = useState('tudo')
  const [categoriaFiltro, setCategoriaFiltro] = useState('')

  useEffect(() => {
    getProdutos().then(setProdutos)
    getVendas().then(setVendas)
    getCategorias().then(setCategorias)
  }, [])

  const categoriaPorProduto = useMemo(
    () => new Map(produtos.map((p) => [p.id, p.categoria?.trim() || 'Sem categoria'])),
    [produtos]
  )

  const vendasFiltradas = useMemo(() => {
    return vendas.filter((v) => {
      if (!dentroDoPeriodo(v.criadoEm, periodo)) return false
      if (categoriaFiltro && categoriaPorProduto.get(v.produtoId) !== categoriaFiltro) return false
      return true
    })
  }, [vendas, periodo, categoriaFiltro, categoriaPorProduto])

  const produtosFiltrados = useMemo(() => {
    if (!categoriaFiltro) return produtos
    return produtos.filter((p) => (p.categoria?.trim() || 'Sem categoria') === categoriaFiltro)
  }, [produtos, categoriaFiltro])

  const totais = useMemo(() => {
    return vendasFiltradas.reduce(
      (acc, v) => ({
        faturamento: acc.faturamento + v.valorTotal,
        lucro: acc.lucro + v.lucro,
      }),
      { faturamento: 0, lucro: 0 }
    )
  }, [vendasFiltradas])

  const totalUnidadesEstoque = useMemo(
    () => produtosFiltrados.reduce((acc, p) => acc + p.quantidade, 0),
    [produtosFiltrados]
  )

  const maisVendidos = useMemo(() => {
    const mapa = new Map()
    for (const v of vendasFiltradas) {
      const atual = mapa.get(v.produtoNome) ?? { nome: v.produtoNome, unidades: 0, faturamento: 0 }
      atual.unidades += v.quantidade
      atual.faturamento += v.valorTotal
      mapa.set(v.produtoNome, atual)
    }
    return Array.from(mapa.values())
      .sort((a, b) => b.unidades - a.unidades)
      .slice(0, 8)
  }, [vendasFiltradas])

  const margemPorCategoria = useMemo(() => {
    const mapa = new Map()
    for (const v of vendasFiltradas) {
      const categoria = categoriaPorProduto.get(v.produtoId) ?? 'Sem categoria'
      const atual = mapa.get(categoria) ?? { categoria, faturamento: 0, lucro: 0 }
      atual.faturamento += v.valorTotal
      atual.lucro += v.lucro
      mapa.set(categoria, atual)
    }
    return Array.from(mapa.values())
      .map((c) => ({ ...c, margem: c.faturamento > 0 ? (c.lucro / c.faturamento) * 100 : 0 }))
      .sort((a, b) => b.faturamento - a.faturamento)
  }, [vendasFiltradas, categoriaPorProduto])

  const maxUnidades = Math.max(1, ...maisVendidos.map((p) => p.unidades))

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-bold text-ink-primary sm:text-2xl">Dashboard</h1>
          <p className="mt-1 text-sm text-ink-muted">Visão geral do seu negócio.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-full border border-elo-border bg-surface-subtle p-1">
            {PERIODOS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriodo(p.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-150 ${
                  periodo === p.id ? 'bg-elo-gradient text-white shadow-md' : 'text-ink-secondary hover:text-ink-primary'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 rounded-full border border-elo-border bg-surface-subtle px-1 py-1">
            <Filter size={13} className="ml-2 shrink-0 text-ink-muted" />
            <select
              value={categoriaFiltro}
              onChange={(e) => setCategoriaFiltro(e.target.value)}
              className="rounded-full bg-transparent py-1 pr-2 text-xs font-medium text-ink-primary outline-none"
            >
              <option value="">Todas as categorias</option>
              {categorias.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value="Sem categoria">Sem categoria</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-elo-border bg-elo-card/80 p-5 shadow-lg shadow-black/20">
          <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-muted">
            <DollarSign size={13} /> Faturamento
          </span>
          <p className="mt-2 font-display text-2xl font-bold text-ink-primary">{formatBRL(totais.faturamento)}</p>
        </div>
        <div className="rounded-2xl border border-elo-border bg-elo-card/80 p-5 shadow-lg shadow-black/20">
          <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-muted">
            <TrendingUp size={13} /> Lucro
          </span>
          <p className="mt-2 font-display text-2xl font-bold gradient-text">{formatBRL(totais.lucro)}</p>
        </div>
        <div className="rounded-2xl border border-elo-border bg-elo-card/80 p-5 shadow-lg shadow-black/20">
          <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-muted">
            <Package size={13} /> Em estoque
          </span>
          <p className="mt-2 font-display text-2xl font-bold text-ink-primary">
            {totalUnidadesEstoque} <span className="text-sm font-medium text-ink-muted">un.</span>
          </p>
          <p className="text-xs text-ink-muted">{produtosFiltrados.length} produto(s) cadastrado(s)</p>
        </div>
      </div>

      {vendasFiltradas.length === 0 ? (
        <div className="mt-6 flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-elo-border bg-elo-card/60 px-6 py-16 text-center">
          <BarChart3 size={32} className="text-ink-muted" />
          <p className="text-sm text-ink-muted">
            {vendas.length === 0
              ? 'Registre vendas para ver os gráficos aqui.'
              : 'Nenhuma venda encontrada para esse filtro.'}
          </p>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <SalesChart vendas={vendasFiltradas} />
            <SalesChart vendas={vendasFiltradas} campo="lucro" titulo="Lucro por período" />
          </div>

          <CategoryDonutChart vendas={vendasFiltradas} produtos={produtos} />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-elo-border bg-elo-card/80 p-5 shadow-lg shadow-black/20 sm:p-6">
              <div className="mb-4 flex items-center gap-2">
                <Trophy size={16} className="text-elo-yellow" />
                <h2 className="font-display text-[15px] font-semibold text-ink-primary">Produtos mais vendidos</h2>
              </div>
              <div className="flex flex-col gap-3">
                {maisVendidos.map((p, i) => (
                  <div key={p.nome} className="flex items-center gap-3">
                    <span className="w-4 shrink-0 text-xs font-semibold text-ink-muted">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium text-ink-primary">{p.nome}</span>
                        <span className="shrink-0 text-xs font-semibold text-ink-secondary">{p.unidades} un.</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-subtle">
                        <div
                          className="h-full rounded-full bg-elo-gradient"
                          style={{ width: `${(p.unidades / maxUnidades) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-elo-border bg-elo-card/80 p-5 shadow-lg shadow-black/20 sm:p-6">
              <div className="mb-4 flex items-center gap-2">
                <PieChart size={16} className="text-elo-green" />
                <h2 className="font-display text-[15px] font-semibold text-ink-primary">Margem média por categoria</h2>
              </div>
              <div className="flex flex-col divide-y divide-elo-border/60">
                {margemPorCategoria.map((c) => (
                  <div key={c.categoria} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                    <span className="font-medium text-ink-primary">{c.categoria}</span>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-ink-muted">{formatBRL(c.faturamento)}</span>
                      <span className="w-14 text-right font-semibold text-elo-green">{c.margem.toFixed(0)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  )
}
