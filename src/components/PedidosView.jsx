import { useEffect, useState } from 'react'
import { ClipboardList, Plus, ArrowRight, Trash2, Calendar, User } from 'lucide-react'
import { formatBRL } from '../utils/format.js'
import { getPedidos, registrarPedido, atualizarStatusPedido, removerPedido } from '../utils/pedidos.js'
import NovoPedidoModal from './NovoPedidoModal.jsx'
import ConfirmDialog from './ui/ConfirmDialog.jsx'

const COLUNAS = [
  { status: 'pedido', titulo: 'Pedido', proximo: 'producao', acaoProximo: 'Iniciar produção', accent: 'from-elo-blue to-elo-magenta' },
  { status: 'producao', titulo: 'Em produção', proximo: 'pronto', acaoProximo: 'Marcar como pronto', accent: 'from-elo-yellow to-elo-magenta' },
  { status: 'pronto', titulo: 'Pronto', proximo: 'entregue', acaoProximo: 'Marcar como entregue', accent: 'from-elo-green to-elo-blue' },
  { status: 'entregue', titulo: 'Entregue', proximo: null, acaoProximo: null, accent: 'from-elo-green to-elo-lime' },
]

function formatData(iso) {
  if (!iso) return null
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}

export default function PedidosView() {
  const [pedidos, setPedidos] = useState([])
  const [modalAberto, setModalAberto] = useState(false)
  const [pedidoParaExcluir, setPedidoParaExcluir] = useState(null)
  const [mostrarCancelados, setMostrarCancelados] = useState(false)

  useEffect(() => {
    getPedidos().then(setPedidos)
  }, [])

  async function handleSalvarPedido(dados) {
    setPedidos(await registrarPedido(dados))
    setModalAberto(false)
  }

  async function handleAvancar(pedido, novoStatus) {
    setPedidos(await atualizarStatusPedido(pedido.id, novoStatus))
  }

  async function handleConfirmarExclusao() {
    setPedidos(await removerPedido(pedidoParaExcluir.id))
    setPedidoParaExcluir(null)
  }

  const cancelados = pedidos.filter((p) => p.status === 'cancelado')

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-ink-primary sm:text-2xl">Encomendas</h1>
          <p className="mt-1 text-sm text-ink-muted">Acompanhe o pedido do cliente até a entrega.</p>
        </div>
        <button
          type="button"
          onClick={() => setModalAberto(true)}
          className="flex items-center gap-1.5 rounded-full bg-elo-gradient px-4 py-2 text-xs font-semibold text-white shadow-md"
        >
          <Plus size={15} />
          Nova encomenda
        </button>
      </div>

      {pedidos.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-elo-border bg-elo-card/60 px-6 py-16 text-center">
          <ClipboardList size={32} className="text-ink-muted" />
          <p className="text-sm text-ink-muted">Nenhuma encomenda registrada ainda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          {COLUNAS.map((coluna) => {
            const pedidosColuna = pedidos.filter((p) => p.status === coluna.status)
            return (
              <div key={coluna.status} className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full bg-gradient-to-br ${coluna.accent}`} />
                  <h2 className="font-display text-[13px] font-semibold uppercase tracking-wide text-ink-secondary">
                    {coluna.titulo}
                  </h2>
                  <span className="text-xs text-ink-muted">({pedidosColuna.length})</span>
                </div>

                <div className="flex flex-col gap-3">
                  {pedidosColuna.map((pedido) => (
                    <div
                      key={pedido.id}
                      className="rounded-2xl border border-elo-border bg-elo-card/80 p-4 shadow-lg shadow-black/20"
                    >
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <User size={13} className="shrink-0 text-ink-muted" />
                          <span className="truncate text-sm font-semibold text-ink-primary">{pedido.cliente}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPedidoParaExcluir(pedido)}
                          className="shrink-0 rounded-full p-1 text-ink-muted transition-colors hover:text-red-400"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      <ul className="mb-2 flex flex-col gap-0.5">
                        {pedido.itens.map((item, i) => (
                          <li key={i} className="text-xs text-ink-secondary">
                            {item.quantidade}x {item.produtoNome}
                          </li>
                        ))}
                      </ul>

                      <div className="mb-2 flex items-center justify-between">
                        <span className="font-display text-sm font-bold text-ink-primary">
                          {formatBRL(pedido.valorTotal)}
                        </span>
                        {pedido.dataPrevista && (
                          <span className="flex items-center gap-1 text-[11px] text-ink-muted">
                            <Calendar size={11} />
                            {formatData(pedido.dataPrevista)}
                          </span>
                        )}
                      </div>

                      {pedido.observacoes && (
                        <p className="mb-2 text-[11px] italic text-ink-muted">{pedido.observacoes}</p>
                      )}

                      <div className="flex items-center gap-2">
                        {coluna.proximo && (
                          <button
                            type="button"
                            onClick={() => handleAvancar(pedido, coluna.proximo)}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-elo-border bg-surface-subtle px-2.5 py-1.5 text-[11px] font-medium text-ink-secondary transition-colors hover:border-elo-border-strong hover:text-ink-primary"
                          >
                            {coluna.acaoProximo}
                            <ArrowRight size={12} />
                          </button>
                        )}
                        {coluna.status !== 'entregue' && (
                          <button
                            type="button"
                            onClick={() => handleAvancar(pedido, 'cancelado')}
                            className="shrink-0 rounded-lg px-2 py-1.5 text-[11px] font-medium text-ink-muted transition-colors hover:text-red-400"
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {cancelados.length > 0 && (
        <div className="mt-8">
          <button
            type="button"
            onClick={() => setMostrarCancelados((v) => !v)}
            className="text-xs font-medium text-ink-muted hover:text-ink-secondary"
          >
            {mostrarCancelados ? 'Ocultar' : 'Mostrar'} encomendas canceladas ({cancelados.length})
          </button>
          {mostrarCancelados && (
            <div className="mt-3 flex flex-col divide-y divide-elo-border/60 rounded-2xl border border-elo-border bg-elo-card/60 p-4">
              {cancelados.map((pedido) => (
                <div key={pedido.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <span className="text-ink-secondary line-through">{pedido.cliente}</span>
                  <span className="text-ink-muted">{formatBRL(pedido.valorTotal)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <NovoPedidoModal open={modalAberto} onClose={() => setModalAberto(false)} onSave={handleSalvarPedido} />

      <ConfirmDialog
        open={Boolean(pedidoParaExcluir)}
        title="Excluir encomenda?"
        message={`A encomenda de "${pedidoParaExcluir?.cliente}" será removida permanentemente. Essa ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        onConfirm={handleConfirmarExclusao}
        onCancel={() => setPedidoParaExcluir(null)}
      />
    </div>
  )
}
