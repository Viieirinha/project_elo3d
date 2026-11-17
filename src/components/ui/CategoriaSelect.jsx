import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { getCategorias } from '../../utils/categorias.js'
import { Input, Select } from './Field.jsx'
import { IconButton } from './Button.jsx'

const NOVA = '__nova__'

export default function CategoriaSelect({ value, onChange }) {
  const [categorias, setCategorias] = useState([])
  const [modoNova, setModoNova] = useState(false)

  useEffect(() => {
    getCategorias().then(setCategorias).catch(() => {})
  }, [])

  function aoMudar(e) {
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
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Nome da nova categoria" autoFocus />
        <IconButton
          icone={X}
          rotulo="Cancelar nova categoria"
          onClick={() => {
            setModoNova(false)
            onChange('')
          }}
        />
      </div>
    )
  }

  return (
    <Select value={value} onChange={aoMudar}>
      <option value="">Sem categoria</option>
      {categorias.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
      <option value={NOVA}>+ Nova categoria</option>
    </Select>
  )
}
