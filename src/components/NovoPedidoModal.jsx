import { useId, useState } from 'react'
import { ClipboardList, Plus, Trash2, AlertCircle } from 'lucide-react'
import { formatBRL, formatNumber, parseLocaleNumber } from '../utils/format.js'
import { getProdutos } from '../utils/estoque.js'
import { useCarregar } from '../utils/useCarregar.js'
import Modal from './ui/Modal.jsx'
import Button, { IconButton } from './ui/Button.jsx'
import { Campo, Input, Select, Textarea } from './ui/Field.jsx'

function novoItem() {
  return { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, produtoId: '', quantidade: '1', valorUnitario: '' }
}

export default function NovoPedidoModal({ open, onClose, onSave }) {
  const formId = useId()
  const { dados: produtos } = useCarregar(() => getProdutos({ comFoto: false }), [])
  const lista = produtos ?? []
  const [cliente, setCliente] = useState('')
  const [contato, setContato] = useState('')
  const [dataPrevista, setDataPrevista] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [itens, setItens] = useState([novoItem()])
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  function atualizarItem(id, campo, valor) {
    setItens((atual) =>
      atual.map((item) => {
        if (item.id !== id) return item
        const atualizado = { ...item, [campo]: valor }
        if (campo === 'produtoId') {
          const produto = lista.find((p) => p.id === valor)
          atualizado.valorUnitario = produto ? formatNumber(produto.precoVenda, 2) : ''
        }
        return atualizado
      })
    )
  }

  const removerItem = (id) => setItens((atual) => (atual.length > 1 ? atual.filter((item) => item.id !== id) : atual))

  const itensValidos = itens
    .map((item) => {
      const produto = lista.find((p) => p.id === item.produtoId)
      const quantidade = parseInt(item.quantidade, 10)
      const valorUnitario = parseLocaleNumber(item.valorUnitario)
      return {
        produtoId: item.produtoId,
        produtoNome: produto?.nome ?? '',
        quantidade,
        valorUnitario,
        valido: Boolean(produto) && quantidade > 0 && item.valorUnitario.trim() !== '' && valorUnitario >= 0,
      }
    })
    .filter((item) => item.produtoId)

  const valorTotal = itensValidos.reduce((acc, i) => acc + (i.valido ? i.quantidade * i.valorUnitario : 0), 0)
  const podeSalvar = cliente.trim().length > 0 && itensValidos.length > 0 && itensValidos.every((i) => i.valido)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!podeSalvar || salvando) return
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
    <Modal
      open={open}
      onClose={onClose}
      titulo="Nova encomenda"
      icone={ClipboardList}
      tamanho="lg"
      rodape={
        <div className="flex items-center gap-3">
          {itensValidos.length > 0 && (
            <div className="shrink-0 leading-tight">
              <p className="text-[11px] font-medium text-ink-muted">Valor total</p>
              <p className="font-display text-lg font-semibold tabular-nums text-ink-primary">{formatBRL(valorTotal)}</p>
            </div>
          )}
          <Button type="submit" form={formId} variante="primary" tamanho="lg" className="flex-1" icone={ClipboardList} carregando={salvando} disabled={!podeSalvar}>
            Criar encomenda
          </Button>
        </div>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo rotulo="Cliente">
            <Input value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Nome do cliente" data-autofocus />
          </Campo>
          <Campo rotulo="Contato (opcional)">
            <Input value={contato} onChange={(e) => setContato(e.target.value)} placeholder="WhatsApp, e-mail..." />
          </Campo>
        </div>

        <fieldset className="flex flex-col gap-2.5">
          <legend className="label mb-1">Itens da encomenda</legend>
          {lista.length === 0 ? (
            <p className="text-xs text-ink-muted">Nenhum produto cadastrado ainda. Registre produtos primeiro.</p>
          ) : (
            itens.map((item, index) => (
              <div key={item.id} className="rounded-xl border border-elo-border bg-surface-subtle p-3">
                <div className="flex items-center gap-2">
                  <Select aria-label={`Produto do item ${index + 1}`} value={item.produtoId} onChange={(e) => atualizarItem(item.id, 'produtoId', e.target.value)}>
                    <option value="">Selecione um produto</option>
                    {lista.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome}
                      </option>
                    ))}
                  </Select>
                  {itens.length > 1 && (
                    <IconButton icone={Trash2} variante="danger" rotulo={`Remover item ${index + 1}`} onClick={() => removerItem(item.id)} />
                  )}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Input
                    aria-label={`Quantidade do item ${index + 1}`}
                    inputMode="numeric"
                    value={item.quantidade}
                    onChange={(e) => atualizarItem(item.id, 'quantidade', e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="Quantidade"
                    sufixo="un."
                  />
                  <Input
                    aria-label={`Valor unitário do item ${index + 1}`}
                    prefixo="R$"
                    inputMode="decimal"
                    value={item.valorUnitario}
                    onChange={(e) => atualizarItem(item.id, 'valorUnitario', e.target.value)}
                    placeholder="Valor un."
                  />
                </div>
              </div>
            ))
          )}
          {lista.length > 0 && (
            <Button tamanho="sm" icone={Plus} variante="soft" className="self-start" onClick={() => setItens((a) => [...a, novoItem()])}>
              Adicionar item
            </Button>
          )}
        </fieldset>

        <Campo rotulo="Data prevista de entrega (opcional)">
          <Input type="date" value={dataPrevista} onChange={(e) => setDataPrevista(e.target.value)} />
        </Campo>

        <Campo rotulo="Observações (opcional)">
          <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Cor, personalização, combinações..." rows={2} />
        </Campo>

        {erro && (
          <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs font-medium text-red-400">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            {erro}
          </div>
        )}
      </form>
    </Modal>
  )
}
