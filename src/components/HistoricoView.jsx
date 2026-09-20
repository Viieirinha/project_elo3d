import { useEffect, useMemo, useState } from 'react'
import { History, Package, ArrowDownCircle, ArrowUpCircle, ShoppingCart, Search, ImageOff, Trash2 } from 'lucide-react'
import { formatBRL } from '../utils/format.js'
import { getProdutos, getMovimentacoes } from '../utils/estoque.js'
import { getVendas, removerVenda } from '../utils/vendas.js'
import ConfirmDialog from './ui/ConfirmDialog.jsx'

const ABAS = [
  { id: 'produtos', label: 'Produtos cadastrados', icon: Package },
  { id: 'estoque', label: 'Produtos no estoque', icon: History },
  { id: 'vendas', label: 'Vendas', icon: ShoppingCart },
]

function formatData(iso, comHora = true) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(comHora ? { hour: '2-digit', minute: '2-digit' } : {}),
  })
}

function BuscaProduto({ valor, onChange }) {
  return (
    <div className="relative">
      <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
      <input
        type="text"
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Buscar produto..."
        className="rounded-full border border-elo-border bg-surface-subtle py-1.5 pl-8 pr-3 text-xs text-ink-primary placeholder-ink-muted outline-none transition-all focus:border-transparent focus:shadow-[0_0_0_1.5px_rgba(93,95,239,0.9)]"
      />
    </div>
  )
}

export default function HistoricoView() {
  const [aba, setAba] = useState('produtos')
  const [produtos, setProdutos] = useState([])
  const [movimentacoes, setMovimentacoes] = useState([])
  const [vendas, setVendas] = useState([])
  const [busca, setBusca] = useState('')
  const [vendaParaEstornar, setVendaParaEstornar] = useState(null)

  useEffect(() => {
    getProdutos().then(setProdutos)
    getMovimentacoes().then(setMovimentacoes)
    getVendas().then(setVendas)
  }, [])

  useEffect(() => {
    setBusca('')
  }, [aba])

  async function handleConfirmarEstorno() {
    setVendas(await removerVenda(vendaParaEstornar.id))
    getProdutos().then(setProdutos)
    setVendaParaEstornar(null)
  }

  const produtosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    const ordenados = [...produtos].sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm))
    if (!termo) return ordenados
    return ordenados.filter((p) => p.nome.toLowerCase().includes(termo))
  }, [produtos, busca])

  const movimentacoesFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return movimentacoes
    return movimentacoes.filter((m) => m.produtoNome.toLowerCase().includes(termo))
  }, [movimentacoes, busca])

  const vendasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return vendas
    return vendas.filter((v) => v.produtoNome.toLowerCase().includes(termo))
  }, [vendas, busca])

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="font-display text-xl font-bold text-ink-primary sm:text-2xl">Histórico</h1>
        <p className="mt-1 text-sm text-ink-muted">Todo o histórico do sistema, separado por categoria.</p>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-1.5 rounded-full border border-elo-border bg-surface-subtle p-1 w-fit">
        {ABAS.map((a) => {
          const Icon = a.icon
          const isActive = aba === a.id
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => setAba(a.id)}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-150 ${
                isActive ? 'bg-elo-gradient text-white shadow-md' : 'text-ink-secondary hover:text-ink-primary'
              }`}
            >
              <Icon size={13} />
              {a.label}
            </button>
          )
        })}
      </div>

      <section className="rounded-2xl border border-elo-border bg-elo-card/80 p-5 shadow-lg shadow-black/20 sm:p-6">
        <div className="mb-4 flex items-center justify-end">
          <BuscaProduto valor={busca} onChange={setBusca} />
        </div>

        {aba === 'produtos' &&
          (produtosFiltrados.length === 0 ? (
            <p className="text-sm text-ink-muted">Nenhum produto encontrado.</p>
          ) : (
            <div className="flex flex-col divide-y divide-elo-border/60">
              {produtosFiltrados.map((p) => (
                <div key={p.id} className="flex items-center gap-3 py-3 text-sm">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-elo-border bg-surface-subtle">
                    {p.foto ? (
                      <img src={p.foto} alt={p.nome} className="h-full w-full object-cover" />
                    ) : (
                      <ImageOff size={16} className="text-ink-muted" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium text-ink-primary">{p.nome}</p>
                      {p.categoria && (
                        <span className="shrink-0 rounded-full bg-surface-subtle px-2 py-0.5 text-[11px] font-medium text-ink-secondary">
                          {p.categoria}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-ink-muted">Cadastrado em {formatData(p.criadoEm)}</p>
                  </div>
                  <div className="shrink-0 text-right text-xs text-ink-secondary">
                    <p>Custo: {formatBRL(p.custoUnitario)}</p>
                    <p>Venda: {formatBRL(p.precoVenda)}</p>
                  </div>
                </div>
              ))}
            </div>
          ))}

        {aba === 'estoque' &&
          (movimentacoesFiltradas.length === 0 ? (
            <p className="text-sm text-ink-muted">Nenhuma movimentação encontrada.</p>
          ) : (
            <div className="flex max-h-[32rem] flex-col divide-y divide-elo-border/60 overflow-y-auto">
              {movimentacoesFiltradas.map((mov) => (
                <div key={mov.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {mov.tipo === 'entrada' ? (
                      <ArrowDownCircle size={16} className="shrink-0 text-elo-green" />
                    ) : (
                      <ArrowUpCircle size={16} className="shrink-0 text-elo-pink" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink-primary">{mov.produtoNome}</p>
                      <p className="truncate text-xs text-ink-muted">{mov.motivo}</p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`font-semibold ${mov.tipo === 'entrada' ? 'text-elo-green' : 'text-elo-pink'}`}>
                      {mov.tipo === 'entrada' ? '+' : '-'}
                      {mov.quantidade}
                    </p>
                    <p className="text-xs text-ink-muted">{formatData(mov.criadoEm)}</p>
                  </div>
                </div>
              ))}
            </div>
          ))}

        {aba === 'vendas' &&
          (vendasFiltradas.length === 0 ? (
            <p className="text-sm text-ink-muted">Nenhuma venda encontrada.</p>
          ) : (
            <div className="flex max-h-[32rem] flex-col divide-y divide-elo-border/60 overflow-y-auto">
              {vendasFiltradas.map((v) => (
                <div key={v.id} className="group flex items-center justify-between gap-3 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink-primary">
                      {v.quantidade}x {v.produtoNome}
                    </p>
                    <p className="text-xs text-ink-muted">{formatData(v.criadoEm)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <div className="text-right">
                      <p className="font-semibold text-ink-primary">{formatBRL(v.valorTotal)}</p>
                      <p className="text-xs text-elo-green">+{formatBRL(v.lucro)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setVendaParaEstornar(v)}
                      className="rounded-full p-1.5 text-ink-muted opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                      title="Estornar venda"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
      </section>

      <ConfirmDialog
        open={Boolean(vendaParaEstornar)}
        title="Estornar venda?"
        message={`A venda de ${vendaParaEstornar?.quantidade}x "${vendaParaEstornar?.produtoNome}" será removida do histórico e a quantidade voltará ao estoque.`}
        confirmLabel="Estornar"
        onConfirm={handleConfirmarEstorno}
        onCancel={() => setVendaParaEstornar(null)}
      />
    </div>
  )
}
