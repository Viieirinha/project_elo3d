import { HelpCircle } from 'lucide-react'
import { useState } from 'react'

export default function NumberField({
  label,
  value,
  onChange,
  prefix,
  suffix,
  placeholder = '0',
  tooltip,
  small = false,
}) {
  const [focused, setFocused] = useState(false)

  return (
    <label className="flex flex-col gap-1.5 group">
      {label && (
        <span className="flex items-center gap-1.5 text-[13px] font-medium text-ink-secondary">
          {label}
          {tooltip && (
            <span className="relative inline-flex items-center">
              <HelpCircle
                size={13}
                className="text-ink-muted hover:text-ink-secondary transition-colors cursor-help peer"
              />
              <span className="pointer-events-none absolute left-1/2 bottom-full mb-2 w-52 -translate-x-1/2 rounded-lg border border-elo-border bg-elo-card px-3 py-2 text-[11px] leading-relaxed font-normal text-ink-secondary opacity-0 shadow-xl transition-opacity duration-150 peer-hover:opacity-100 z-20">
                {tooltip}
              </span>
            </span>
          )}
        </span>
      )}
      <div
        className={`relative flex items-center rounded-xl border bg-surface-subtle transition-all duration-200 ${
          focused
            ? 'border-transparent shadow-[0_0_0_1.5px_rgba(93,95,239,0.9)] ring-2 ring-[#5D5FEF]/25'
            : 'border-elo-border hover:border-elo-border-strong'
        }`}
      >
        {prefix && (
          <span className="pl-3 text-sm font-medium text-ink-muted select-none">{prefix}</span>
        )}
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          className={`w-full bg-transparent py-2.5 ${prefix ? 'pl-1.5' : 'pl-3'} ${
            suffix ? 'pr-1.5' : 'pr-3'
          } text-[15px] font-medium text-ink-primary placeholder-ink-muted outline-none ${
            small ? 'py-2 text-sm' : ''
          }`}
        />
        {suffix && (
          <span className="pr-3 text-sm font-medium text-ink-muted select-none">{suffix}</span>
        )}
      </div>
    </label>
  )
}
