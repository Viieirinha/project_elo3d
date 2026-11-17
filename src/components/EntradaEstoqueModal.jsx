import { useId, useState } from 'react'
import { ArrowDownCircle } from 'lucide-react'
import Modal from './ui/Modal.jsx'
import Button from './ui/Button.jsx'
import { Campo, Input, Select } from './ui/Field.jsx'

export default function EntradaEstoqueModal({ open, produtos, onClose, onConfirm }) {
  const formId = useId()
  const [produtoId, setProdutoId] = useState('')
  const [quantidade, setQuantidade] = useState('1')
  const [motivo, setMotivo] = useState('')
  const [salvando, setSalvando] = useState(false)

  const quantidadeNumero = parseInt(quantidade, 10)
  const podeSalvar = produtoId !== '' && quantidadeNumero > 0

  async function handleSubmit(e) {
    e.preventDefault()
    if (!podeSalvar || salvando) return
    setSalvando(true)
    try {
      await onConfirm({ produtoId, quantidade: quantidadeNumero, motivo: motivo.trim() })
      setProdutoId('')
      setQuantidade('1')
      setMotivo('')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      titulo="Registrar entrada"
      icone={ArrowDownCircle}
      tamanho="sm"
      rodape={
        produtos.length > 0 && (
          <Button type="submit" form={formId} variante="success" tamanho="lg" bloco carregando={salvando} disabled={!podeSalvar}>
            Confirmar entrada
          </Button>
        )
      }
    >
      {produtos.length === 0 ? (
        <p className="text-sm text-ink-muted">Nenhum produto cadastrado ainda.</p>
      ) : (
        <form id={formId} onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Campo rotulo="Produto">
            <Select value={produtoId} onChange={(e) => setProdutoId(e.target.value)} data-autofocus>
              <option value="" disabled>
                Selecione um produto
              </option>
              {produtos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome} ({p.quantidade} em estoque)
                </option>
              ))}
            </Select>
          </Campo>
          <Campo rotulo="Quantidade">
            <Input inputMode="numeric" value={quantidade} onChange={(e) => setQuantidade(e.target.value.replace(/[^0-9]/g, ''))} />
          </Campo>
          <Campo rotulo="Motivo (opcional)">
            <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex: nova produção" />
          </Campo>
        </form>
      )}
    </Modal>
  )
}
