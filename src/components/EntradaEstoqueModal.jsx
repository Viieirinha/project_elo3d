import { useState } from 'react'
import { X, ArrowDownCircle } from 'lucide-react'

export default function EntradaEstoqueModal({ open, produtos, onClose, onConfirm }) {
  const [produtoId, setProdutoId] = useState('')
  const [quantidade, setQuantidade] = useState('1')
  const [motivo, setMotivo] = useState('')

  if (!open) return null

  const quantidadeNumero = parseInt(quantidade, 10)
  const podeSalvar = produtoId !== '' && quantidadeNumero > 0

  function handleSubmit(e) {
    e.preventDefault()
    if (!podeSalvar) return
    onConfirm({ produtoId, quantidade: quantidadeNumero, motivo: motivo.trim() })
    setProdutoId('')
    setQuantidade('1')
    setMotivo('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-sm rounded-2xl border border-elo-border bg-elo-card p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink-primary">
            <ArrowDownCircle size={19} className="text-elo-green" />
            Registrar entrada
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink-primary"
          >
            <X size={18} />
          </button>
        </div>

        {produtos.length === 0 ? (
          <p className="text-sm text-ink-muted">Nenhum produto cadastrado ainda.</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-ink-secondary">Produto</span>
              <select
                value={produtoId}
                onChange={(e) => setProdutoId(e.target.value)}
                autoFocus
                className="rounded-xl border border-elo-border bg-surface-subtle px-3 py-2.5 text-[15px] font-medium text-ink-primary outline-none transition-all focus:border-transparent focus:shadow-[0_0_0_1.5px_rgba(93,95,239,0.9)] focus:ring-2 focus:ring-[#5D5FEF]/25"
              >
                <option value="" disabled>
                  Selecione um produto
                </option>
                {produtos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome} ({p.quantidade} em estoque)
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-ink-secondary">Quantidade</span>
              <input
                type="text"
                inputMode="numeric"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value.replace(/[^0-9]/g, ''))}
                className="rounded-xl border border-elo-border bg-surface-subtle px-3 py-2.5 text-[15px] font-medium text-ink-primary outline-none transition-all focus:border-transparent focus:shadow-[0_0_0_1.5px_rgba(93,95,239,0.9)] focus:ring-2 focus:ring-[#5D5FEF]/25"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-ink-secondary">Motivo (opcional)</span>
              <input
                type="text"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ex: nova produção"
                className="rounded-xl border border-elo-border bg-surface-subtle px-3 py-2.5 text-[15px] font-medium text-ink-primary placeholder-ink-muted outline-none transition-all focus:border-transparent focus:shadow-[0_0_0_1.5px_rgba(93,95,239,0.9)] focus:ring-2 focus:ring-[#5D5FEF]/25"
              />
            </label>

            <button
              type="submit"
              disabled={!podeSalvar}
              className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-elo-green to-elo-blue px-4 py-3 text-sm font-semibold text-white shadow-md transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            >
              Confirmar entrada
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
