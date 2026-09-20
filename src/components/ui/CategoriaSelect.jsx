import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { getCategorias } from '../../utils/categorias.js'

const NOVA = '__nova__'

export default function CategoriaSelect({ value, onChange }) {
  const [categorias, setCategorias] = useState([])
  const [modoNova, setModoNova] = useState(false)

  useEffect(() => {
    getCategorias().then(setCategorias)
  }, [])

  function handleSelectChange(e) {
    if (e.target.value === NOVA) {
      setModoNova(true)
      onChange('')
    } else {
      onChange(e.target.value)
    }
  }

  if (modoNova) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Nome da nova categoria"
          autoFocus
          className="flex-1 rounded-xl border border-elo-border bg-surface-subtle px-3 py-2.5 text-[15px] font-medium text-ink-primary placeholder-ink-muted outline-none transition-all focus:border-transparent focus:shadow-[0_0_0_1.5px_rgba(93,95,239,0.9)] focus:ring-2 focus:ring-[#5D5FEF]/25"
        />
        <button
          type="button"
          onClick={() => {
            setModoNova(false)
            onChange('')
          }}
          className="rounded-full p-2 text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink-primary"
          title="Cancelar"
        >
          <X size={16} />
        </button>
      </div>
    )
  }

  return (
    <select
      value={value}
      onChange={handleSelectChange}
      className="rounded-xl border border-elo-border bg-surface-subtle px-3 py-2.5 text-[15px] font-medium text-ink-primary outline-none transition-all focus:border-transparent focus:shadow-[0_0_0_1.5px_rgba(93,95,239,0.9)] focus:ring-2 focus:ring-[#5D5FEF]/25"
    >
      <option value="">Sem categoria</option>
      {categorias.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
      <option value={NOVA}>+ Nova categoria</option>
    </select>
  )
}
