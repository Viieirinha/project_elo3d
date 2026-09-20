import { useState } from 'react'
import { Zap } from 'lucide-react'
import SectionCard from './ui/SectionCard.jsx'
import NumberField from './ui/NumberField.jsx'

const PRESETS = [
  { label: 'Ender 3', watts: '120' },
  { label: 'Bambu A1', watts: '200' },
  { label: 'Bambu X1C', watts: '350' },
  { label: 'Flashforge AD5X', watts: '350' },
  { label: 'Personalizar', watts: null },
]

export default function EnergiaSection({ data, onChange }) {
  const [activePreset, setActivePreset] = useState('Bambu A1')
  const emLote = parseInt(data.quantidadePecas, 10) > 1

  return (
    <SectionCard
      icon={<Zap size={19} className="text-white" />}
      title="Energia"
      subtitle="Consumo elétrico durante a impressão"
      accent="from-elo-yellow to-elo-magenta"
    >
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => {
          const isActive = activePreset === preset.label
          return (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                setActivePreset(preset.label)
                onChange({ ...data, consumoW: preset.watts ?? '' })
              }}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-150 ${
                isActive
                  ? 'border-transparent bg-elo-gradient text-white shadow-md'
                  : 'border-elo-border bg-surface-subtle text-ink-secondary hover:border-elo-border-strong hover:text-ink-primary'
              }`}
            >
              {preset.label}
              {preset.watts && <span className="ml-1 opacity-70">{preset.watts}W</span>}
            </button>
          )
        })}
      </div>

      <NumberField
        label="Consumo da impressora"
        suffix="W"
        value={data.consumoW}
        onChange={(v) => {
          setActivePreset('Personalizar')
          onChange({ ...data, consumoW: v })
        }}
        placeholder="200"
        tooltip="Potência média consumida pela impressora durante a impressão, em Watts (W)."
      />

      <div className="grid grid-cols-2 gap-4">
        <NumberField
          label={emLote ? 'Tempo total — horas' : 'Tempo de impressão — horas'}
          suffix="h"
          value={data.horas}
          onChange={(v) => onChange({ ...data, horas: v })}
          placeholder="2"
          tooltip={
            emLote
              ? 'Horas inteiras do tempo total mostrado na impressora para todas as peças juntas.'
              : 'Horas inteiras de duração da impressão.'
          }
        />
        <NumberField
          label="Minutos"
          suffix="min"
          value={data.minutos}
          onChange={(v) => onChange({ ...data, minutos: v })}
          placeholder="30"
          tooltip={
            emLote
              ? 'Minutos adicionais do tempo total mostrado na impressora.'
              : 'Minutos adicionais de duração da impressão.'
          }
        />
      </div>
      {emLote && (
        <p className="-mt-2 text-[11px] leading-relaxed text-ink-muted">
          Tempo total da impressão (todas as peças juntas) — será dividido automaticamente por{' '}
          {data.quantidadePecas}.
        </p>
      )}

      <div>
        <NumberField
          label="Valor do kWh"
          prefix="R$"
          value={data.valorKwh}
          onChange={(v) => onChange({ ...data, valorKwh: v })}
          placeholder="0,83"
          tooltip="Preço cobrado pela distribuidora por kWh consumido. Varia conforme a bandeira tarifária."
        />
        <p className="mt-1.5 text-[11px] leading-relaxed text-ink-muted">
          Pré-preenchido com a tarifa residencial Neoenergia Brasília (bandeira verde, vigente
          desde jan/2026). Editável — o valor pode variar conforme a bandeira tarifária e a
          distribuidora.
        </p>
      </div>
    </SectionCard>
  )
}
