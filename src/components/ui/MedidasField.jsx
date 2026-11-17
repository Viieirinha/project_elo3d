import { Ruler } from 'lucide-react'
import NumberField from './NumberField.jsx'
import Segmented from './Segmented.jsx'

const UNIDADES = [
  { valor: 'cm', rotulo: 'cm' },
  { valor: 'm', rotulo: 'm' },
]

// Tamanho do objeto: altura, largura e profundidade (todas opcionais) com unidade cm ou m.
export default function MedidasField({ value, onChange }) {
  const set = (campo, v) => onChange({ ...value, [campo]: v })

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="label flex items-center gap-1.5">
          <Ruler size={13} className="text-ink-muted" />
          Tamanho do objeto (opcional)
        </span>
        <Segmented rotulo="Unidade de medida" tamanho="sm" opcoes={UNIDADES} valor={value.unidade} onChange={(u) => set('unidade', u)} />
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        <NumberField label="Altura" suffix={value.unidade} value={value.altura} onChange={(v) => set('altura', v)} placeholder="0" />
        <NumberField label="Largura" suffix={value.unidade} value={value.largura} onChange={(v) => set('largura', v)} placeholder="0" />
        <NumberField label="Profund." suffix={value.unidade} value={value.profundidade} onChange={(v) => set('profundidade', v)} placeholder="0" />
      </div>
    </div>
  )
}
