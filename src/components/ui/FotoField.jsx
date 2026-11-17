import { useRef, useState } from 'react'
import { ImagePlus, Trash2, Loader2 } from 'lucide-react'
import { comprimirImagem } from '../../utils/image.js'
import { IconButton } from './Button.jsx'

// Escolha de foto do produto (comprimida no navegador). `onErro` recebe a mensagem se a imagem falhar.
export default function FotoField({ value, onChange, onErro, onProcessando, rotulo = 'Foto do produto (opcional)' }) {
  const inputRef = useRef(null)
  const [processando, setProcessando] = useState(false)

  async function aoEscolher(e) {
    const arquivo = e.target.files?.[0]
    if (!arquivo) return
    onErro?.('')
    setProcessando(true)
    onProcessando?.(true)
    try {
      onChange(await comprimirImagem(arquivo))
    } catch (err) {
      onErro?.(err.message || 'Não foi possível processar essa foto.')
    } finally {
      setProcessando(false)
      onProcessando?.(false)
      e.target.value = ''
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="label">{rotulo}</span>
      <input ref={inputRef} type="file" accept="image/*" onChange={aoEscolher} className="hidden" tabIndex={-1} />
      {value ? (
        <div className="relative w-fit">
          <img src={value} alt="Pré-visualização da foto" className="h-44 w-44 rounded-xl border border-elo-border bg-surface-subtle object-contain" />
          <IconButton
            icone={Trash2}
            rotulo="Remover foto"
            tamanho="sm"
            variante="danger"
            className="absolute -right-2 -top-2 border border-elo-border bg-elo-card"
            onClick={() => onChange(null)}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={processando}
          className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-elo-border-strong/70 bg-surface-subtle px-3 py-5 text-sm font-medium text-ink-secondary transition-colors hover:border-elo-blue hover:text-ink-primary disabled:cursor-wait"
        >
          {processando ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Compactando foto...
            </>
          ) : (
            <>
              <ImagePlus size={16} /> Anexar foto
            </>
          )}
        </button>
      )}
    </div>
  )
}
