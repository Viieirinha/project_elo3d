import { forwardRef } from 'react'
import { ChevronDown } from 'lucide-react'

// Rótulo + controle. É um <label>, então clicar no texto foca o campo (e leitores de tela leem junto).
export function Campo({ rotulo, dica, erro, children, className = '' }) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      {rotulo && <span className="label">{rotulo}</span>}
      {children}
      {erro ? (
        <span className="text-xs font-medium text-red-400">{erro}</span>
      ) : (
        dica && <span className="text-xs text-ink-muted">{dica}</span>
      )}
    </label>
  )
}

// Campo de texto; `prefixo`/`sufixo` aparecem dentro da caixa (ex.: R$, g, un.).
export const Input = forwardRef(function Input({ prefixo, sufixo, className = '', ...props }, ref) {
  if (!prefixo && !sufixo) return <input ref={ref} className={`field ${className}`} {...props} />
  return (
    <div className={`field-wrap ${className}`}>
      {prefixo && <span className="select-none pl-3.5 text-sm font-medium text-ink-muted">{prefixo}</span>}
      <input
        ref={ref}
        className={`w-full min-w-0 bg-transparent py-2.5 text-[15px] font-medium text-ink-primary outline-none placeholder:font-normal placeholder:text-ink-muted ${
          prefixo ? 'pl-1.5' : 'pl-3.5'
        } ${sufixo ? 'pr-1.5' : 'pr-3.5'}`}
        {...props}
      />
      {sufixo && <span className="select-none pr-3.5 text-sm font-medium text-ink-muted">{sufixo}</span>}
    </div>
  )
})

export const Select = forwardRef(function Select({ className = '', children, ...props }, ref) {
  return (
    <div className="relative">
      <select ref={ref} className={`field appearance-none pr-9 ${className}`} {...props}>
        {children}
      </select>
      <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted" />
    </div>
  )
})

export const Textarea = forwardRef(function Textarea({ className = '', ...props }, ref) {
  return <textarea ref={ref} className={`field resize-none ${className}`} {...props} />
})
