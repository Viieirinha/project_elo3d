import { useMemo, useState } from 'react'
import { ShoppingCart, ReceiptText, Trash2, DollarSign, TrendingUp, Hash } from 'lucide-react'
import { formatBRL, formatNumber, parseLocaleNumber } from '../utils/format.js'
import { getProdutos } from '../utils/estoque.js'
import { getVendas, registrarVenda, removerVenda } from '../utils/vendas.js'
import { useCarregar } from '../utils/useCarregar.js'
import SalesChart from './SalesChart.jsx'
import ConfirmDialog from './ui/ConfirmDialog.jsx'
import PageHeader from './ui/PageHeader.jsx'
import StatCard from './ui/StatCard.jsx'
import Button, { IconButton } from './ui/Button.jsx'
import EmptyState, { ErroCarregamento } from './ui/EmptyState.jsx'
import Skeleton from './ui/Skeleton.jsx'
import { Campo, Input, Select } from './ui/Field.jsx'
import { useToast } from './ui/Toast.jsx'

function formatData(iso) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function VendasView() {
  const toast = useToast()
  const produtosReq = useCarregar(() => getProdutos({ comFoto: false }))
  const vendasReq = useCarregar(getVendas)
  const [produtoId, setProdutoId] = useState('')
  const [quantidade, setQuantidade] = useState('1')
  const [valorUnitario, setValorUnitario] = useState('')
  const [registrando, setRegistrando] = useState(false)
  const [vendaParaExcluir, setVendaParaExcluir] = useState(null)

  const produtos = produtosReq.dados ?? []
  const vendas = vendasReq.dados ?? []
  const produtosComEstoque = produtos.filter((p) => p.quantidade > 0)
  const produtoSelecionado = produtos.find((p) => p.id === produtoId)

  function selecionarProduto(id) {
    setProdutoId(id)
    const produto = produtos.find((p) => p.id === id)
    setValorUnitario(produto ? formatNumber(produto.precoVenda, 2) : '')
  }

  const quantidadeNumero = parseInt(quantidade, 10)
  const valorNumero = parseLocaleNumber(valorUnitario)
  const valorPreenchido = valorUnitario.trim() !== ''
  const excedeEstoque = produtoSelecionado && quantidadeNumero > produtoSelecionado.quantidade
  const podeVender = produtoSelecionado && quantidadeNumero > 0 && valorPreenchido && valorNumero >= 0 && !excedeEstoque

  const faturamentoPrevisto = quantidadeNumero * valorNumero
  const lucroPrevisto = produtoSelecionado ? faturamentoPrevisto - quantidadeNumero * (produtoSelecionado.custoUnitario ?? 0) : 0

  async function handleSubmit(e) {
    e.preventDefault()
    if (!podeVender || registrando) return
    setRegistrando(true)
    try {
      vendasReq.setDados(await registrarVenda({ produtoId, quantidade: quantidadeNumero, valorUnitario: valorNumero }))
      produtosReq.recarregar() // o estoque mudou: evita vender acima do que existe
      toast.sucesso(`Venda de ${quantidadeNumero}× ${produtoSelecionado.nome} registrada.`)
      setProdutoId('')
      setQuantidade('1')
      setValorUnitario('')
    } catch (err) {
      toast.erro(err.message || 'Não foi possível registrar a venda.')
    } finally {
      setRegistrando(false)
    }
  }

  async function handleExcluir() {
    try {
      vendasReq.setDados(await removerVenda(vendaParaExcluir.id))
      produtosReq.recarregar()
      toast.sucesso('Venda excluída e estoque devolvido.')
      setVendaParaExcluir(null)
    } catch (err) {
      toast.erro(err.message || 'Não foi possível excluir a venda.')
    }
  }

  const totais = useMemo(
    () => vendas.reduce((acc, v) => ({ faturamento: acc.faturamento + v.valorTotal, lucro: acc.lucro + v.lucro }), { faturamento: 0, lucro: 0 }),
    [vendas]
  )

  const porProduto = useMemo(() => {
    const mapa = new Map()
    for (const v of vendas) {
      const atual = mapa.get(v.produtoNome) ?? { nome: v.produtoNome, unidades: 0, faturamento: 0, lucro: 0 }
      atual.unidades += v.quantidade
      atual.faturamento += v.valorTotal
      atual.lucro += v.lucro
      mapa.set(v.produtoNome, atual)
    }
    return Array.from(mapa.values()).sort((a, b) => b.faturamento - a.faturamento)
  }, [vendas])

  const carregandoTudo = (produtosReq.carregando && !produtosReq.dados) || (vendasReq.carregando && !vendasReq.dados)
  const erro = (produtosReq.erro && !produtosReq.dados) || (vendasReq.erro && !vendasReq.dados)

  return (
    <div className="animate-fade-in">
      <PageHeader titulo="Vendas" subtitulo="Registre vendas e acompanhe faturamento e lucro." />

      {erro ? (
        <ErroCarregamento
          erro={produtosReq.erro || vendasReq.erro}
          onTentar={() => {
            produtosReq.recarregar()
            vendasReq.recarregar()
          }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <section className="card h-fit p-5 sm:p-6 xl:sticky xl:top-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-elo-blue/10 text-elo-blue">
                <ShoppingCart size={18} />
              </span>
              <h2 className="font-display text-[15px] font-semibold text-ink-primary">Registrar venda</h2>
            </div>

            {carregandoTudo ? (
              <Skeleton className="h-64" />
            ) : produtosComEstoque.length === 0 ? (
              <p className="text-sm text-ink-muted">Nenhum produto com estoque disponível. Registre ou reabasteça produtos primeiro.</p>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <Campo rotulo="Produto">
                  <Select value={produtoId} onChange={(e) => selecionarProduto(e.target.value)}>
                    <option value="" disabled>
                      Selecione um produto
                    </option>
                    {produtosComEstoque.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome} ({p.quantidade} em estoque)
                      </option>
                    ))}
                  </Select>
                </Campo>

                <div className="grid grid-cols-2 gap-3">
                  <Campo rotulo="Quantidade" erro={excedeEstoque ? 'Maior que o estoque.' : undefined}>
                    <Input inputMode="numeric" value={quantidade} onChange={(e) => setQuantidade(e.target.value.replace(/[^0-9]/g, ''))} />
                  </Campo>
                  <Campo rotulo="Valor unitário">
                    <Input prefixo="R$" inputMode="decimal" value={valorUnitario} onChange={(e) => setValorUnitario(e.target.value)} placeholder="0,00" />
                  </Campo>
                </div>

                {produtoSelecionado && quantidadeNumero > 0 && valorPreenchido && (
                  <div className="rounded-xl bg-surface-hover px-4 py-3 text-xs text-ink-secondary">
                    <div className="flex justify-between">
                      <span>Faturamento</span>
                      <span className="font-semibold tabular-nums text-ink-primary">{formatBRL(faturamentoPrevisto)}</span>
                    </div>
                    <div className="mt-1.5 flex justify-between">
                      <span>Lucro estimado</span>
                      <span className={`font-semibold tabular-nums ${lucroPrevisto < 0 ? 'text-red-400' : 'text-elo-green'}`}>{formatBRL(lucroPrevisto)}</span>
                    </div>
                  </div>
                )}

                <Button type="submit" variante="primary" tamanho="lg" bloco icone={ReceiptText} carregando={registrando} disabled={!podeVender}>
                  Registrar venda
                </Button>
              </form>
            )}
          </section>

          <div className="flex min-w-0 flex-col gap-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCard rotulo="Faturamento" icone={DollarSign} valor={formatBRL(totais.faturamento)} />
              <StatCard rotulo="Lucro" icone={TrendingUp} valor={formatBRL(totais.lucro)} destaque />
              <StatCard rotulo="Vendas" icone={Hash} valor={vendas.length} detalhe="registradas no total" />
            </div>

            <SalesChart vendas={vendas} />

            {porProduto.length > 0 && (
              <section className="card p-5 sm:p-6">
                <h2 className="mb-3 font-display text-[15px] font-semibold text-ink-primary">Por produto</h2>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[420px] text-sm">
                    <thead>
                      <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                        <th className="pb-2 font-semibold">Produto</th>
                        <th className="pb-2 text-right font-semibold">Qtd.</th>
                        <th className="pb-2 text-right font-semibold">Valor total</th>
                        <th className="pb-2 text-right font-semibold">Lucro</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-elo-border">
                      {porProduto.map((p) => (
                        <tr key={p.nome}>
                          <td className="py-2.5 pr-3 font-medium text-ink-primary">{p.nome}</td>
                          <td className="py-2.5 text-right tabular-nums text-ink-secondary">{p.unidades} un.</td>
                          <td className="py-2.5 text-right tabular-nums text-ink-secondary">{formatBRL(p.faturamento)}</td>
                          <td className="py-2.5 text-right font-semibold tabular-nums text-elo-green">{formatBRL(p.lucro)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            <section className="card p-5 sm:p-6">
              <h2 className="mb-3 font-display text-[15px] font-semibold text-ink-primary">Histórico de vendas</h2>
              {carregandoTudo ? (
                <Skeleton className="h-32" />
              ) : vendas.length === 0 ? (
                <EmptyState icone={ReceiptText} titulo="Nenhuma venda ainda" texto="As vendas registradas aparecem aqui." />
              ) : (
                <ul className="flex max-h-[28rem] flex-col divide-y divide-elo-border overflow-y-auto">
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
                        <IconButton icone={Trash2} rotulo={`Excluir venda de ${v.produtoNome}`} tamanho="sm" variante="danger" onClick={() => setVendaParaExcluir(v)} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(vendaParaExcluir)}
        title="Excluir venda?"
        message={`A venda de ${vendaParaExcluir?.quantidade}× "${vendaParaExcluir?.produtoNome}" será removida e a quantidade voltará ao estoque. Essa ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        onConfirm={handleExcluir}
        onCancel={() => setVendaParaExcluir(null)}
      />
    </div>
  )
}
