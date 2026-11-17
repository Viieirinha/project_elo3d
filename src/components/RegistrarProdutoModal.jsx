import { useId, useState } from 'react'
import { PackagePlus, AlertCircle } from 'lucide-react'
import { formatBRL, formatNumber } from '../utils/format.js'
import { medidasVazias, medidasParaApi, medidasValidas } from '../utils/medidas.js'
import Modal from './ui/Modal.jsx'
import Button from './ui/Button.jsx'
import { Campo, Input } from './ui/Field.jsx'
import CategoriaSelect from './ui/CategoriaSelect.jsx'
import MedidasField from './ui/MedidasField.jsx'
import FotoField from './ui/FotoField.jsx'

export default function RegistrarProdutoModal({ open, onClose, onSave, custoUnitario, precoVenda, partes }) {
  const formId = useId()
  const [nome, setNome] = useState('')
  const [quantidade, setQuantidade] = useState('1')
  const [categoria, setCategoria] = useState('')
  const [foto, setFoto] = useState(null)
  const [medidas, setMedidas] = useState(medidasVazias)
  const [processandoFoto, setProcessandoFoto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const quantidadeNumero = parseInt(quantidade, 10)
  const podeSalvar = nome.trim().length > 0 && quantidadeNumero > 0 && medidasValidas(medidas) && !processandoFoto

  async function handleSubmit(e) {
    e.preventDefault()
    if (!podeSalvar || salvando) return
    setErro('')
    setSalvando(true)
    try {
      await onSave({
        nome: nome.trim(),
        quantidade: quantidadeNumero,
        foto,
        custoUnitario,
        precoVenda,
        categoria,
        ...medidasParaApi(medidas),
        ...(partes?.length
          ? {
              partes: partes.map((p) => ({
                nome: p.nome,
                quantidade: p.quantidade,
                gramas: p.gramas,
                custoUnitario: p.custoUnitario,
                precoUnitario: p.precoUnitario,
              })),
            }
          : {}),
      })
      setNome('')
      setQuantidade('1')
      setCategoria('')
      setFoto(null)
      setMedidas(medidasVazias())
    } catch (err) {
      setErro(err.message || 'Não foi possível salvar o produto. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      titulo="Registrar produto"
      icone={PackagePlus}
      rodape={
        <Button type="submit" form={formId} variante="primary" tamanho="lg" bloco icone={PackagePlus} carregando={salvando} disabled={!podeSalvar}>
          Salvar no estoque
        </Button>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Campo rotulo="Nome do produto">
          <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Suporte de celular" data-autofocus />
        </Campo>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo rotulo="Quantidade produzida">
            <Input inputMode="numeric" value={quantidade} onChange={(e) => setQuantidade(e.target.value.replace(/[^0-9]/g, ''))} placeholder="1" />
          </Campo>
          <Campo rotulo="Categoria">
            <CategoriaSelect value={categoria} onChange={setCategoria} />
          </Campo>
        </div>

        <MedidasField value={medidas} onChange={setMedidas} />
        <FotoField value={foto} onChange={setFoto} onErro={setErro} onProcessando={setProcessandoFoto} />

        {partes?.length > 0 && (
          <div className="rounded-xl border border-elo-border bg-surface-subtle p-3.5 text-xs text-ink-secondary">
            <p className="mb-2 font-semibold text-ink-primary">Partes salvas junto ({partes.length})</p>
            <ul className="flex flex-col gap-1.5">
              {partes.map((p) => (
                <li key={p.id} className="flex justify-between gap-3">
                  <span className="truncate">
                    {p.nome}
                    {p.quantidade > 1 && ` ×${p.quantidade}`} · {formatNumber(p.gramas, 0)} g
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums text-ink-primary">{formatBRL(p.precoUnitario)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-hover px-4 py-3 text-xs text-ink-secondary">
          <span>Custo · preço salvos junto</span>
          <span className="whitespace-nowrap font-semibold tabular-nums text-ink-primary">
            {formatBRL(custoUnitario)} · {formatBRL(precoVenda)}
          </span>
        </div>

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
