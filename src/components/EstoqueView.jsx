import { useEffect, useState } from 'react'
import { Package, Trash2, Pencil, ImageOff, AlertTriangle, ArrowDownCircle } from 'lucide-react'
import { formatBRL } from '../utils/format.js'
import { getProdutos, removerProduto, registrarMovimentacao, atualizarProduto } from '../utils/estoque.js'
import { getEstoqueMinimo } from '../utils/config.js'
import EntradaEstoqueModal from './EntradaEstoqueModal.jsx'
import EditarProdutoModal from './EditarProdutoModal.jsx'
import ConfirmDialog from './ui/ConfirmDialog.jsx'

export default function EstoqueView() {
  const [produtos, setProdutos] = useState([])
  const [estoqueMinimo, setEstoqueMinimo] = useState(5)
  const [modalAberto, setModalAberto] = useState(false)
  const [produtoParaExcluir, setProdutoParaExcluir] = useState(null)
  const [produtoParaEditar, setProdutoParaEditar] = useState(null)

  useEffect(() => {
    getProdutos().then(setProdutos)
    getEstoqueMinimo().then(setEstoqueMinimo)
  }, [])

  async function handleConfirmarExclusao() {
    setProdutos(await removerProduto(produtoParaExcluir.id))
    setProdutoParaExcluir(null)
  }

  async function handleSalvarEdicao(dados) {
    setProdutos(await atualizarProduto(produtoParaEditar.id, dados))
    setProdutoParaEditar(null)
  }

  async function handleConfirmarEntrada({ produtoId, quantidade, motivo }) {
    const { produtos: novosProdutos } = await registrarMovimentacao({
      produtoId,
      tipo: 'entrada',
      quantidade,
      motivo,
    })
    setProdutos(novosProdutos)
    setModalAberto(false)
  }

  const totalUnidades = produtos.reduce((acc, p) => acc + p.quantidade, 0)
  const produtosBaixos = produtos.filter((p) => p.quantidade <= estoqueMinimo)

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-ink-primary sm:text-2xl">Estoque de produtos</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {produtos.length === 0
              ? 'Nenhum produto registrado ainda.'
              : `${produtos.length} produto(s) · ${totalUnidades} unidade(s) no total`}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalAberto(true)}
          className="flex items-center gap-1.5 rounded-full bg-elo-gradient px-4 py-2 text-xs font-semibold text-white shadow-md"
        >
          <ArrowDownCircle size={15} />
          Registrar entrada
        </button>
      </div>

      {produtosBaixos.length > 0 && (
        <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-elo-yellow/30 bg-elo-yellow/10 px-4 py-3 text-sm text-elo-yellow">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <p>
            <span className="font-semibold">{produtosBaixos.length}</span> produto(s) com estoque baixo:{' '}
            {produtosBaixos.map((p) => p.nome).join(', ')}.
          </p>
        </div>
      )}

      {produtos.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-elo-border bg-elo-card/60 px-6 py-16 text-center">
          <Package size={32} className="text-ink-muted" />
          <p className="text-sm text-ink-muted">
            Registre um produto na tela da Calculadora para ele aparecer aqui.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {produtos.map((produto) => {
            const estoqueBaixo = produto.quantidade <= estoqueMinimo
            return (
              <div
                key={produto.id}
                className={`group relative overflow-hidden rounded-2xl border bg-elo-card/80 p-4 shadow-lg shadow-black/20 ${
                  estoqueBaixo ? 'border-elo-yellow/40' : 'border-elo-border'
                }`}
              >
                <div className="absolute right-3 top-3 z-10 flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => setProdutoParaEditar(produto)}
                    className="rounded-full bg-black/50 p-1.5 text-zinc-300 backdrop-blur-sm transition-colors hover:text-elo-blue"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setProdutoParaExcluir(produto)}
                    className="rounded-full bg-black/50 p-1.5 text-zinc-300 backdrop-blur-sm transition-colors hover:text-red-400"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="mb-3 flex h-36 items-center justify-center overflow-hidden rounded-xl border border-elo-border bg-surface-subtle">
                  {produto.foto ? (
                    <img src={produto.foto} alt={produto.nome} className="h-full w-full object-cover" />
                  ) : (
                    <ImageOff size={24} className="text-ink-muted" />
                  )}
                </div>

                <h3 className="truncate font-display text-[15px] font-semibold text-ink-primary">{produto.nome}</h3>
                {produto.categoria && (
                  <span className="mt-1 inline-block rounded-full bg-surface-subtle px-2 py-0.5 text-[11px] font-medium text-ink-secondary">
                    {produto.categoria}
                  </span>
                )}

                <div className="mt-2 flex items-center justify-between gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold text-white ${
                      estoqueBaixo ? 'bg-gradient-to-r from-elo-yellow to-elo-pink' : 'bg-elo-gradient'
                    }`}
                  >
                    {produto.quantidade} em estoque
                  </span>
                  {estoqueBaixo && (
                    <span className="flex items-center gap-1 text-xs font-medium text-elo-yellow">
                      <AlertTriangle size={12} /> baixo
                    </span>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-elo-border/60 pt-3 text-xs text-ink-muted">
                  <span>Custo: {formatBRL(produto.custoUnitario)}</span>
                  <span className="font-semibold text-ink-secondary">Venda: {formatBRL(produto.precoVenda)}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <EntradaEstoqueModal
        open={modalAberto}
        produtos={produtos}
        onClose={() => setModalAberto(false)}
        onConfirm={handleConfirmarEntrada}
      />

      <EditarProdutoModal
        open={Boolean(produtoParaEditar)}
        produto={produtoParaEditar}
        onClose={() => setProdutoParaEditar(null)}
        onSave={handleSalvarEdicao}
      />

      <ConfirmDialog
        open={Boolean(produtoParaExcluir)}
        title="Excluir produto?"
        message={`"${produtoParaExcluir?.nome}" será removido do estoque permanentemente. Essa ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        onConfirm={handleConfirmarExclusao}
        onCancel={() => setProdutoParaExcluir(null)}
      />
    </div>
  )
}
