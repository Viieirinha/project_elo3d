import { Ruler } from 'lucide-react'
import NumberField from './NumberField.jsx'

const UNIDADES = ['cm', 'm']

// Tamanho do objeto: altura, largura e profundidade (todas opcionais) com unidade cm ou m.
export default function MedidasField({ value, onChange }) {
  const set = (campo, v) => onChange({ ...value, [campo]: v })

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[13px] font-medium text-ink-secondary">
          <Ruler size={13} className="text-ink-muted" />
          Tamanho do objeto (opcional)
        </span>
        <div role="group" aria-label="Unidade de medida" className="flex rounded-full border border-elo-border bg-surface-subtle p-0.5">
          {UNIDADES.map((u) => (
            <button
              key={u}
              type="button"
              aria-pressed={value.unidade === u}
              onClick={() => set('unidade', u)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                value.unidade === u ? 'bg-elo-gradient text-white shadow-md' : 'text-ink-secondary hover:text-ink-primary'
              }`}
            >
              {u}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        <NumberField label="Altura" suffix={value.unidade} value={value.altura} onChange={(v) => set('altura', v)} placeholder="0" />
        <NumberField label="Largura" suffix={value.unidade} value={value.largura} onChange={(v) => set('largura', v)} placeholder="0" />
        <NumberField label="Profund." suffix={value.unidade} value={value.profundidade} onChange={(v) => set('profundidade', v)} placeholder="0" />
      </div>
    </div>
  )
}
