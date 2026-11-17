import { useEffect, useId, useState } from 'react'
import { Pencil, Save, AlertCircle } from 'lucide-react'
import { formatBRL, formatNumber, parseLocaleNumber } from '../utils/format.js'
import { medidasVazias, medidasDoProduto, medidasParaApi, medidasValidas } from '../utils/medidas.js'
import Modal from './ui/Modal.jsx'
import Button from './ui/Button.jsx'
import { Campo, Input } from './ui/Field.jsx'
import CategoriaSelect from './ui/CategoriaSelect.jsx'
import MedidasField from './ui/MedidasField.jsx'
import FotoField from './ui/FotoField.jsx'

const paraTexto = (n) => String(n ?? 0).replace('.', ',')

export default function EditarProdutoModal({ open, produto, onClose, onSave }) {
  const formId = useId()
  const [nome, setNome] = useState('')
  const [custoUnitario, setCustoUnitario] = useState('')
  const [precoVenda, setPrecoVenda] = useState('')
  const [categoria, setCategoria] = useState('')
  const [foto, setFoto] = useState(null)
  const [medidas, setMedidas] = useState(medidasVazias)
  const [processandoFoto, setProcessandoFoto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (produto) {
      setNome(produto.nome)
      setCustoUnitario(paraTexto(produto.custoUnitario))
      setPrecoVenda(paraTexto(produto.precoVenda))
      setCategoria(produto.categoria ?? '')
      setFoto(produto.foto ?? null)
      setMedidas(medidasDoProduto(produto))
      setErro('')
    }
  }, [produto])

  const custoNumero = parseLocaleNumber(custoUnitario)
  const precoNumero = parseLocaleNumber(precoVenda)
  const podeSalvar = nome.trim().length > 0 && custoNumero >= 0 && precoNumero >= 0 && medidasValidas(medidas) && !processandoFoto

  async function handleSubmit(e) {
    e.preventDefault()
    if (!podeSalvar || salvando) return
    setErro('')
    setSalvando(true)
    try {
      await onSave({
        nome: nome.trim(),
        custoUnitario: custoNumero,
        precoVenda: precoNumero,
        foto,
        categoria,
        ...medidasParaApi(medidas),
      })
    } catch (err) {
      setErro(err.message || 'Não foi possível salvar as alterações. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal
      open={open && Boolean(produto)}
      onClose={onClose}
      titulo="Editar produto"
      icone={Pencil}
      rodape={
        <Button type="submit" form={formId} variante="primary" tamanho="lg" bloco icone={Save} carregando={salvando} disabled={!podeSalvar}>
          Salvar alterações
        </Button>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Campo rotulo="Nome do produto">
          <Input value={nome} onChange={(e) => setNome(e.target.value)} data-autofocus />
        </Campo>

        <div className="grid grid-cols-2 gap-4">
          <Campo rotulo="Custo unitário">
            <Input prefixo="R$" inputMode="decimal" value={custoUnitario} onChange={(e) => setCustoUnitario(e.target.value)} />
          </Campo>
          <Campo rotulo="Preço de venda">
            <Input prefixo="R$" inputMode="decimal" value={precoVenda} onChange={(e) => setPrecoVenda(e.target.value)} />
          </Campo>
        </div>

        <Campo rotulo="Categoria">
          <CategoriaSelect value={categoria} onChange={setCategoria} />
        </Campo>

        <MedidasField value={medidas} onChange={setMedidas} />

        {produto?.partes?.length > 0 && (
          <div className="rounded-xl border border-elo-border bg-surface-subtle p-3.5 text-xs text-ink-secondary">
            <p className="mb-2 font-semibold text-ink-primary">Partes do objeto ({produto.partes.length})</p>
            <ul className="flex flex-col gap-1.5">
              {produto.partes.map((p, i) => (
                <li key={i} className="flex justify-between gap-3">
                  <span className="truncate">
                    {p.nome}
                    {p.quantidade > 1 && ` ×${p.quantidade}`} · {formatNumber(p.gramas, 0)} g
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums text-ink-primary">{formatBRL(p.precoUnitario)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2.5 text-[11px] text-ink-muted">
              As partes vêm da calculadora. Para alterá-las, registre o produto de novo por lá.
            </p>
          </div>
        )}

        <FotoField value={foto} onChange={setFoto} onErro={setErro} onProcessando={setProcessandoFoto} rotulo="Foto do produto" />

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
