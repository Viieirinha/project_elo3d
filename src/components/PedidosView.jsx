import { useMemo, useState } from 'react'
import { ClipboardList, Plus, ArrowRight, Trash2, Calendar, User, RotateCcw, ChevronDown, Ban } from 'lucide-react'
import { formatBRL } from '../utils/format.js'
import { getPedidos, registrarPedido, atualizarStatusPedido, removerPedido } from '../utils/pedidos.js'
import { useCarregar } from '../utils/useCarregar.js'
import NovoPedidoModal from './NovoPedidoModal.jsx'
import ConfirmDialog from './ui/ConfirmDialog.jsx'
import PageHeader from './ui/PageHeader.jsx'
import Segmented from './ui/Segmented.jsx'
import Button, { IconButton } from './ui/Button.jsx'
import Badge from './ui/Badge.jsx'
import EmptyState, { ErroCarregamento } from './ui/EmptyState.jsx'
import Skeleton from './ui/Skeleton.jsx'
import { useToast } from './ui/Toast.jsx'

const COLUNAS = [
  { status: 'pedido', titulo: 'Pedido', proximo: 'producao', acao: 'Iniciar produção', ponto: 'bg-elo-blue' },
  { status: 'producao', titulo: 'Em produção', proximo: 'pronto', acao: 'Marcar como pronto', ponto: 'bg-elo-yellow' },
  { status: 'pronto', titulo: 'Pronto', proximo: 'entregue', acao: 'Marcar como entregue', ponto: 'bg-elo-green' },
  { status: 'entregue', titulo: 'Entregue', proximo: null, acao: null, ponto: 'bg-elo-lime' },
]

const formatData = (iso) => (iso ? iso.split('-').reverse().join('/') : null)

function hojeISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function PedidosView() {
  const toast = useToast()
  const { dados, setDados, carregando, erro, recarregar } = useCarregar(getPedidos)
  const [modalAberto, setModalAberto] = useState(false)
  const [pedidoParaExcluir, setPedidoParaExcluir] = useState(null)
  const [pedidoParaEntregar, setPedidoParaEntregar] = useState(null)
  const [mostrarCancelados, setMostrarCancelados] = useState(false)
  const [colunaMobile, setColunaMobile] = useState('pedido')
  const [ocupado, setOcupado] = useState(null)

  const pedidos = dados ?? []
  const hoje = hojeISO()
  const cancelados = pedidos.filter((p) => p.status === 'cancelado')
  const contagem = useMemo(() => Object.fromEntries(COLUNAS.map((c) => [c.status, pedidos.filter((p) => p.status === c.status).length])), [pedidos])

  async function mudarStatus(pedido, status, mensagem) {
    setOcupado(pedido.id)
    try {
      setDados(await atualizarStatusPedido(pedido.id, status))
      toast.sucesso(mensagem)
      return true
    } catch (e) {
      toast.erro(e.message || 'Não foi possível atualizar a encomenda.')
      return false
    } finally {
      setOcupado(null)
    }
  }

  function avancar(pedido, coluna) {
    // Entregar dá baixa no estoque e registra as vendas: pede confirmação.
    if (coluna.proximo === 'entregue') return setPedidoParaEntregar(pedido)
    mudarStatus(pedido, coluna.proximo, `Encomenda de ${pedido.cliente}: ${coluna.acao.toLowerCase()}.`)
  }

  async function confirmarEntrega() {
    if (await mudarStatus(pedidoParaEntregar, 'entregue', `Encomenda de ${pedidoParaEntregar.cliente} entregue e vendas registradas.`)) {
      setPedidoParaEntregar(null)
    }
  }

  async function salvarPedido(dados) {
    setDados(await registrarPedido(dados))
    setModalAberto(false)
    toast.sucesso('Encomenda criada.')
  }

  async function excluir() {
    try {
      setDados(await removerPedido(pedidoParaExcluir.id))
      toast.sucesso('Encomenda excluída.')
      setPedidoParaExcluir(null)
    } catch (e) {
      toast.erro(e.message || 'Não foi possível excluir.')
    }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        titulo="Encomendas"
        subtitulo="Acompanhe o pedido do cliente até a entrega."
        acoes={
          <Button variante="primary" icone={Plus} onClick={() => setModalAberto(true)}>
            Nova encomenda
          </Button>
        }
      />

      {carregando && !dados ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-56 rounded-2xl" />
          ))}
        </div>
      ) : erro && !dados ? (
        <ErroCarregamento erro={erro} onTentar={recarregar} />
      ) : pedidos.length === 0 ? (
        <EmptyState
          icone={ClipboardList}
          titulo="Nenhuma encomenda ainda"
          texto="Crie uma encomenda para acompanhar o pedido do cliente até a entrega."
          acao={
            <Button variante="primary" icone={Plus} onClick={() => setModalAberto(true)}>
              Nova encomenda
            </Button>
          }
        />
      ) : (
        <>
          {/* No celular, uma coluna por vez */}
          <div className="mb-4 lg:hidden">
            <Segmented
              rotulo="Status das encomendas"
              tamanho="sm"
              valor={colunaMobile}
              onChange={setColunaMobile}
              opcoes={COLUNAS.map((c) => ({ valor: c.status, rotulo: `${c.titulo} (${contagem[c.status]})` }))}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-4">
            {COLUNAS.map((coluna) => {
              const itens = pedidos.filter((p) => p.status === coluna.status)
              return (
                <section key={coluna.status} aria-label={coluna.titulo} className={`${colunaMobile === coluna.status ? 'flex' : 'hidden'} min-w-0 flex-col gap-3 lg:flex`}>
                  <header className="hidden items-center gap-2 px-1 lg:flex">
                    <span className={`h-2 w-2 rounded-full ${coluna.ponto}`} />
                    <h2 className="font-display text-[13px] font-semibold uppercase tracking-wider text-ink-secondary">{coluna.titulo}</h2>
                    <span className="text-xs tabular-nums text-ink-muted">{contagem[coluna.status]}</span>
                  </header>

                  {itens.length === 0 && (
                    <p className="rounded-xl border border-dashed border-elo-border px-3 py-6 text-center text-xs text-ink-muted">Nenhuma encomenda</p>
                  )}

                  {itens.map((pedido) => {
                    const atrasado = pedido.dataPrevista && pedido.dataPrevista < hoje && pedido.status !== 'entregue'
                    return (
                      <article key={pedido.id} className="card p-4">
                        <div className="mb-2.5 flex items-start justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-elo-blue/10 text-elo-blue">
                              <User size={13} />
                            </span>
                            <span className="truncate text-sm font-semibold text-ink-primary">{pedido.cliente}</span>
                          </div>
                          <div className="-mr-1.5 -mt-1 flex shrink-0">
                            {coluna.status !== 'entregue' && (
                              <IconButton icone={Ban} rotulo={`Cancelar encomenda de ${pedido.cliente}`} tamanho="sm" disabled={ocupado === pedido.id} onClick={() => mudarStatus(pedido, 'cancelado', `Encomenda de ${pedido.cliente} cancelada.`)} />
                            )}
                            <IconButton icone={Trash2} rotulo={`Excluir encomenda de ${pedido.cliente}`} tamanho="sm" variante="danger" onClick={() => setPedidoParaExcluir(pedido)} />
                          </div>
                        </div>

                        <ul className="mb-3 flex flex-col gap-0.5">
                          {pedido.itens.map((item, i) => (
                            <li key={i} className="text-xs text-ink-secondary">
                              {item.quantidade}× {item.produtoNome}
                            </li>
                          ))}
                        </ul>

                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <span className="font-display text-base font-semibold tabular-nums text-ink-primary">{formatBRL(pedido.valorTotal)}</span>
                          {pedido.dataPrevista && (
                            <Badge tom={atrasado ? 'perigo' : 'neutro'} icone={Calendar}>
                              {atrasado ? 'Atrasada · ' : ''}
                              {formatData(pedido.dataPrevista)}
                            </Badge>
                          )}
                        </div>

                        {pedido.observacoes && <p className="mb-2 text-xs italic text-ink-muted">{pedido.observacoes}</p>}

                        {coluna.proximo && (
                          <Button tamanho="sm" variante="soft" bloco className="mt-3 whitespace-nowrap" carregando={ocupado === pedido.id} onClick={() => avancar(pedido, coluna)}>
                            {coluna.acao}
                            <ArrowRight size={13} />
                          </Button>
                        )}
                      </article>
                    )
                  })}
                </section>
              )
            })}
          </div>

          {cancelados.length > 0 && (
            <div className="mt-8">
              <button
                type="button"
                aria-expanded={mostrarCancelados}
                onClick={() => setMostrarCancelados((v) => !v)}
                className="flex items-center gap-1.5 text-sm font-medium text-ink-muted transition-colors hover:text-ink-secondary"
              >
                <ChevronDown size={15} className={`transition-transform ${mostrarCancelados ? 'rotate-180' : ''}`} />
                Encomendas canceladas ({cancelados.length})
              </button>
              {mostrarCancelados && (
                <ul className="card mt-3 divide-y divide-elo-border">
                  {cancelados.map((pedido) => (
                    <li key={pedido.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                      <span className="min-w-0 truncate text-ink-secondary line-through">{pedido.cliente}</span>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="tabular-nums text-ink-muted">{formatBRL(pedido.valorTotal)}</span>
                        <Button tamanho="sm" icone={RotateCcw} disabled={ocupado === pedido.id} onClick={() => mudarStatus(pedido, 'pedido', `Encomenda de ${pedido.cliente} reaberta.`)}>
                          Reabrir
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}

      <NovoPedidoModal open={modalAberto} onClose={() => setModalAberto(false)} onSave={salvarPedido} />

      <ConfirmDialog
        open={Boolean(pedidoParaEntregar)}
        title="Marcar como entregue?"
        message={`Ao entregar a encomenda de "${pedidoParaEntregar?.cliente}", cada item será registrado como venda e baixado do estoque.`}
        confirmLabel="Entregar"
        variante="primary"
        onConfirm={confirmarEntrega}
        onCancel={() => setPedidoParaEntregar(null)}
      />

      <ConfirmDialog
        open={Boolean(pedidoParaExcluir)}
        title="Excluir encomenda?"
        message={`A encomenda de "${pedidoParaExcluir?.cliente}" será removida permanentemente. Essa ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        onConfirm={excluir}
        onCancel={() => setPedidoParaExcluir(null)}
      />
    </div>
  )
}
