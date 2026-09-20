import { useRef, useState } from 'react'
import { X, ImagePlus, PackagePlus, Trash2, Loader2, AlertCircle } from 'lucide-react'
import { formatBRL } from '../utils/format.js'
import { comprimirImagem } from '../utils/image.js'
import CategoriaSelect from './ui/CategoriaSelect.jsx'

export default function RegistrarProdutoModal({ open, onClose, onSave, custoUnitario, precoVenda }) {
  const [nome, setNome] = useState('')
  const [quantidade, setQuantidade] = useState('1')
  const [categoria, setCategoria] = useState('')
  const [foto, setFoto] = useState(null)
  const [processandoFoto, setProcessandoFoto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const fileInputRef = useRef(null)

  if (!open) return null

  const quantidadeNumero = parseInt(quantidade, 10)
  const podeSalvar = nome.trim().length > 0 && quantidadeNumero > 0 && !processandoFoto && !salvando

  async function handleFotoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setErro('')
    setProcessandoFoto(true)
    try {
      setFoto(await comprimirImagem(file))
    } catch (err) {
      setErro(err.message || 'Não foi possível processar essa foto.')
    } finally {
      setProcessandoFoto(false)
      e.target.value = ''
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!podeSalvar) return
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
      })
      setNome('')
      setQuantidade('1')
      setCategoria('')
      setFoto(null)
    } catch (err) {
      setErro(err.message || 'Não foi possível salvar o produto. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-md rounded-2xl border border-elo-border bg-elo-card p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-ink-primary">Registrar produto</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink-primary"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-ink-secondary">Nome do produto</span>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Suporte de celular"
              autoFocus
              className="rounded-xl border border-elo-border bg-surface-subtle px-3 py-2.5 text-[15px] font-medium text-ink-primary placeholder-ink-muted outline-none transition-all focus:border-transparent focus:shadow-[0_0_0_1.5px_rgba(93,95,239,0.9)] focus:ring-2 focus:ring-[#5D5FEF]/25"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-ink-secondary">Quantidade produzida / a produzir</span>
            <input
              type="text"
              inputMode="numeric"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="1"
              className="rounded-xl border border-elo-border bg-surface-subtle px-3 py-2.5 text-[15px] font-medium text-ink-primary placeholder-ink-muted outline-none transition-all focus:border-transparent focus:shadow-[0_0_0_1.5px_rgba(93,95,239,0.9)] focus:ring-2 focus:ring-[#5D5FEF]/25"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-ink-secondary">Categoria</span>
            <CategoriaSelect value={categoria} onChange={setCategoria} />
          </label>

          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-ink-secondary">Foto do produto (opcional)</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFotoChange}
              className="hidden"
            />
            {foto ? (
              <div className="relative w-fit">
                <img src={foto} alt="Pré-visualização" className="h-56 w-56 rounded-xl object-contain border border-elo-border bg-surface-subtle" />
                <button
                  type="button"
                  onClick={() => setFoto(null)}
                  className="absolute -right-2 -top-2 rounded-full bg-elo-card border border-elo-border p-1 text-ink-secondary hover:text-red-400"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={processandoFoto}
                className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-elo-border bg-surface-subtle px-3 py-4 text-sm font-medium text-ink-muted transition-colors hover:border-elo-border-strong hover:text-ink-secondary disabled:cursor-wait"
              >
                {processandoFoto ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Compactando foto...
                  </>
                ) : (
                  <>
                    <ImagePlus size={16} />
                    Anexar foto
                  </>
                )}
              </button>
            )}
          </div>

          <div className="flex items-center justify-between rounded-xl bg-surface-hover px-4 py-3 text-xs text-ink-secondary">
            <span>Custo / preço sugerido salvos junto</span>
            <span className="font-semibold text-ink-primary">
              {formatBRL(custoUnitario)} · {formatBRL(precoVenda)}
            </span>
          </div>

          {erro && (
            <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs font-medium text-red-400">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              {erro}
            </div>
          )}

          <button
            type="submit"
            disabled={!podeSalvar}
            className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-elo-gradient px-4 py-3 text-sm font-semibold text-white shadow-md transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          >
            {salvando ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                <PackagePlus size={16} />
                Salvar no estoque
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
