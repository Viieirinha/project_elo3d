import { useEffect, useState } from 'react'
import { X, ClipboardList, Plus, Trash2, Loader2, AlertCircle } from 'lucide-react'
import { formatBRL } from '../utils/format.js'
import { getProdutos } from '../utils/estoque.js'

function novoItem() {
  return { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, produtoId: '', quantidade: '1', valorUnitario: '' }
}

export default function NovoPedidoModal({ open, onClose, onSave }) {
  const [produtos, setProdutos] = useState([])
  const [cliente, setCliente] = useState('')
  const [contato, setContato] = useState('')
  const [dataPrevista, setDataPrevista] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [itens, setItens] = useState([novoItem()])
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (open) getProdutos().then(setProdutos)
  }, [open])

  if (!open) return null

  function atualizarItem(id, campo, valor) {
    setItens((atual) =>
      atual.map((item) => {
        if (item.id !== id) return item
        const atualizado = { ...item, [campo]: valor }
        if (campo === 'produtoId') {
          const produto = produtos.find((p) => p.id === valor)
          atualizado.valorUnitario = produto ? String(produto.precoVenda.toFixed(2)).replace('.', ',') : ''
        }
        return atualizado
      })
    )
  }

  function adicionarItem() {
    setItens((atual) => [...atual, novoItem()])
  }

  function removerItem(id) {
    setItens((atual) => (atual.length > 1 ? atual.filter((item) => item.id !== id) : atual))
  }

  const itensValidos = itens
    .map((item) => {
      const produto = produtos.find((p) => p.id === item.produtoId)
      const quantidade = parseInt(item.quantidade, 10)
      const valorUnitario = parseFloat(String(item.valorUnitario).replace(',', '.'))
      return {
        produtoId: item.produtoId,
        produtoNome: produto?.nome ?? '',
        quantidade,
        valorUnitario,
        valido: Boolean(produto) && quantidade > 0 && !isNaN(valorUnitario) && valorUnitario >= 0,
      }
    })
    .filter((item) => item.produtoId)

  const valorTotal = itensValidos.reduce((acc, i) => acc + (i.valido ? i.quantidade * i.valorUnitario : 0), 0)
  const podeSalvar =
    cliente.trim().length > 0 && itensValidos.length > 0 && itensValidos.every((i) => i.valido) && !salvando

  async function handleSubmit(e) {
    e.preventDefault()
    if (!podeSalvar) return
    setErro('')
    setSalvando(true)
    try {
      await onSave({
        cliente,
        contato,
        dataPrevista,
        observacoes,
        itens: itensValidos.map(({ produtoId, produtoNome, quantidade, valorUnitario }) => ({
          produtoId,
          produtoNome,
          quantidade,
          valorUnitario,
        })),
      })
      setCliente('')
      setContato('')
      setDataPrevista('')
      setObservacoes('')
      setItens([novoItem()])
    } catch (err) {
      setErro(err.message || 'Não foi possível salvar a encomenda. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-elo-border bg-elo-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-elo-border/60 p-6 pb-4">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink-primary">
            <ClipboardList size={19} className="text-elo-blue" />
            Nova encomenda
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink-primary"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-ink-secondary">Cliente</span>
              <input
                type="text"
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                placeholder="Nome do cliente"
                autoFocus
                className="rounded-xl border border-elo-border bg-surface-subtle px-3 py-2.5 text-[15px] font-medium text-ink-primary placeholder-ink-muted outline-none transition-all focus:border-transparent focus:shadow-[0_0_0_1.5px_rgba(93,95,239,0.9)] focus:ring-2 focus:ring-[#5D5FEF]/25"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-ink-secondary">Contato (opcional)</span>
              <input
                type="text"
                value={contato}
                onChange={(e) => setContato(e.target.value)}
                placeholder="WhatsApp, e-mail..."
                className="rounded-xl border border-elo-border bg-surface-subtle px-3 py-2.5 text-[15px] font-medium text-ink-primary placeholder-ink-muted outline-none transition-all focus:border-transparent focus:shadow-[0_0_0_1.5px_rgba(93,95,239,0.9)] focus:ring-2 focus:ring-[#5D5FEF]/25"
              />
            </label>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[13px] font-medium text-ink-secondary">Itens da encomenda</span>
            {produtos.length === 0 ? (
              <p className="text-xs text-ink-muted">Nenhum produto cadastrado ainda. Registre produtos primeiro.</p>
            ) : (
              itens.map((item, index) => (
                <div key={item.id} className="rounded-xl border border-elo-border bg-surface-subtle p-3">
                  <div className="flex items-center gap-2">
                    <select
                      value={item.produtoId}
                      onChange={(e) => atualizarItem(item.id, 'produtoId', e.target.value)}
                      className="min-w-0 flex-1 rounded-lg border border-elo-border bg-elo-card px-2.5 py-2 text-sm font-medium text-ink-primary outline-none"
                    >
                      <option value="">Selecione um produto</option>
                      {produtos.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nome}
                        </option>
                      ))}
                    </select>
                    {itens.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removerItem(item.id)}
                        className="shrink-0 rounded-full p-1.5 text-ink-muted transition-colors hover:text-red-400"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={item.quantidade}
                      onChange={(e) => atualizarItem(item.id, 'quantidade', e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="Quantidade"
                      className="rounded-lg border border-elo-border bg-elo-card px-2.5 py-2 text-sm font-medium text-ink-primary outline-none"
                    />
                    <div className="flex items-center rounded-lg border border-elo-border bg-elo-card px-2.5">
                      <span className="text-xs font-medium text-ink-muted">R$</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={item.valorUnitario}
                        onChange={(e) => atualizarItem(item.id, 'valorUnitario', e.target.value)}
                        placeholder="Valor un."
                        className="w-full bg-transparent py-2 pl-1.5 text-sm font-medium text-ink-primary outline-none"
                      />
                    </div>
                  </div>
                  {index === itens.length - 1 && (
                    <button
                      type="button"
                      onClick={adicionarItem}
                      className="mt-2 flex items-center gap-1.5 text-xs font-medium text-elo-blue hover:opacity-80"
                    >
                      <Plus size={13} />
                      Adicionar item
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-ink-secondary">Data prevista de entrega (opcional)</span>
            <input
              type="date"
              value={dataPrevista}
              onChange={(e) => setDataPrevista(e.target.value)}
              className="rounded-xl border border-elo-border bg-surface-subtle px-3 py-2.5 text-[15px] font-medium text-ink-primary outline-none transition-all focus:border-transparent focus:shadow-[0_0_0_1.5px_rgba(93,95,239,0.9)] focus:ring-2 focus:ring-[#5D5FEF]/25"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-ink-secondary">Observações (opcional)</span>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Cor, personalização, combinações..."
              rows={2}
              className="resize-none rounded-xl border border-elo-border bg-surface-subtle px-3 py-2.5 text-[15px] font-medium text-ink-primary placeholder-ink-muted outline-none transition-all focus:border-transparent focus:shadow-[0_0_0_1.5px_rgba(93,95,239,0.9)] focus:ring-2 focus:ring-[#5D5FEF]/25"
            />
          </label>

          {itensValidos.length > 0 && (
            <div className="flex items-center justify-between rounded-xl bg-surface-hover px-4 py-3 text-sm">
              <span className="font-medium text-ink-secondary">Valor total</span>
              <span className="font-display text-base font-bold text-ink-primary">{formatBRL(valorTotal)}</span>
            </div>
          )}

          {erro && (
            <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs font-medium text-red-400">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              {erro}
            </div>
          )}

          <button
            type="submit"
            disabled={!podeSalvar}
            className="flex items-center justify-center gap-2 rounded-xl bg-elo-gradient px-4 py-3 text-sm font-semibold text-white shadow-md transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          >
            {salvando ? <Loader2 size={16} className="animate-spin" /> : <ClipboardList size={16} />}
            Criar encomenda
          </button>
        </form>
      </div>
    </div>
  )
}
