import { useEffect, useMemo, useState } from 'react'
import { ShoppingCart, ReceiptText, Trash2 } from 'lucide-react'
import { formatBRL } from '../utils/format.js'
import { getProdutos } from '../utils/estoque.js'
import { getVendas, registrarVenda, removerVenda } from '../utils/vendas.js'
import SalesChart from './SalesChart.jsx'
import ConfirmDialog from './ui/ConfirmDialog.jsx'

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
  const [produtos, setProdutos] = useState([])
  const [vendas, setVendas] = useState([])

  const [produtoId, setProdutoId] = useState('')
  const [quantidade, setQuantidade] = useState('1')
  const [valorUnitario, setValorUnitario] = useState('')
  const [vendaParaExcluir, setVendaParaExcluir] = useState(null)

  useEffect(() => {
    getProdutos().then(setProdutos)
    getVendas().then(setVendas)
  }, [])

  const produtoSelecionado = produtos.find((p) => p.id === produtoId)
  const produtosComEstoque = produtos.filter((p) => p.quantidade > 0)

  function handleSelecionarProduto(id) {
    setProdutoId(id)
    const produto = produtos.find((p) => p.id === id)
    setValorUnitario(produto ? String(produto.precoVenda.toFixed(2)).replace('.', ',') : '')
  }

  const quantidadeNumero = parseInt(quantidade, 10)
  const valorNumero = parseFloat(String(valorUnitario).replace(',', '.'))
  const excedeEstoque = produtoSelecionado && quantidadeNumero > produtoSelecionado.quantidade
  const podeVender =
    produtoSelecionado && quantidadeNumero > 0 && valorNumero >= 0 && !excedeEstoque && !isNaN(valorNumero)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!podeVender) return
    const novasVendas = await registrarVenda({
      produtoId,
      quantidade: quantidadeNumero,
      valorUnitario: valorNumero,
    })
    setVendas(novasVendas)
    getProdutos().then(setProdutos)
    setProdutoId('')
    setQuantidade('1')
    setValorUnitario('')
  }

  async function handleConfirmarExclusao() {
    setVendas(await removerVenda(vendaParaExcluir.id))
    getProdutos().then(setProdutos)
    setVendaParaExcluir(null)
  }

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

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="font-display text-xl font-bold text-ink-primary sm:text-2xl">Vendas</h1>
        <p className="mt-1 text-sm text-ink-muted">Registre vendas e acompanhe faturamento e lucro.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
        <section className="h-fit rounded-2xl border border-elo-border bg-elo-card/80 p-5 shadow-lg shadow-black/20 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-elo-gradient shadow-md">
              <ShoppingCart size={19} className="text-white" />
            </div>
            <h2 className="font-display text-[15px] font-semibold text-ink-primary">Registrar venda</h2>
          </div>

          {produtosComEstoque.length === 0 ? (
            <p className="text-sm text-ink-muted">
              Nenhum produto com estoque disponível. Registre ou reabasteça produtos primeiro.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-[13px] font-medium text-ink-secondary">Produto</span>
                <select
                  value={produtoId}
                  onChange={(e) => handleSelecionarProduto(e.target.value)}
                  className="rounded-xl border border-elo-border bg-surface-subtle px-3 py-2.5 text-[15px] font-medium text-ink-primary outline-none transition-all focus:border-transparent focus:shadow-[0_0_0_1.5px_rgba(93,95,239,0.9)] focus:ring-2 focus:ring-[#5D5FEF]/25"
                >
                  <option value="" disabled>
                    Selecione um produto
                  </option>
                  {produtosComEstoque.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome} ({p.quantidade} em estoque)
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-[13px] font-medium text-ink-secondary">Quantidade vendida</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value.replace(/[^0-9]/g, ''))}
                  className="rounded-xl border border-elo-border bg-surface-subtle px-3 py-2.5 text-[15px] font-medium text-ink-primary outline-none transition-all focus:border-transparent focus:shadow-[0_0_0_1.5px_rgba(93,95,239,0.9)] focus:ring-2 focus:ring-[#5D5FEF]/25"
                />
                {excedeEstoque && (
                  <span className="text-xs font-medium text-elo-pink">Quantidade maior que o estoque disponível.</span>
                )}
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-[13px] font-medium text-ink-secondary">Valor unitário de venda</span>
                <div className="flex items-center rounded-xl border border-elo-border bg-surface-subtle focus-within:border-transparent focus-within:shadow-[0_0_0_1.5px_rgba(93,95,239,0.9)] focus-within:ring-2 focus-within:ring-[#5D5FEF]/25">
                  <span className="pl-3 text-sm font-medium text-ink-muted">R$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={valorUnitario}
                    onChange={(e) => setValorUnitario(e.target.value)}
                    placeholder="0,00"
                    className="w-full bg-transparent py-2.5 pl-1.5 pr-3 text-[15px] font-medium text-ink-primary placeholder-ink-muted outline-none"
                  />
                </div>
              </label>

              {produtoSelecionado && quantidadeNumero > 0 && !isNaN(valorNumero) && (
                <div className="rounded-xl bg-surface-hover px-4 py-3 text-xs text-ink-secondary">
                  <div className="flex justify-between">
                    <span>Faturamento</span>
                    <span className="font-semibold text-ink-primary">{formatBRL(quantidadeNumero * valorNumero)}</span>
                  </div>
                  <div className="mt-1 flex justify-between">
                    <span>Lucro estimado</span>
                    <span className="font-semibold text-elo-green">
                      {formatBRL(quantidadeNumero * valorNumero - quantidadeNumero * (produtoSelecionado.custoUnitario ?? 0))}
                    </span>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={!podeVender}
                className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-elo-gradient px-4 py-3 text-sm font-semibold text-white shadow-md transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ReceiptText size={16} />
                Registrar venda
              </button>
            </form>
          )}
        </section>

        <div className="flex flex-col gap-6">
          <SalesChart vendas={vendas} />

          {porProduto.length > 0 && (
            <section className="rounded-2xl border border-elo-border bg-elo-card/80 p-5 shadow-lg shadow-black/20 sm:p-6">
              <h2 className="mb-4 font-display text-[15px] font-semibold text-ink-primary">Por produto</h2>
              <div className="flex items-center justify-between gap-2 pb-2 text-[11px] font-medium uppercase tracking-wide text-ink-muted">
                <span>Produto</span>
                <div className="flex items-center gap-4">
                  <span className="w-14 text-right">Quantidade</span>
                  <span className="w-20 text-right">Valor total</span>
                  <span className="w-20 text-right">Lucro</span>
                </div>
              </div>
              <div className="flex flex-col divide-y divide-elo-border/60">
                {porProduto.map((p) => (
                  <div key={p.nome} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                    <span className="font-medium text-ink-primary">{p.nome}</span>
                    <div className="flex items-center gap-4 text-xs text-ink-secondary">
                      <span className="w-14 text-right">{p.unidades} un.</span>
                      <span className="w-20 text-right">{formatBRL(p.faturamento)}</span>
                      <span className="w-20 text-right font-semibold text-elo-green">{formatBRL(p.lucro)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="rounded-2xl border border-elo-border bg-elo-card/80 p-5 shadow-lg shadow-black/20 sm:p-6">
            <h2 className="mb-4 font-display text-[15px] font-semibold text-ink-primary">Histórico de vendas</h2>
            {vendas.length === 0 ? (
              <p className="text-sm text-ink-muted">Nenhuma venda registrada ainda.</p>
            ) : (
              <div className="flex max-h-96 flex-col divide-y divide-elo-border/60 overflow-y-auto">
                {vendas.map((v) => (
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
                        onClick={() => setVendaParaExcluir(v)}
                        className="rounded-full p-1.5 text-ink-muted opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                        title="Excluir venda"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(vendaParaExcluir)}
        title="Excluir venda?"
        message={`A venda de ${vendaParaExcluir?.quantidade}x "${vendaParaExcluir?.produtoNome}" será removida e a quantidade voltará ao estoque. Essa ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        onConfirm={handleConfirmarExclusao}
        onCancel={() => setVendaParaExcluir(null)}
      />
    </div>
  )
}
