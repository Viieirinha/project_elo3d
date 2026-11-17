import { useMemo, useState } from 'react'
import { Package, ArrowDownCircle, ArrowUpCircle, ShoppingCart, Search, ImageOff, Trash2, ArrowLeftRight } from 'lucide-react'
import { formatBRL } from '../utils/format.js'
import { getProdutos, getMovimentacoes } from '../utils/estoque.js'
import { getVendas, removerVenda } from '../utils/vendas.js'
import { useCarregar } from '../utils/useCarregar.js'
import ConfirmDialog from './ui/ConfirmDialog.jsx'
import PageHeader from './ui/PageHeader.jsx'
import Segmented from './ui/Segmented.jsx'
import Badge from './ui/Badge.jsx'
import EmptyState, { ErroCarregamento } from './ui/EmptyState.jsx'
import Skeleton from './ui/Skeleton.jsx'
import { Input } from './ui/Field.jsx'
import { IconButton } from './ui/Button.jsx'
import { useToast } from './ui/Toast.jsx'

const ABAS = [
  { valor: 'produtos', rotulo: 'Produtos', icone: Package },
  { valor: 'estoque', rotulo: 'Movimentações', icone: ArrowLeftRight },
  { valor: 'vendas', rotulo: 'Vendas', icone: ShoppingCart },
]

function formatData(iso) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function HistoricoView() {
  const toast = useToast()
  const produtosReq = useCarregar(() => getProdutos())
  const movimentacoesReq = useCarregar(getMovimentacoes)
  const vendasReq = useCarregar(getVendas)
  const [aba, setAba] = useState('produtos')
  const [busca, setBusca] = useState('')
  const [vendaParaEstornar, setVendaParaEstornar] = useState(null)

  const termo = busca.trim().toLowerCase()
  const filtrar = (lista, campo) => (termo ? (lista ?? []).filter((x) => x[campo].toLowerCase().includes(termo)) : (lista ?? []))

  const produtos = useMemo(
    () => filtrar([...(produtosReq.dados ?? [])].sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm)), 'nome'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [produtosReq.dados, termo]
  )
  const movimentacoes = filtrar(movimentacoesReq.dados, 'produtoNome')
  const vendas = filtrar(vendasReq.dados, 'produtoNome')

  const requisicao = { produtos: produtosReq, estoque: movimentacoesReq, vendas: vendasReq }[aba === 'estoque' ? 'estoque' : aba]

  async function handleEstornar() {
    try {
      vendasReq.setDados(await removerVenda(vendaParaEstornar.id))
      produtosReq.recarregar()
      movimentacoesReq.recarregar()
      toast.sucesso('Venda estornada e estoque devolvido.')
      setVendaParaEstornar(null)
    } catch (e) {
      toast.erro(e.message || 'Não foi possível estornar a venda.')
    }
  }

  const vazio = (texto) => <EmptyState icone={Search} titulo="Nada encontrado" texto={texto} />

  return (
    <div className="animate-fade-in">
      <PageHeader titulo="Histórico" subtitulo="Tudo o que aconteceu no sistema, por categoria." />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Segmented rotulo="Tipo de histórico" opcoes={ABAS} valor={aba} onChange={(v) => { setAba(v); setBusca('') }} />
        <div className="relative w-full sm:w-64">
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
          <Input aria-label="Buscar produto" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar produto..." className="!pl-10" />
        </div>
      </div>

      <section className="card p-5 sm:p-6">
        {requisicao.carregando && !requisicao.dados ? (
          <div className="flex flex-col gap-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : requisicao.erro && !requisicao.dados ? (
          <ErroCarregamento erro={requisicao.erro} onTentar={requisicao.recarregar} />
        ) : aba === 'produtos' ? (
          produtos.length === 0 ? (
            vazio('Nenhum produto encontrado.')
          ) : (
            <ul className="flex flex-col divide-y divide-elo-border">
              {produtos.map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-elo-border bg-surface-subtle">
                    {p.foto ? <img src={p.foto} alt="" loading="lazy" className="h-full w-full object-cover" /> : <ImageOff size={16} className="text-ink-muted" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-ink-primary">{p.nome}</p>
                      {p.categoria && <Badge>{p.categoria}</Badge>}
                    </div>
                    <p className="text-xs text-ink-muted">Cadastrado em {formatData(p.criadoEm)}</p>
                  </div>
                  <div className="shrink-0 text-right text-xs tabular-nums text-ink-secondary">
                    <p>Custo {formatBRL(p.custoUnitario)}</p>
                    <p className="font-semibold text-ink-primary">Venda {formatBRL(p.precoVenda)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )
        ) : aba === 'estoque' ? (
          movimentacoes.length === 0 ? (
            vazio('Nenhuma movimentação encontrada.')
          ) : (
            <ul className="flex max-h-[34rem] flex-col divide-y divide-elo-border overflow-y-auto">
              {movimentacoes.map((m) => {
                const entrada = m.tipo === 'entrada'
                return (
                  <li key={m.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${entrada ? 'bg-elo-green/12 text-elo-green' : 'bg-elo-pink/12 text-elo-pink'}`}>
                        {entrada ? <ArrowDownCircle size={17} /> : <ArrowUpCircle size={17} />}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink-primary">{m.produtoNome}</p>
                        <p className="truncate text-xs text-ink-muted">
                          {m.motivo}
                          {m.registradoPor && ` · ${m.registradoPor}`}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={`text-sm font-semibold tabular-nums ${entrada ? 'text-elo-green' : 'text-elo-pink'}`}>
                        {entrada ? '+' : '−'}
                        {m.quantidade}
                      </p>
                      <p className="text-xs text-ink-muted">{formatData(m.criadoEm)}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )
        ) : vendas.length === 0 ? (
          vazio('Nenhuma venda encontrada.')
        ) : (
          <ul className="flex max-h-[34rem] flex-col divide-y divide-elo-border overflow-y-auto">
            {vendas.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink-primary">
                    {v.quantidade}× {v.produtoNome}
                  </p>
                  <p className="text-xs text-ink-muted">{formatData(v.criadoEm)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums text-ink-primary">{formatBRL(v.valorTotal)}</p>
                    <p className={`text-xs tabular-nums ${v.lucro < 0 ? 'text-red-400' : 'text-elo-green'}`}>
                      {v.lucro < 0 ? '' : '+'}
                      {formatBRL(v.lucro)}
                    </p>
                  </div>
                  <IconButton icone={Trash2} rotulo={`Estornar venda de ${v.produtoNome}`} tamanho="sm" variante="danger" onClick={() => setVendaParaEstornar(v)} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={Boolean(vendaParaEstornar)}
        title="Estornar venda?"
        message={`A venda de ${vendaParaEstornar?.quantidade}× "${vendaParaEstornar?.produtoNome}" será removida do histórico e a quantidade voltará ao estoque.`}
        confirmLabel="Estornar"
        onConfirm={handleEstornar}
        onCancel={() => setVendaParaEstornar(null)}
      />
    </div>
  )
}
