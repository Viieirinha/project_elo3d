import { useMemo, useState } from 'react'
import { BarChart3, Trophy, PieChart, DollarSign, TrendingUp, Package, Percent } from 'lucide-react'
import { formatBRL, formatNumber } from '../utils/format.js'
import { getProdutos } from '../utils/estoque.js'
import { getVendas } from '../utils/vendas.js'
import { getCategorias } from '../utils/categorias.js'
import { useCarregar } from '../utils/useCarregar.js'
import SalesChart from './SalesChart.jsx'
import CategoryDonutChart from './CategoryDonutChart.jsx'
import PageHeader from './ui/PageHeader.jsx'
import Segmented from './ui/Segmented.jsx'
import StatCard from './ui/StatCard.jsx'
import EmptyState, { ErroCarregamento } from './ui/EmptyState.jsx'
import Skeleton from './ui/Skeleton.jsx'
import { Select } from './ui/Field.jsx'

const PERIODOS = [
  { valor: 'tudo', rotulo: 'Tudo' },
  { valor: 'hoje', rotulo: 'Hoje' },
  { valor: '7d', rotulo: '7 dias' },
  { valor: '30d', rotulo: '30 dias' },
  { valor: 'mes', rotulo: 'Este mês' },
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
  if (periodo === 'mes') return data >= new Date(agora.getFullYear(), agora.getMonth(), 1)
  return true
}

export default function DashboardView() {
  const produtosReq = useCarregar(() => getProdutos({ comFoto: false }))
  const vendasReq = useCarregar(getVendas)
  const categoriasReq = useCarregar(getCategorias)
  const [periodo, setPeriodo] = useState('tudo')
  const [categoriaFiltro, setCategoriaFiltro] = useState('')

  const produtos = useMemo(() => produtosReq.dados ?? [], [produtosReq.dados])
  const vendas = useMemo(() => vendasReq.dados ?? [], [vendasReq.dados])
  const categorias = categoriasReq.dados ?? []

  const categoriaPorProduto = useMemo(() => new Map(produtos.map((p) => [p.id, p.categoria?.trim() || 'Sem categoria'])), [produtos])

  const vendasFiltradas = useMemo(
    () =>
      vendas.filter((v) => {
        if (!dentroDoPeriodo(v.criadoEm, periodo)) return false
        if (categoriaFiltro && categoriaPorProduto.get(v.produtoId) !== categoriaFiltro) return false
        return true
      }),
    [vendas, periodo, categoriaFiltro, categoriaPorProduto]
  )

  const produtosFiltrados = useMemo(
    () => (categoriaFiltro ? produtos.filter((p) => (p.categoria?.trim() || 'Sem categoria') === categoriaFiltro) : produtos),
    [produtos, categoriaFiltro]
  )

  const totais = useMemo(
    () => vendasFiltradas.reduce((acc, v) => ({ faturamento: acc.faturamento + v.valorTotal, lucro: acc.lucro + v.lucro }), { faturamento: 0, lucro: 0 }),
    [vendasFiltradas]
  )
  const margemMedia = totais.faturamento > 0 ? (totais.lucro / totais.faturamento) * 100 : null
  const totalUnidadesEstoque = useMemo(() => produtosFiltrados.reduce((acc, p) => acc + p.quantidade, 0), [produtosFiltrados])

  const maisVendidos = useMemo(() => {
    const mapa = new Map()
    for (const v of vendasFiltradas) {
      const atual = mapa.get(v.produtoNome) ?? { nome: v.produtoNome, unidades: 0, faturamento: 0 }
      atual.unidades += v.quantidade
      atual.faturamento += v.valorTotal
      mapa.set(v.produtoNome, atual)
    }
    return Array.from(mapa.values()).sort((a, b) => b.unidades - a.unidades).slice(0, 8)
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
  const carregando = (vendasReq.carregando && !vendasReq.dados) || (produtosReq.carregando && !produtosReq.dados)
  const erro = (vendasReq.erro && !vendasReq.dados) || (produtosReq.erro && !produtosReq.dados)

  return (
    <div className="animate-fade-in">
      <PageHeader
        titulo="Dashboard"
        subtitulo="Visão geral do seu negócio."
        acoes={
          <>
            <Segmented rotulo="Período" opcoes={PERIODOS} valor={periodo} onChange={setPeriodo} tamanho="sm" />
            <div className="w-48">
              <Select aria-label="Filtrar por categoria" value={categoriaFiltro} onChange={(e) => setCategoriaFiltro(e.target.value)} className="!py-2 !text-[13px]">
                <option value="">Todas as categorias</option>
                {categorias.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                <option value="Sem categoria">Sem categoria</option>
              </Select>
            </div>
          </>
        }
      />

      {erro ? (
        <ErroCarregamento
          erro={vendasReq.erro || produtosReq.erro}
          onTentar={() => {
            vendasReq.recarregar()
            produtosReq.recarregar()
          }}
        />
      ) : carregando ? (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard rotulo="Faturamento" icone={DollarSign} valor={formatBRL(totais.faturamento)} />
            <StatCard rotulo="Lucro" icone={TrendingUp} valor={formatBRL(totais.lucro)} destaque />
            <StatCard rotulo="Margem média" icone={Percent} valor={margemMedia === null ? '—' : `${formatNumber(margemMedia, 1)}%`} detalhe="lucro sobre o faturamento" />
            <StatCard rotulo="Em estoque" icone={Package} valor={`${totalUnidadesEstoque} un.`} detalhe={`${produtosFiltrados.length} produto(s) cadastrado(s)`} />
          </div>

          {vendasFiltradas.length === 0 ? (
            <div className="mt-6">
              <EmptyState
                icone={BarChart3}
                titulo={vendas.length === 0 ? 'Ainda sem vendas' : 'Nenhuma venda nesse filtro'}
                texto={vendas.length === 0 ? 'Registre vendas para ver os gráficos aqui.' : 'Tente outro período ou categoria.'}
              />
            </div>
          ) : (
            <div className="mt-6 flex flex-col gap-6">
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <SalesChart vendas={vendasFiltradas} />
                <SalesChart vendas={vendasFiltradas} campo="lucro" titulo="Lucro por período" />
              </div>

              <CategoryDonutChart vendas={vendasFiltradas} produtos={produtos} />

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <section className="card p-5 sm:p-6">
                  <div className="mb-4 flex items-center gap-2.5">
                    <Trophy size={16} className="text-elo-yellow" />
                    <h2 className="font-display text-[15px] font-semibold text-ink-primary">Produtos mais vendidos</h2>
                  </div>
                  <ol className="flex flex-col gap-3.5">
                    {maisVendidos.map((p, i) => (
                      <li key={p.nome} className="flex items-center gap-3">
                        <span className="w-4 shrink-0 text-xs font-semibold tabular-nums text-ink-muted">{i + 1}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm font-medium text-ink-primary">{p.nome}</span>
                            <span className="shrink-0 text-xs font-semibold tabular-nums text-ink-secondary">{p.unidades} un.</span>
                          </div>
                          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-hover">
                            <div className="h-full rounded-full bg-elo-brand" style={{ width: `${(p.unidades / maxUnidades) * 100}%` }} />
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>

                <section className="card p-5 sm:p-6">
                  <div className="mb-4 flex items-center gap-2.5">
                    <PieChart size={16} className="text-elo-green" />
                    <h2 className="font-display text-[15px] font-semibold text-ink-primary">Margem por categoria</h2>
                  </div>
                  <ul className="flex flex-col divide-y divide-elo-border">
                    {margemPorCategoria.map((c) => (
                      <li key={c.categoria} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                        <span className="truncate font-medium text-ink-primary">{c.categoria}</span>
                        <div className="flex shrink-0 items-center gap-4 text-xs tabular-nums">
                          <span className="text-ink-muted">{formatBRL(c.faturamento)}</span>
                          <span className={`w-12 text-right font-semibold ${c.margem < 0 ? 'text-red-400' : 'text-elo-green'}`}>{formatNumber(c.margem, 0)}%</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
