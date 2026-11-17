import { HelpCircle } from 'lucide-react'
import { useId } from 'react'
import { Input } from './Field.jsx'

// Campo numérico com dica opcional. A dica abre ao passar o mouse, tocar ou focar com o teclado.
export default function NumberField({ label, value, onChange, prefix, suffix, placeholder = '0', tooltip, id: idProp, ...props }) {
  const gerado = useId()
  const idDica = `${gerado}-dica`

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <span className="label flex items-center gap-1.5">
          <label htmlFor={idProp ?? gerado}>{label}</label>
          {tooltip && (
            <span className="group/dica relative inline-flex">
              <button
                type="button"
                aria-label={`Ajuda: ${label}`}
                aria-describedby={idDica}
                className="rounded-full text-ink-muted outline-none transition-colors hover:text-ink-secondary focus-visible:text-elo-blue"
              >
                <HelpCircle size={13} />
              </button>
              <span
                id={idDica}
                role="tooltip"
                className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-56 -translate-x-1/2 rounded-lg border border-elo-border bg-elo-raised px-3 py-2 text-[11px] font-normal leading-relaxed text-ink-secondary opacity-0 shadow-pop transition-opacity duration-150 group-focus-within/dica:opacity-100 group-hover/dica:opacity-100"
              >
                {tooltip}
              </span>
            </span>
          )}
        </span>
      )}
      <Input
        id={idProp ?? gerado}
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        prefixo={prefix}
        sufixo={suffix}
        {...props}
      />
    </div>
  )
}
